# /orchestrate — Сложная задача (фича, система)

**Когда использовать:** полная фича, миграция слоя, новая подсистема.

## Workflow

### Фаза 1: Планирование
- **Planner** — разбивает на подзадачи (TASK-001, TASK-002, …)
- Сохраняет план в `docs/plans/` (если включено в config)

### Фаза 2: Выполнение (для каждой задачи)
- **Worker** — реализует код
- **Test-Runner** — lint, build
- При ошибках → **Debugger** (макс 3 попытки)
- **Reviewer** — проверка качества
- При проблемах → **Debugger**

### Фаза 3: Финализация
- **Documenter** — итоговый отчёт в `docs/reports/`

## Как выполнять

1. Вызови Planner: разбей задачу на подзадачи
2. Для каждой подзадачи: Worker → Test-Runner → (при ошибках) Debugger → Reviewer
3. В конце: Documenter создаёт отчёт

## Связь с агентами

- @planner — планирование
- @worker — реализация
- @test-runner — проверка
- @debugger — исправление ошибок
- @reviewer — code review
- @documenter — отчёт

## Пример

```
/orchestrate Добавь use cases для Income по образцу Expense (domain, application, infrastructure)
```
