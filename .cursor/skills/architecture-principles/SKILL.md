---
name: architecture-principles
description: Архитектурные паттерны Clean Architecture для AkwaFlow. Use when implementing or reviewing domain, application, infrastructure, presentation layers.
---

# Architecture Principles

Clean Architecture (4 слоя) — см. ARCHITECTURE.md.

## Зависимости

| Откуда        | Куда можно |
|---------------|------------|
| Presentation  | Application, Domain (entities), lib |
| Application   | Domain (entities + ports) |
| Domain        | Ничего |
| Infrastructure| Domain, Firebase SDK |

## Запрещено

- Firebase/репозитории в `context/` или `pages/` — только use cases
- React/UI в `domain` и `application`

## Порты и адаптеры

- `domain/ports/` — интерфейсы репозиториев
- `infrastructure/firebase/` — реализации (FirestoreExpenseRepository и т.д.)
