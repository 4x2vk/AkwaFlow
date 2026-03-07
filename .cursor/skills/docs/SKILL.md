---
name: docs
description: Генерация документации. Use when creating plans, reports, ADR, or feature documentation.
---

# Docs Skill

Генерация документации для AkwaFlow.

## Пути (из config.json)

- `docs/` — корень
- `docs/plans/` — планы задач
- `docs/reports/` — отчёты
- `docs/issues/` — issues (если включено)

## Формат отчётов

```markdown
# [Название]

## Summary
Краткое описание.

## Changes
- Изменение 1
- Изменение 2

## Notes
Дополнительные замечания.
```

## Связь с архитектурой

Документация не должна дублировать ARCHITECTURE.md — ссылайся на него.
