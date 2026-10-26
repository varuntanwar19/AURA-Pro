"""AURA local control plane and Azure-first service catalog.

The API never applies Terraform automatically. Infrastructure changes require an
explicit human approval and are executed by Terraform outside the chat agent.
"""
from __future__ import annotations

import os
import subprocess
import shutil
import socket
from copy import deepcopy
from uuid import uuid4
from datetime import datetime, timezone
from typing import Any

import requests
from fastapi import FastAPI, HTTPException, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from mcpservers.terraform_mcp import list_source_files, managed_resources, run_apply, run_plan
from mcpservers.elk_mcp import recent_logs
from mcpservers.kubernetes_mcp import cluster_snapshot
from mcpservers.prometheus_mcp import cluster_usage_series
from agents.langgraph_orchestrator import run_agent_workflow
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest

app = FastAPI(title="AURA - Local Multi-Cloud Control Plane", version="1.1.0")
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
HTTP_REQUESTS = Counter("aura_http_requests_total", "HTTP requests handled by AURA", ["method", "path", "status"])

@app.middleware("http")
async def record_prometheus_request(request, call_next):
    response = await call_next(request)
    route = request.scope.get("route")
    path = getattr(route, "path", request.url.path)
    HTTP_REQUESTS.labels(request.method, path, str(response.status_code)).inc()
    return response

@app.get("/metrics", include_in_schema=False)
def prometheus_metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.websocket("/ws/{client_id}")
async def websocket_status(websocket: WebSocket, client_id: str) -> None:
    """Keep a real control-channel connection for the dashboard status indicator."""
    await websocket.accept()
    try:
        await websocket.send_json({"type": "connected", "client_id": client_id, "timestamp": datetime.now(timezone.utc).isoformat()})
        while True:
            # Frontend currently sends no commands on this channel. Receiving keeps the
            # connection alive and gives future agent events a single authenticated path.
            await websocket.receive_text()
    except WebSocketDisconnect:
        return

PROVIDERS = {"azure", "aws", "gcp"}
NOW = lambda: datetime.now(timezone.utc).isoformat()

AZURE = {
    "iaas": {
        "vms": [], "networks": [], "storage": [],
        "predictions": [], "usageData": [],
    },
    "paas": {
        "cluster": {"name": "Local Kubernetes", "version": "—", "status": "check-connection", "nodes": 0, "region": "local"},
        "pods": {"running": 0, "pending": 0, "failed": 0, "total": 0}, "anomalies": [], "metrics": [],
    },
    "saas": {
        "integrations": [
            {"name": "Microsoft Teams", "category": "collaboration", "status": "not-configured", "mode": "SaaS integration"},
            {"name": "SharePoint", "category": "content", "status": "not-configured", "mode": "SaaS integration"},
            {"name": "Microsoft 365", "category": "productivity", "status": "not-configured", "mode": "SaaS integration"},
            {"name": "Intune", "category": "device management", "status": "not-configured", "mode": "SaaS integration"},
            {"name": "GitHub", "category": "source control", "status": "not-configured", "mode": "MCP connector"},
            {"name": "Prometheus + Grafana", "category": "observability", "status": "local", "mode": "local service"},
            {"name": "Elasticsearch + Kibana", "category": "logs", "status": "local", "mode": "local service"},
            {"name": "Kubernetes", "category": "orchestration", "status": "check-connection", "mode": "MCP connector"},
            {"name": "Terraform", "category": "infrastructure as code", "status": "local", "mode": "MCP connector"},
        ],
        "teams": {"channels": [], "activityMetrics": {}, "activity": [], "anomalies": []},
        "sharepoint": {"sites": [], "documents": [], "docActivity": {}, "health": "not-configured"},
        "insights": [],
    },
}

TERRAFORM = {
    "overProvisioning": [], "driftDetection": [], "totalSavings": 0,
    "stateSnippet": "Terraform state is read only in this dashboard. Run terraform plan to inspect proposed changes.",
    "mode": "plan-required",
}

