"""Evidence-constrained agent reasoning and confidence labeling."""
from __future__ import annotations

from typing import Any
import requests
from .ollama_client import generate


def analyze(agent: str, evidence: dict[str, Any], language: str = "en") -> dict[str, Any]:
    has_metrics = bool(evidence.get("source") == "prometheus")
    has_state = bool(evidence.get("resources"))
    prompt = (
        f"Agent: {agent}. Evidence JSON: {evidence}. Explain what is known, what is missing, "
        "and one safe next step. Never claim an action was executed; never invent costs or metrics."
    )
    try:
        explanation = generate(prompt, language)
    except requests.RequestException:
        explanation = None
    return {
        "reasoning": explanation or ("Local Ollama is unavailable. " if not (has_metrics or has_state) else "Evidence is available, but local Ollama is unavailable."),
        "confidence": 70 if has_metrics and has_state else 55 if has_metrics or has_state else 0,
        "confidence_basis": "evidence-source heuristic; not a calibrated probability",
        "evidence_available": bool(has_metrics or has_state),
    }
