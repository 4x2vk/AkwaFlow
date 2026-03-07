---
name: simple-workflow
description: Базовый workflow для /implement. Code → Test → Docs. Use when implementing simple components, functions, or use cases.
---

# Simple Workflow

Базовый workflow для простых задач.

## Последовательность

1. **Worker** — создаёт код (компонент, use case, репозиторий)
2. **Test-Runner** — запускает lint, build, тесты (если есть)
3. **Documenter** — краткая документация изменений

## Когда использовать

- Один компонент, одна функция, один use case
- Задача укладывается в 1–3 файла
- Не требуется планирование

## Связь с командами

Используется в `/implement`.
