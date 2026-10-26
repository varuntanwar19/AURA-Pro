"""Read-only Kubernetes inventory derived from Prometheus kube-state metrics."""
import os
from concurrent.futures import ThreadPoolExecutor

from .prometheus_mcp import cluster_usage_series, scalar


QUERIES = {
    "nodes": "count(kube_node_info)",
    "running": 'sum(kube_pod_status_phase{phase="Running"})',
    "pending": 'sum(kube_pod_status_phase{phase="Pending"})',
    "failed": 'sum(kube_pod_status_phase{phase="Failed"})',
    "cpu": '100 * sum(rate(container_cpu_usage_seconds_total{container!="",pod!=""}[5m])) / sum(kube_node_status_capacity{resource="cpu"})',
    "memory": '100 * sum(container_memory_working_set_bytes{container!="",pod!=""}) / sum(kube_node_status_capacity{resource="memory"})',
}


def cluster_snapshot() -> dict:
    with ThreadPoolExecutor(max_workers=len(QUERIES)) as pool:
        values = dict(zip(QUERIES, pool.map(scalar, QUERIES.values())))
    connected = values["nodes"] is not None
    pods = {name: int(values[name] or 0) for name in ("running", "pending", "failed")}
    pods["total"] = sum(pods.values())
    anomalies = []
    if pods["failed"]:
        anomalies.append({"id": "failed-pods", "severity": "high", "message": f"{pods['failed']} failed pod(s) reported by Prometheus", "namespace": "all", "time": "now"})
    try:
        metrics = cluster_usage_series(hours=1)
    except Exception:
        metrics = []
    return {
        "cluster": {"name": os.getenv("AURA_CLUSTER_NAME", "Kubernetes via Prometheus"), "version": "—", "status": "metrics-connected" if connected else "prometheus-no-kubernetes-metrics", "nodes": int(values["nodes"] or 0), "region": os.getenv("AZURE_LOCATION", "local")},
        "pods": pods, "anomalies": anomalies, "metrics": metrics,
        "source": "prometheus" if connected else "unavailable",
    }
