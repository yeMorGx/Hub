---
name: memory
description: >-
  Project memory for the ZULU workspace. At each task, read AGENTS.md and use
  the relevant project docs to preserve durable, non-sensitive decisions.
---

# Memory

## Memory File
For this project, use `AGENTS.md` and the relevant durable documents in `docs/` as the source of truth. Do not assume that the author's Windows global memory path exists in this environment.

## On Conversation Start
Read `AGENTS.md` and follow its pointers to the project documents relevant to the current task. Do not create a second memory file when the project already records the decision.

## During Conversation
When any of these happen, update the single relevant project document when the information is durable and useful to future work:
- User states a preference or habit
- A project is created or its structure changes significantly
- User gives feedback about your behavior
- A decision is made that affects future work
- Skills are installed or modified
- Important file paths or configs are established

## Rules
- Keep one source of truth; update the existing relevant section instead of appending duplicate entries.
- Record decisions and corrections clearly, and omit temporary or trivial details.
- Store only non-sensitive project information. Never write credentials, tokens, private user data, or secrets to project documents.
- Use `handoff` for temporary task state when work moves to another session; do not turn it into long-term project memory.
