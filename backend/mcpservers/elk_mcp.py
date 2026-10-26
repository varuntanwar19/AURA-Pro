"""Elasticsearch reader and real read-only MCP server for ELK search."""
from __future__ import annotations

import os
import requests
from mcp.server.fastmcp import FastMCP
from .server_runtime import serve

mcp = FastMCP("AURA ELK MCP", instructions="Read-only Elasticsearch search and health. No index mutations are exposed.")


def recent_logs(limit: int = 50, query: str = "") -> dict:
    base = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200").rstrip("/")
    index = os.getenv("ELASTICSEARCH_INDEX", "aura-*")
    body = {"size": max(1, min(limit, 200)), "sort": [{"@timestamp": {"order": "desc", "unmapped_type": "date"}}]}
    if query.strip():
        body["query"] = {"query_string": {"query": query[:256], "default_field": "*"}}
    response = requests.post(f"{base}/{index}/_search", json=body, timeout=5)
    response.raise_for_status()
    hits = response.json().get("hits", {}).get("hits", [])
    logs = [{"timestamp": hit.get("_source", {}).get("@timestamp", ""), "source": hit.get("_index", ""), **hit.get("_source", {})} for hit in hits]
    return {"logs": logs, "count": len(logs), "source": "elasticsearch"}


@mcp.tool()
def search_logs(query: str = "", limit: int = 50) -> dict:
    """Search recent Elasticsearch documents. Query uses Elasticsearch query_string syntax."""
    try:
        return recent_logs(limit, query)
    except requests.RequestException as exc:
        return {"logs": [], "count": 0, "source": "elasticsearch", "status": "unavailable", "detail": str(exc)[:300]}


@mcp.tool()
def elasticsearch_health() -> dict:
    """Return Elasticsearch cluster health."""
    base = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200").rstrip("/")
    try:
        response = requests.get(f"{base}/_cluster/health", timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        return {"status": "unavailable", "detail": str(exc)[:300]}


if __name__ == "__main__":
    serve(mcp, int(os.getenv("MCP_PORT", "8102")), "mcp-elk")
