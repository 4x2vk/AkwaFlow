# AkwaFlow — AI Agent System

Система связанных AI-агентов для автоматизации разработки. Все агенты работают последовательно в одном чате.

## Команды (Workflows)

| Команда | Когда использовать | Workflow |
|---------|-------------------|----------|
| `/implement` | Простые задачи (компонент, функция) | Code → Test → Docs |
| `/orchestrate` | Сложные задачи (фичи, системы) | Plan → Loop[Code → Test → Review] → Docs |
| `/refactor` | Код работает, но плохо организован | Analyze → Refactor → Verify → Docs |
| `/review` | Перед коммитом или PR | Review → (Fix) → Verify |
| `/audit` | Полный health check проекта | Architecture → Security → Quality → Report |

**Как использовать:** Упомяни команду в чате (например: `/implement Создай компонент Card`) или добавь `@.cursor/commands/implement.md` для контекста.

## Агенты

Для точечных задач вызывай агентов напрямую через `@.cursor/agents/`:

| Агент | Файл | Назначение |
|-------|------|------------|
| Worker | `worker.md` | Создание кода |
| Planner | `planner.md` | Планирование и разбиение задач |
| Test Runner | `test-runner.md` | Запуск тестов, линта, сборки |
| Test Writer | `test-writer.md` | Написание тестов |
| Debugger | `debugger.md` | Исправление ошибок |
| Reviewer | `reviewer.md` | Code review |
| Documenter | `documenter.md` | Документация |
| Refactor | `refactor.md` | Улучшение структуры кода |
| Security Auditor | `security-auditor.md` | Аудит безопасности |
| Senior Reviewer | `senior-reviewer.md` | Архитектурный обзор |

## Связь агентов

```
/implement    → Worker → Test-Runner → Documenter
/orchestrate  → Planner → [Worker → Test-Runner → Debugger? → Reviewer]×N → Documenter
/refactor     → Senior-Reviewer → Refactor → Test-Runner → Documenter
/review       → Reviewer → Debugger? → Test-Runner
/audit        → Senior-Reviewer → Security-Auditor → Reviewer → Documenter
```

## Правила проекта

- **ARCHITECTURE.md** — Clean Architecture (4 слоя)
- **.cursor/rules/** — commit-messages, git-workflow, testing, documentation, security
- **.cursor/skills/** — переиспользуемые модули для агентов

## Конфигурация

`.cursor/config.json` — пути документации (docs/plans, docs/reports).
