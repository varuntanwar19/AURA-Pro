"""Safe local Streamable HTTP runner shared by the MCP server modules."""
from __future__ import annotations

import os
from mcp.server.fastmcp import FastMCP


def serve(mcp: FastMCP, port: int, service_name: str) -> None:
    """Allow this server's Docker DNS name and loopback host without wildcard hosts."""
    host = os.getenv("MCP_HOST", "0.0.0.0")
    mcp.settings.host = host
    mcp.settings.port = port
    hosts = mcp.settings.transport_security.allowed_hosts
    origins = mcp.settings.transport_security.allowed_origins
    for value in (f"{service_name}:{port}", f"localhost:{port}", f"127.0.0.1:{port}", f"host.docker.internal:{port}"):
        if value not in hosts:
            hosts.append(value)
    for value in (f"http://{service_name}:{port}", f"http://localhost:{port}", f"http://127.0.0.1:{port}", f"http://host.docker.internal:{port}"):
        if value not in origins:
            origins.append(value)
    mcp.run(transport="streamable-http")
