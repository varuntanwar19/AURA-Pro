"""Minimal local Ollama client; no hosted model or API key is used."""
from __future__ import annotations

import os
import requests


def generate(prompt: str, language: str = "en", timeout: int = 45) -> str | None:
    base = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
    response = requests.post(f"{base}/api/generate", json={
        "model": os.getenv("OLLAMA_MODEL", "llama3.2"),
        "prompt": f"Respond in {language}. Be concise and evidence-based.\n\n{prompt}",
        "stream": False,
    }, timeout=timeout)
    response.raise_for_status()
    return response.json().get("response", "").strip() or None
