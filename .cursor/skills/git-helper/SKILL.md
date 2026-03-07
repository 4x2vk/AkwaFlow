---
name: git-helper
description: Git операции и коммиты. Use when staging, committing, or following git workflow rules.
---

# Git Helper

Помощь с Git в рамках правил проекта.

## Conventional Commits

Используй формат: `type(scope): description`

- `feat` — новая функциональность
- `fix` — исправление бага
- `refactor` — рефакторинг
- `docs` — документация
- `style` — форматирование
- `test` — тесты
- `chore` — прочее

## Workflow

См. правило `git-workflow` в `.cursor/rules/`.

## Не коммитить

- `.cursor/workspace/`
- `node_modules/`
- `.env*`
- `service-account*.json`
