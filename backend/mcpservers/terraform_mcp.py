"""Local Terraform plan runner with typed-confirmation-gated apply."""
from __future__ import annotations

import os
import hashlib
import json
from threading import Lock
import subprocess
from pathlib import Path
from mcp.server.fastmcp import FastMCP
from mcpservers.server_runtime import serve

_TERRAFORM_LOCK = Lock()
mcp = FastMCP("AURA Terraform MCP", instructions="Terraform source, plans, and state inspection. Apply is intentionally available only through the AURA human approval UI.")


def terraform_dir() -> Path:
    folder = Path(os.getenv("TERRAFORM_DIR", "../terraform")).resolve()
    if not folder.is_dir() or not list(folder.glob("*.tf")):
        raise RuntimeError(f"Terraform configuration directory is missing: {folder}")
    return folder


def list_source_files() -> list[dict[str, str]]:
    """Return only checked-in .tf source files; never expose state or tfvars secrets."""
    result = []
    for path in sorted(terraform_dir().glob("*.tf")):
        result.append({"name": path.name, "content": path.read_text(encoding="utf-8")[:50000]})
    return result


def _managed_resources_unlocked() -> list[dict[str, str]]:
    """Read safe resource metadata from local Terraform state; omit all secret fields."""
    directory = terraform_dir()
    result = subprocess.run(
        ["terraform", "show", "-json"], cwd=directory,
        capture_output=True, text=True, timeout=20, check=False,
    )
    if result.returncode != 0 or not result.stdout.strip():
        return []
    try:
        state = json.loads(result.stdout)
    except json.JSONDecodeError:
        return []
    resources = []

    def visit(module: dict) -> None:
        for resource in module.get("resources", []):
            values = resource.get("values") or {}
            resource_type = resource.get("type", "")
            resources.append({
                "id": resource.get("address", ""),
                "name": values.get("name") or resource.get("name", ""),
                "type": resource_type,
                "status": "managed",
                "region": values.get("location", "—"),
                "size": values.get("vm_size") or values.get("account_tier") or values.get("sku_tier") or "—",
                "cloud": "azure",
            })
        for child in module.get("child_modules", []):
            visit(child)

    root = state.get("values", {}).get("root_module", {})
    visit(root)
    return resources


def managed_resources() -> list[dict[str, str]]:
    with _TERRAFORM_LOCK:
        return _managed_resources_unlocked()


def _run_plan_unlocked(timeout: int = 240) -> dict[str, object]:
    """Initialize and create a saved plan; applying it is handled separately."""
    directory = terraform_dir()
    plan_path = directory / ".aura-plan"
    plan_path.unlink(missing_ok=True)
    init = subprocess.run(
        ["terraform", "init", "-input=false", "-no-color"], cwd=directory,
        capture_output=True, text=True, timeout=timeout, check=False,
    )
    if init.returncode != 0:
        return {"status": "init-failed", "exit_code": init.returncode, "output": (init.stdout + "\n" + init.stderr)[-12000:]}
    plan = subprocess.run(
        ["terraform", "plan", "-input=false", "-no-color", "-detailed-exitcode", "-out=.aura-plan"], cwd=directory,
        capture_output=True, text=True, timeout=timeout, check=False,
    )
    status = "no-changes" if plan.returncode == 0 else "changes-proposed" if plan.returncode == 2 else "plan-failed"
    plan_id = hashlib.sha256(plan_path.read_bytes()).hexdigest()[:16] if plan.returncode == 2 and plan_path.exists() else None
    if plan.returncode != 2:
        plan_path.unlink(missing_ok=True)
    return {
        "status": status, "exit_code": plan.returncode,
        "output": (plan.stdout + "\n" + plan.stderr)[-20000:],
        "apply_performed": False,
        "approval_required": plan.returncode == 2,
        "plan_id": plan_id,
    }


def run_plan(timeout: int = 240) -> dict[str, object]:
    with _TERRAFORM_LOCK:
        return _run_plan_unlocked(timeout)


def _run_apply_unlocked(plan_id: str, confirmation: str, timeout: int = 600) -> dict[str, object]:
    """Apply only the exact saved plan after explicit typed confirmation."""
    if confirmation != "APPLY AZURE PLAN":
        raise ValueError("Type APPLY AZURE PLAN to confirm this deployment.")
    if len(plan_id) != 16 or any(character not in "0123456789abcdef" for character in plan_id.lower()):
        raise ValueError("Invalid Terraform plan identifier.")
    directory = terraform_dir()
    plan_path = directory / ".aura-plan"
    if not plan_path.is_file():
        raise RuntimeError("No saved Terraform plan is available. Run a fresh plan first.")
    current_id = hashlib.sha256(plan_path.read_bytes()).hexdigest()[:16]
    if current_id != plan_id:
        raise ValueError("The saved plan changed. Generate and review a fresh plan.")
    result = subprocess.run(
        ["terraform", "apply", "-input=false", "-no-color", str(plan_path)], cwd=directory,
        capture_output=True, text=True, timeout=timeout, check=False,
    )
    if result.returncode == 0:
        plan_path.unlink(missing_ok=True)
    return {
        "status": "applied" if result.returncode == 0 else "apply-failed",
        "exit_code": result.returncode,
        "output": (result.stdout + "\n" + result.stderr)[-20000:],
        "apply_performed": result.returncode == 0,
    }


def run_apply(plan_id: str, confirmation: str, timeout: int = 600) -> dict[str, object]:
    with _TERRAFORM_LOCK:
        return _run_apply_unlocked(plan_id, confirmation, timeout)


@mcp.tool()
def list_terraform_source() -> list[dict[str, str]]:
    """Read Terraform .tf source files only; never returns tfvars, state, or plan files."""
    return list_source_files()


@mcp.tool()
def inspect_terraform_state() -> list[dict[str, str]]:
    """List safe resource metadata from the local Terraform state."""
    return managed_resources()


@mcp.tool()
def create_terraform_plan() -> dict[str, object]:
    """Run terraform init and plan. Does not apply changes; review the plan in AURA."""
    return run_plan()


if __name__ == "__main__":
    serve(mcp, int(os.getenv("MCP_PORT", "8103")), "mcp-terraform")
