"""Small LangGraph workflow for observe -> reason -> approval routing."""
from __future__ import annotations

from typing import Any, TypedDict
from langgraph.graph import END, START, StateGraph

from .reasoning_engine import analyze


class AgentState(TypedDict, total=False):
    agent: str
    evidence: dict[str, Any]
    language: str
    proposed_action: str | None
    reasoning: str
    confidence: int
    confidence_basis: str
    decision_mode: str
    status: str


def _reason(state: AgentState) -> dict[str, Any]:
    return analyze(state["agent"], state.get("evidence", {}), state.get("language", "en"))


def _route(state: AgentState) -> str:
    return "approval" if state.get("proposed_action") else "observe"


def _approval(state: AgentState) -> dict[str, str]:
    return {"decision_mode": "human-in-the-loop", "status": "review-required"}


def _observe(state: AgentState) -> dict[str, str]:
    return {"decision_mode": "observe-only", "status": "analysis-only"}


_graph = StateGraph(AgentState)
_graph.add_node("reason", _reason)
_graph.add_node("approval", _approval)
_graph.add_node("observe", _observe)
_graph.add_edge(START, "reason")
_graph.add_conditional_edges("reason", _route, {"approval": "approval", "observe": "observe"})
_graph.add_edge("approval", END)
_graph.add_edge("observe", END)
agent_graph = _graph.compile()


def run_agent_workflow(agent: str, evidence: dict[str, Any], language: str = "en", proposed_action: str | None = None) -> dict[str, Any]:
    return agent_graph.invoke({"agent": agent, "evidence": evidence, "language": language, "proposed_action": proposed_action})