class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    language: str = "en"
    cloud: str = "azure"

class IngestRequest(BaseModel):
    text: str = Field(min_length=20, max_length=20000)
    source: str = Field(default="manual", max_length=160)

class ApplyRequest(BaseModel):
    plan_id: str = Field(min_length=16, max_length=16)
    confirmation: str = Field(min_length=1, max_length=40)

class AgentRunRequest(BaseModel):
    cloud: str = "azure"
    action: str = "inspect"
    language: str = "en"

def validate_cloud(cloud: str) -> str:
    normalized = cloud.lower()
    if normalized not in PROVIDERS:
        raise HTTPException(status_code=400, detail="cloud must be azure, aws, or gcp")
    return normalized

def health_of(url: str | None) -> str:
    if not url:
        return "not-configured"
    try:
        response = requests.get(url, timeout=1.5)
        return "healthy" if response.ok else "degraded"
    except requests.RequestException:
        return "unavailable"

def _usage_series() -> list[dict[str, Any]]:
    try:
        return cluster_usage_series(hours=6)
    except (requests.RequestException, ValueError):
        return []

def _oversizing_predictions(resources: list[dict[str, Any]], samples: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Offer a conservative review hint only when sustained real metrics exist."""
    clusters = [item for item in resources if item.get("type") == "azurerm_kubernetes_cluster"]
    points = [sample for sample in samples if "cpu" in sample and "memory" in sample]
    if not clusters or len(points) < 10:
        return []
    avg_cpu = sum(point["cpu"] for point in points) / len(points)
    avg_memory = sum(point["memory"] for point in points) / len(points)
    if avg_cpu >= 20 or avg_memory >= 30:
        return []
    return [{
        "resource": clusters[0].get("name", "AKS cluster"),
        "issue": "Low observed cluster utilization",
        "reasoning": f"Prometheus observed {len(points)} CPU and memory samples over up to six hours; mean CPU {avg_cpu:.1f}% and memory {avg_memory:.1f}%.",
        "confidence": 70,
        "recommendation": "Review a smaller AKS node SKU or node count in Terraform. Proposal only; Azure pricing and savings are not estimated.",
    }]

def get_rag_collection():
    import chromadb
    client = chromadb.HttpClient(
        host=os.getenv("CHROMADB_HOST", "chromadb"),
        port=int(os.getenv("CHROMADB_PORT", "8000")),
    )
    return client.get_or_create_collection(name="aura_knowledge", metadata={"hnsw:space": "cosine"})

@app.get("/health")
@app.get("/api/v1/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok", "mode": "local-control-plane", "default_cloud": "azure",
        "services": {
            "ollama": health_of(os.getenv("OLLAMA_BASE_URL", "http://ollama:11434") + "/api/tags"),
            "prometheus": health_of(os.getenv("PROMETHEUS_URL", "http://prometheus:9090") + "/-/healthy"),
            "elasticsearch": health_of(os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200") + "/_cluster/health"),
        },
        "timestamp": NOW(),
    }

@app.get("/api/dashboard")
def dashboard() -> dict[str, Any]:
    status = health()
    services = status["services"]
    try:
        resources = managed_resources()
        azure_status = "healthy" if resources else "not-configured"
    except (OSError, RuntimeError, subprocess.SubprocessError):
        resources = []
        azure_status = "unavailable"
    try:
        cluster = cluster_snapshot()
        recent_alerts = [
            {"id": item["id"], "severity": item["severity"], "message": item["message"], "cloud": "azure", "time": item["time"]}
            for item in cluster["anomalies"]
        ]
    except requests.RequestException:
        recent_alerts = []
    return {
        "totalResources": len(resources), "activeAlerts": len(recent_alerts), "aiPredictionCount": 0, "workflowsRunning": 0,
        "cloudHealth": {"azure": azure_status, "aws": "not-configured", "gcp": "not-configured"},
        "recentAlerts": recent_alerts, "aiPredictions": [], "recentWorkflows": [],
        "localServices": services, "mode": "local; no cloud inventory until connected",
    }

@app.get("/api/iaas")
def iaas(cloud: str = "azure") -> dict[str, Any]:
    cloud = validate_cloud(cloud)
    if cloud != "azure":
        return {"vms": [], "networks": [], "storage": [], "predictions": [], "usageData": [], "mode": "not-configured"}
    try:
        resources = managed_resources()
    except (OSError, RuntimeError, subprocess.SubprocessError):
        resources = []
    usage_data = _usage_series()
    return {
        **AZURE["iaas"],
        "vms": [resource for resource in resources if "virtual_machine" in resource["type"]],
        "networks": [resource for resource in resources if "virtual_network" in resource["type"]],
        "storage": [resource for resource in resources if "storage_account" in resource["type"]],
        "usageData": usage_data,
        "predictions": _oversizing_predictions(resources, usage_data),
        "mode": "terraform-state+prometheus" if resources and usage_data else "terraform-state" if resources else "no-applied-state",
    }

@app.get("/api/paas")
def paas(cloud: str = "azure") -> dict[str, Any]:
    cloud = validate_cloud(cloud)
    if cloud != "azure":
        return {**AZURE["paas"], "cluster": {**AZURE["paas"]["cluster"], "status": "not-configured"}}
    snapshot = cluster_snapshot()
    try:
        aks = [resource for resource in managed_resources() if resource["type"] == "azurerm_kubernetes_cluster"]
    except (OSError, RuntimeError, subprocess.SubprocessError):
        aks = []
    if aks:
        snapshot["cluster"].update({"name": aks[0]["name"], "region": aks[0]["region"], "managedByTerraform": True})
    return snapshot

@app.get("/api/saas")
def saas(cloud: str = "azure") -> dict[str, Any]:
    validate_cloud(cloud)
    result = deepcopy(AZURE["saas"])
    for integration in result["integrations"]:
        if integration["name"] == "Prometheus + Grafana":
            integration["status"] = health_of(os.getenv("PROMETHEUS_URL", "http://prometheus:9090").rstrip("/") + "/-/healthy")
        elif integration["name"] == "Elasticsearch + Kibana":
            integration["status"] = health_of(os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200").rstrip("/") + "/_cluster/health")
        elif integration["name"] == "Terraform":
            integration["status"] = "available" if shutil.which("terraform") else "unavailable"
        elif integration["name"] == "GitHub":
            integration["status"] = "endpoint-configured" if os.getenv("GITHUB_MCP_URL") else "not-configured"
        elif integration["name"] == "Kubernetes":
            integration["status"] = "endpoint-configured" if os.getenv("KUBERNETES_MCP_URL") else "not-configured"
    return result

@app.get("/api/mcp/servers")
def mcp_servers() -> dict[str, Any]:
    """Report the local MCP process endpoints and whether their TCP listeners are up."""
    servers = [
        ("AKS / Kubernetes", "mcp-aks", 8101, ["get_aks_overview", "list_kubernetes_nodes", "list_failed_pods"]),
        ("ELK / Elasticsearch", "mcp-elk", 8102, ["search_logs", "elasticsearch_health"]),
        ("Terraform", "mcp-terraform", 8103, ["list_terraform_source", "inspect_terraform_state", "create_terraform_plan"]),
        ("Microsoft Graph", "mcp-saas", 8104, ["list_teams", "list_sharepoint_sites", "list_intune_devices"]),
        ("Prometheus", "mcp-prometheus", 8105, ["query_prometheus", "query_prometheus_history"]),
        ("GitHub", "mcp-github", 8106, ["get_repository", "list_open_issues", "list_workflow_runs"]),
    ]
    entries = []
    for name, host, port, tool_names in servers:
        try:
            with socket.create_connection((host, port), timeout=0.35):
                status = "running"
        except OSError:
            status = "stopped"
        entries.append({"name": name, "transport": "MCP Streamable HTTP", "url": f"http://localhost:{port}/mcp", "status": status, "tools": tool_names, "readOnly": True})
    return {"servers": entries, "protocol": "Model Context Protocol / Streamable HTTP"}

@app.get("/api/terraform")
def terraform(cloud: str = "azure") -> dict[str, Any]:
    validate_cloud(cloud)
    try:
        files = list_source_files()
    except (OSError, RuntimeError):
        files = []
    try:
        resources = managed_resources()
    except (OSError, RuntimeError, subprocess.SubprocessError):
        resources = []
    usage = _usage_series()
    predictions = _oversizing_predictions(resources, usage)
    return {**TERRAFORM, "sourceFiles": files, "overProvisioning": predictions,
            "driftDetection": [], "totalSavings": None,
            "analysisMode": "prometheus-backed" if usage else "telemetry-required",
            "pricingStatus": "not-configured"}

@app.post("/api/terraform/plan")
def terraform_plan() -> dict[str, Any]:
    try:
        return run_plan()
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Terraform CLI is not installed in the backend container.")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Terraform plan timed out.")

@app.post("/api/terraform/apply")
def terraform_apply(req: ApplyRequest) -> dict[str, Any]:
    try:
        return run_apply(req.plan_id, req.confirmation)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Terraform CLI is not installed in the backend container.")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Terraform apply timed out.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

@app.post("/api/agents/{agent}/run")
def run_agent(agent: str, req: AgentRunRequest) -> dict[str, Any]:
    cloud = validate_cloud(req.cloud)
    if agent not in {"terraform", "iaas", "paas", "saas"}:
        raise HTTPException(status_code=404, detail="unknown agent")
    evidence: dict[str, Any] = {}
    proposed_action = None
    if cloud == "azure" and agent == "paas":
        evidence = cluster_snapshot()
        if evidence.get("source") == "prometheus" and evidence.get("pods", {}).get("failed", 0) > 0:
            proposed_action = "Review failed Kubernetes pods and decide whether to remediate them manually."
    elif cloud == "azure" and agent == "iaas":
        try:
            evidence = {"resources": managed_resources()}
        except (OSError, RuntimeError, subprocess.SubprocessError):
            evidence = {}
    result = run_agent_workflow(agent, evidence, req.language, proposed_action)
    has_evidence = bool(evidence.get("source") == "prometheus" or evidence.get("resources"))
    if not has_evidence:
        result["reasoning"] = "No connected telemetry or applied Terraform state is available. No change was made."
    return {
        "id": f"{agent}-{int(datetime.now(timezone.utc).timestamp())}", "agent": agent,
        "cloud": cloud, "status": result["status"],
        "autonomous": False, "reasoning": result["reasoning"],
        "evidence": evidence, "confidence": result["confidence"] if has_evidence else 0,
        "confidence_basis": result["confidence_basis"],
        "proposed_action": proposed_action, "decision_mode": result["decision_mode"],
        "human_approval_required": bool(proposed_action), "timestamp": NOW(),
    }

@app.get("/api/elk/logs")
def elk_logs(limit: int = 50) -> dict[str, Any]:
    try:
        return recent_logs(limit)
    except requests.RequestException:
        return {"logs": [], "source": "elasticsearch", "status": "unavailable"}

@app.post("/api/rag/query")
@app.post("/api/v1/rag/query")
def rag_query(req: QueryRequest) -> dict[str, Any]:
    # Search the local vector store first. No indexed material means no evidence-based answer.
    try:
        collection = get_rag_collection()
        if collection.count() == 0:
            return {
                "answer": "The local RAG database is empty. Add documents or telemetry before asking for evidence-based infrastructure analysis.",
                "sources": [], "confidence": 0, "mode": "empty-index",
                "reasoning": "No matching documents were available; no infrastructure action was taken.",
                "decisionMode": "suggestion-only",
            }
        match_count = min(4, collection.count())
        result = collection.query(query_texts=[req.query], n_results=match_count)
        documents = (result.get("documents") or [[]])[0]
        metadatas = (result.get("metadatas") or [[]])[0]
        distances = (result.get("distances") or [[]])[0]
        sources = [
            {"title": meta.get("source", "Local document"), "collection": "aura_knowledge", "score": max(0.0, min(1.0, 1.0 - float(distances[index]) / 2.0))}
            for index, meta in enumerate(metadatas)
        ]
    except Exception as exc:
        return {
            "answer": "The local RAG database is unavailable. Start ChromaDB and try again.",
            "sources": [], "confidence": 0, "mode": "vector-store-unavailable",
            "reasoning": str(exc)[:300], "decisionMode": "suggestion-only",
        }

    base = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
    context = "\n".join(f"[{index + 1}] {document}" for index, document in enumerate(documents))
    prompt = (f"Answer in language {req.language}. Use only the supplied retrieved context. "
              "If it does not answer the question, say what evidence is missing. Never claim changes were made.\n"
              f"Retrieved context:\n{context}\n\nQuestion: {req.query}")
    try:
        response = requests.post(f"{base}/api/generate", json={
            "model": os.getenv("OLLAMA_MODEL", "llama3.2"), "prompt": prompt, "stream": False,
        }, timeout=90)
        response.raise_for_status()
        answer = response.json().get("response", "").strip()
        if answer:
            confidence = round(max((source["score"] for source in sources), default=0) * 100)
            return {"answer": answer, "sources": sources, "confidence": confidence, "mode": "local-rag+ollama", "reasoning": "Answer generated locally from the listed retrieved documents. Confidence is the best retrieval similarity, not a guarantee of correctness.", "decisionMode": "suggestion-only"}
    except requests.RequestException:
        pass
    return {"answer": "Retrieved documents are available, but the local Ollama model is unavailable. No infrastructure change was made.", "sources": sources, "confidence": round(max((source["score"] for source in sources), default=0) * 100), "mode": "local-rag-model-offline", "reasoning": "Retrieved sources are listed; local model did not respond.", "decisionMode": "suggestion-only"}

@app.post("/api/rag/ingest")
def rag_ingest(req: IngestRequest) -> dict[str, Any]:
    try:
        collection = get_rag_collection()
        document_id = str(uuid4())
        collection.add(ids=[document_id], documents=[req.text], metadatas=[{"source": req.source, "created_at": NOW()}])
        return {"id": document_id, "source": req.source, "count": collection.count(), "status": "indexed-locally"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not index document in ChromaDB: {str(exc)[:300]}")

@app.get("/api/terraform/predict")
def terraform_predictions() -> dict[str, Any]:
    try:
        resources = managed_resources()
    except (OSError, RuntimeError, subprocess.SubprocessError):
        resources = []
    predictions = _oversizing_predictions(resources, _usage_series())
    return {"predictions": predictions, "status": "analysis-ready" if predictions else "insufficient-telemetry", "estimate": "Azure pricing unavailable; no savings figure is shown."}

@app.get("/api/reports")
def reports(cloud: str = "azure") -> dict[str, Any]:
    validate_cloud(cloud)
    return {"reports": [], "resourceUsage": [], "costDistribution": [], "alertTrends": [], "performance": [], "mode": "waiting-for-connected-telemetry"}

@app.get("/api/database/status")
def database_status() -> dict[str, Any]:
    try:
        collection = get_rag_collection()
        indexed_documents = collection.count()
        rag_status = "healthy"
    except Exception:
        indexed_documents = 0
        rag_status = "unavailable"
    return {
        "vector_store": {"name": "ChromaDB · aura_knowledge", "url": f"http://{os.getenv('CHROMADB_HOST', 'chromadb')}:{os.getenv('CHROMADB_PORT', '8000')}", "status": rag_status, "documents": indexed_documents},
        "state_store": {"name": "Docker volumes", "status": "local"},
    }
