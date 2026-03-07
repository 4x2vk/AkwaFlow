---
name: review-workflow
description: Workflow проверки кода перед коммитом. Review → (Fix) → Verify. Use when checking staged changes or specific files.
---

# Review Workflow

Проверка кода перед коммитом или PR.

## Последовательность

1. **Reviewer** — проверяет `git diff --staged` или указанные файлы
2. При критичных issues → **Debugger** (с подтверждения)
3. **Test-Runner** — верификация после фиксов

## По умолчанию

Проверяет staged изменения. Для нестрогих находок — спрашивает, фиксировать ли.

## Связь с командами

Используется в `/review`.
