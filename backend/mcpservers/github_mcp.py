"""Read-only GitHub MCP tools for repository metadata, issues, and workflow runs."""
from __future__ import annotations

import os
import requests
from mcp.server.fastmcp import FastMCP
from .server_runtime import serve

mcp = FastMCP("AURA GitHub MCP", instructions="Read-only GitHub repository tools. No issue, workflow, or source mutations are exposed.")
API = "https://api.github.com"


def _request(path: str, params: dict | None = None) -> dict | list:
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if not token or token == "your_github_token_here":
        raise RuntimeError("Set GITHUB_TOKEN in the local .env file.")
    response = requests.get(f"{API}/{path.lstrip('/')}", headers={
        "Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }, params=params or {}, timeout=15)
    response.raise_for_status()
    return response.json()


def _repo() -> str:
    repo = os.getenv("GITHUB_REPO", "").strip().strip("/")
    if repo.count("/") != 1:
        raise RuntimeError("Set GITHUB_REPO as owner/repository in .env.")
    return repo


@mcp.tool()
def get_repository() -> dict:
    """Get metadata for GITHUB_REPO (format owner/repository)."""
    try:
        return _request(f"repos/{_repo()}")
    except (requests.RequestException, RuntimeError) as exc:
        return {"status": "unavailable", "detail": str(exc)[:300]}


@mcp.tool()
def list_open_issues(limit: int = 30) -> dict:
    """List open GitHub issues, excluding pull requests."""
    try:
        items = _request(f"repos/{_repo()}/issues", {"state": "open", "per_page": max(1, min(limit, 100))})
        return {"issues": [{"number": item["number"], "title": item["title"], "state": item["state"], "url": item["html_url"], "created_at": item["created_at"]} for item in items if "pull_request" not in item], "source": "github-api"}
    except (requests.RequestException, RuntimeError, KeyError) as exc:
        return {"issues": [], "status": "unavailable", "detail": str(exc)[:300]}


@mcp.tool()
def list_workflow_runs(limit: int = 20) -> dict:
    """List recent GitHub Actions workflow run summaries."""
    try:
        result = _request(f"repos/{_repo()}/actions/runs", {"per_page": max(1, min(limit, 100))})
        return {"runs": [{"name": run.get("name"), "status": run.get("status"), "conclusion": run.get("conclusion"), "url": run.get("html_url"), "updated_at": run.get("updated_at")} for run in result.get("workflow_runs", [])], "source": "github-api"}
    except (requests.RequestException, RuntimeError, KeyError) as exc:
        return {"runs": [], "status": "unavailable", "detail": str(exc)[:300]}


if __name__ == "__main__":
    serve(mcp, int(os.getenv("MCP_PORT", "8106")), "mcp-github")
