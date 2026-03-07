---
name: refactor-workflow
description: Workflow безопасного рефакторинга. Analyze → Refactor → Verify → Docs. Use when improving code structure without changing behavior.
---

# Refactor Workflow

Безопасный рефакторинг без смены поведения.

## Последовательность

1. **Senior-Reviewer** — находит code smells, цели рефакторинга
2. **Refactor** — применяет изменения (поведение не меняется)
3. **Test-Runner** — верифицирует (lint, build)
4. При падении → **Debugger**
5. **Documenter** — отчёт об изменениях

## Важно

Тесты должны существовать до рефакторинга. Если нет — сначала `/implement` для добавления тестов.

## Связь с командами

Используется в `/refactor`.
