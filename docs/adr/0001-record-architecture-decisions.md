# 0001. Record architecture decisions

- Status: Accepted
- Date: 2026-11-04

## Context
This project is designed to be built largely by an AI agent (Claude Code) working
across many sessions. Without a durable record, decisions get revisited,
contradicted or silently drifted from between sessions.

## Decision
We keep ADRs in `docs/adr/`, using the template in `docs/adr/README.md`. Any decision
that affects structure, dependencies, public behaviour or quality standards needs
an ADR. The agent must check existing ADRs before proposing alternatives, and must
write a superseding ADR rather than deviate quietly.

## Consequences
- A little overhead per decision, in exchange for continuity across sessions.
- `CLAUDE.md` points at ADRs, so every session loads the context.
