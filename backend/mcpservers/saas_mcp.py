"""Read-only Microsoft Graph MCP tools for Teams, SharePoint and Intune."""
from __future__ import annotations

import os
import requests
from mcp.server.fastmcp import FastMCP
from .server_runtime import serve

mcp = FastMCP("AURA Microsoft SaaS MCP", instructions="Read-only metadata tools for Microsoft Graph. Requires tenant admin consent for the documented application permissions.")
GRAPH = "https://graph.microsoft.com/v1.0"


def _token() -> str:
    tenant = os.getenv("M365_TENANT_ID") or os.getenv("AZURE_TENANT_ID")
    client = os.getenv("M365_CLIENT_ID") or os.getenv("AZURE_CLIENT_ID")
    secret = os.getenv("M365_CLIENT_SECRET") or os.getenv("AZURE_CLIENT_SECRET")
    if not all((tenant, client, secret)):
        raise RuntimeError("Set M365_TENANT_ID, M365_CLIENT_ID, and M365_CLIENT_SECRET in the local .env file.")
    response = requests.post(f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token", data={
        "client_id": client, "client_secret": secret,
        "scope": "https://graph.microsoft.com/.default", "grant_type": "client_credentials",
    }, timeout=15)
    response.raise_for_status()
    return response.json()["access_token"]


def _get(path: str, select: str, top: int) -> dict:
    response = requests.get(f"{GRAPH}/{path}", headers={"Authorization": f"Bearer {_token()}"}, params={"$select": select, "$top": max(1, min(top, 100))}, timeout=20)
    response.raise_for_status()
    body = response.json()
    return {"items": body.get("value", []), "count": len(body.get("value", [])), "next_page": bool(body.get("@odata.nextLink")), "source": "Microsoft Graph"}


@mcp.tool()
def list_teams(top: int = 50) -> dict:
    """List Teams metadata (Team.ReadBasic.All application permission)."""
    try:
        return _get("groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')", "id,displayName,description,createdDateTime", top)
    except (requests.RequestException, RuntimeError) as exc:
        return {"items": [], "status": "unavailable", "detail": str(exc)[:300], "permission_hint": "Team.ReadBasic.All with admin consent"}


@mcp.tool()
def list_sharepoint_sites(top: int = 50) -> dict:
    """Search SharePoint sites and return site metadata only (Sites.Read.All)."""
    try:
        return _get("sites?search=*", "id,name,displayName,webUrl,createdDateTime", top)
    except (requests.RequestException, RuntimeError) as exc:
        return {"items": [], "status": "unavailable", "detail": str(exc)[:300], "permission_hint": "Sites.Read.All with admin consent"}


@mcp.tool()
def list_intune_devices(top: int = 50) -> dict:
    """List Intune managed-device metadata, excluding user and hardware identifiers (DeviceManagementManagedDevices.Read.All)."""
    try:
        return _get("deviceManagement/managedDevices", "id,deviceName,operatingSystem,osVersion,complianceState,managementState,lastSyncDateTime", top)
    except (requests.RequestException, RuntimeError) as exc:
        return {"items": [], "status": "unavailable", "detail": str(exc)[:300], "permission_hint": "DeviceManagementManagedDevices.Read.All with admin consent"}


if __name__ == "__main__":
    serve(mcp, int(os.getenv("MCP_PORT", "8104")), "mcp-saas")
