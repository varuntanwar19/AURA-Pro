"""Small read-only Prometheus HTTP adapter used by the local API."""
import os

import requests
from datetime import datetime, timezone
from mcp.server.fastmcp import FastMCP
from .server_runtime import serve

mcp = FastMCP("AURA Prometheus MCP", instructions="Read-only PromQL instant and range queries. No alert or configuration mutations are exposed.")


def instant_query(expression: str) -> list[dict]:
    base = os.getenv("PROMETHEUS_URL", "http://prometheus:9090").rstrip("/")
    response = requests.get(f"{base}/api/v1/query", params={"query": expression}, timeout=2.5)
    response.raise_for_status()
    payload = response.json()
    if payload.get("status") != "success":
        return []
    return payload.get("data", {}).get("result", [])


def scalar(expression: str) -> float | None:
    results = instant_query(expression)
    if not results:
        return None
    try:
        return float(results[0]["value"][1])
    except (KeyError, IndexError, TypeError, ValueError):
        return None


def range_query(expression: str, hours: int = 1, step: str = "1m") -> list[dict]:
    """Return real Prometheus samples for charting; never fabricate telemetry."""
    base = os.getenv("PROMETHEUS_URL", "http://prometheus:9090").rstrip("/")
    end = datetime.now(timezone.utc).timestamp()
    start = end - max(1, min(hours, 24)) * 3600
    response = requests.get(
        f"{base}/api/v1/query_range",
        params={"query": expression, "start": start, "end": end, "step": step},
        timeout=8,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("status") != "success":
        return []
    return payload.get("data", {}).get("result", [])


def cluster_usage_series(hours: int = 1) -> list[dict]:
    """Combine CPU/memory Prometheus history into Recharts-ready time points."""
    expressions = {
        "cpu": '100 * sum(rate(container_cpu_usage_seconds_total{container!="",pod!=""}[5m])) / sum(kube_node_status_capacity{resource="cpu"})',
        "memory": '100 * sum(container_memory_working_set_bytes{container!="",pod!=""}) / sum(kube_node_status_capacity{resource="memory"})',
        "network": 'sum(rate(container_network_receive_bytes_total{pod!=""}[5m])) / 1024 / 1024',
        "network": 'sum(rate(container_network_receive_bytes_total{pod!=""}[5m])) / 1024 / 1024',
        "network": 'sum(rate(container_network_receive_bytes_total{pod!=""}[5m])) / 1024 / 1024',
        "network": 'sum(rate(container_network_receive_bytes_total{pod!=""}[5m])) / 1024 / 1024',
    }
    series = {name: range_query(query, hours) for name, query in expressions.items()}
    points: dict[int, dict] = {}
    for metric, results in series.items():
        for result in results:
            for timestamp, value in result.get("values", []):
                try:
                    stamp = int(float(timestamp))
                    points.setdefault(stamp, {"_timestamp": stamp})[metric] = round(float(value), 2)
                except (TypeError, ValueError):
                    continue
    return [
        {"t": datetime.fromtimestamp(stamp, timezone.utc).strftime("%H:%M"), **values}
        for stamp, values in sorted(points.items())
    ]


@mcp.tool()
def query_prometheus(expression: str) -> list[dict]:
    """Run one read-only PromQL instant query and return its samples."""
    return instant_query(expression[:2000])


@mcp.tool()
def query_prometheus_history(expression: str, hours: int = 1, step: str = "1m") -> list[dict]:
    """Run a read-only PromQL range query for up to one day of history."""
    return range_query(expression[:2000], hours, step)


if __name__ == "__main__":
    import os
    serve(mcp, int(os.getenv("MCP_PORT", "8105")), "mcp-prometheus")
