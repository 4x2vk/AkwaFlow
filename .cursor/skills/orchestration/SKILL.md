---
name: orchestration
description: Полная оркестрация для /orchestrate. Plan → Loop[Code → Test → Review] → Docs. Use for complex features spanning multiple layers.
---

# Orchestration

Workflow для сложных задач с планированием.

## Фазы

### 1. Планирование
- **Planner** разбивает задачу на подзадачи (AUTH-001, AUTH-002, …)
- Сохраняет план в `docs/plans/` (если включено)
- Обновляет статусы в TODO (⏳ → 🔄 → ✅)

### 2. Выполнение (для каждой задачи)
- **Worker** реализует код
- **Test-Runner** проверяет
- При падении тестов → **Debugger** (макс 3 попытки)
- **Reviewer** проверяет качество
- При проблемах → **Debugger** исправляет

### 3. Финализация
- **Documenter** создаёт итоговый отчёт

## Связь с командами

Используется в `/orchestrate`.
