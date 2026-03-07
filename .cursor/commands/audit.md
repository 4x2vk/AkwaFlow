# /audit — Полный health check проекта

**Когда использовать:** перед мажорным релизом, онбординг, периодический аудит.

## Workflow

1. **Senior-Reviewer** — архитектура (SOLID, Clean Architecture, зависимости)
2. **Security-Auditor** — безопасность (Firebase rules, auth, секреты)
3. **Reviewer** — качество кода (DRY, сложность, долг)
4. **Documenter** — consolidated report + health score (0–10)
5. (опционально) — автофикс критичных issues после подтверждения

## Как выполнять

1. Senior-Reviewer: проверка ARCHITECTURE.md, слоёв, зависимостей
2. Security-Auditor: firestore.rules, env, auth flows
3. Reviewer: качество кода по всему проекту
4. Documenter: сводный отчёт в docs/reports/

## Связь с агентами

- @senior-reviewer — архитектура
- @security-auditor — безопасность
- @reviewer — качество
- @documenter — отчёт
