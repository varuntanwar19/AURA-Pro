"""Read-only AKS MCP server (Model Context Protocol, stdio by default).

Set KUBECONFIG to an AKS kubeconfig to inspect a cluster. The server exposes
only inventory and metrics; it intentionally has no mutation tools.
"""
from __future__ import annotations

import os
from mcp.server.fastmcp import FastMCP

from .kubernetes_mcp import cluster_snapshot
from .terraform_mcp import managed_resources
from .server_runtime import serve

mcp = FastMCP("AURA AKS MCP", instructions="Read-only AKS and Kubernetes inventory. No tools modify cluster state.")


@mcp.tool()
def get_aks_overview() -> dict:
    """Get AKS identity, region, node/pod counts, and Prometheus utilization."""
    snapshot = cluster_snapshot()
    clusters = [item for item in managed_resources() if item.get("type") == "azurerm_kubernetes_cluster"]
    if clusters:
        snapshot["cluster"].update({"name": clusters[0]["name"], "region": clusters[0]["region"], "managedByTerraform": True})
    return snapshot


@mcp.tool()
def list_kubernetes_nodes() -> dict:
    """List node names, readiness, and capacity from the configured kubeconfig."""
    try:
        from kubernetes import client, config
        config.load_kube_config(config_file=os.getenv("KUBECONFIG") or None)
        nodes = client.CoreV1Api().list_node().items
        return {"source": "kubernetes-api", "nodes": [{
            "name": node.metadata.name,
            "ready": next((condition.status == "True" for condition in node.status.conditions or [] if condition.type == "Ready"), False),
            "cpu": node.status.capacity.get("cpu"),
            "memory": node.status.capacity.get("memory"),
            "labels": {key: value for key, value in (node.metadata.labels or {}).items() if key.startswith("kubernetes.azure.com/") or key.startswith("agentpool")},
        } for node in nodes]}
    except Exception as exc:
        return {"source": "kubernetes-api", "nodes": [], "status": "unavailable", "detail": str(exc)[:300], "hint": "Mount an AKS kubeconfig and set KUBECONFIG."}


@mcp.tool()
def list_failed_pods(namespace: str = "") -> dict:
    """List failed pods; an empty namespace searches all namespaces."""
    try:
        from kubernetes import client, config
        config.load_kube_config(config_file=os.getenv("KUBECONFIG") or None)
        api = client.CoreV1Api()
        pods = api.list_namespaced_pod(namespace).items if namespace else api.list_pod_for_all_namespaces().items
        failed = [{"namespace": pod.metadata.namespace, "name": pod.metadata.name, "reason": pod.status.reason or pod.status.message or "Failed"} for pod in pods if pod.status.phase == "Failed"]
        return {"source": "kubernetes-api", "failed_pods": failed, "count": len(failed)}
    except Exception as exc:
        return {"source": "kubernetes-api", "failed_pods": [], "status": "unavailable", "detail": str(exc)[:300]}


if __name__ == "__main__":
    serve(mcp, int(os.getenv("MCP_PORT", "8101")), "mcp-aks")
