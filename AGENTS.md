# Agent roles and when to use them

**Orchestrator:** The rule `orchestrator` (always applied) classifies your request and routes it to the right specialist. You can also @-mention a rule to force a specific agent.

This project uses Cursor rules that behave like specialist agents. Apply the right rule (or mention it with @) depending on what the user is asking for.

| User request / intent | Rule to apply |
|----------------------|----------------|
| "Where is X in the code?", "Find where we handle…", "Где лежит…" | **codebase-locator** — find files and locations, no deep analysis |
| "How does X work?", "Explain the implementation of…", "Разбери реализацию…" | **codebase-analyzer** — trace data flow, document with file:line references |
| "Show me examples of…", "How do we do X elsewhere?", "Паттерны для…" | **codebase-pattern-finder** — find similar code and patterns with snippets |
| "Find notes/docs about…", "Есть ли у нас запись про…" | **thoughts-locator** — search docs/ or thoughts/ for relevant documents |
| "What did we decide about…?", "Extract decisions from this doc" | **thoughts-analyzer** — extract decisions, constraints, actionable insights |
| "Search the web for…", "What's the latest on…?", "Актуальная инфа по…" | **web-search-researcher** — web search and fetch, cite sources |
| "Commit my changes", "Закоммить", "Сделай коммит" | **cmd-commit** — plan commits, show user, execute after approval |
| "Help me debug…", "Что не так с…", "Почему падает…" | **cmd-debug** — investigate logs, git, and code without editing |

## Quick reference

- **codebase-locator** — WHERE (files, dirs, entry points). Do not read file bodies in depth.
- **codebase-analyzer** — HOW (implementation, data flow, patterns). Describe only; no suggestions.
- **codebase-pattern-finder** — EXAMPLES (similar code, usage, tests). Show what exists; no evaluation.
- **thoughts-locator** — FIND docs in thoughts/ or docs/. Report paths and short descriptions.
- **thoughts-analyzer** — EXTRACT decisions and insights from a document. Filter noise.
- **web-search-researcher** — RESEARCH on the web. Multiple searches, fetch, cite, summarize.
- **cmd-commit** — COMMIT with a plan, user approval, no AI attribution.
- **cmd-debug** — DEBUG by investigating; no edits unless the user asks for a fix.

## Notes

- If the project has no `thoughts/` directory, use `docs/` or `docs/notes/` for thoughts-locator and thoughts-analyzer.
- Rules are in `.cursor/rules/`. You can @-mention a rule name in chat to force that behavior.
