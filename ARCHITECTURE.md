# Clean Architecture (4 слоя) — AkwaFlow

Архитектура проекта строится по **Clean Architecture** с четырьмя слоями. Зависимости направлены только внутрь: внешние слои зависят от внутренних, никогда наоборот.

## Четыре слоя

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION (UI)                                           │
│  components/, pages/, context/, hooks/                       │
│  → использует только Application (use cases)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  APPLICATION (Use Cases)                                     │
│  application/useCases/                                       │
│  → оркестрация, валидация; использует только Domain (ports)  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  DOMAIN (ядро)                                               │
│  domain/entities/, domain/ports/                             │
│  → сущности, контракты репозиториев; без зависимостей        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  INFRASTRUCTURE (реализации)                                  │
│  infrastructure/firebase/                                    │
│  → реализует ports, работа с Firestore, API                  │
└─────────────────────────────────────────────────────────────┘
```

### 1. Domain (домен)

- **Назначение:** бизнес-сущности и контракты (порты). Нет зависимостей от фреймворков и БД.
- **Содержимое:**
  - `domain/entities/` — модели данных (Expense, Income, Category, Subscription).
  - `domain/ports/` — интерфейсы репозиториев (например, `ExpenseRepository`).
- **Правило:** слой не импортирует ничего из `application`, `infrastructure`, `presentation`.

### 2. Application (приложение / use cases)

- **Назначение:** сценарии использования (добавить расход, получить список и т.д.). Валидация и оркестрация.
- **Содержимое:**
  - `application/useCases/` — один модуль на сценарий или группу (например, `expenses/`).
- **Правило:** использует только `domain` (entities, ports). Не импортирует Firebase или React.

### 3. Infrastructure (инфраструктура)

- **Назначение:** реализация портов (работа с Firestore, внешние API).
- **Содержимое:**
  - `infrastructure/firebase/` — инициализация Firebase, репозитории (например, `FirestoreExpenseRepository`).
- **Правило:** реализует интерфейсы из `domain/ports`, зависит от `domain`.

### 4. Presentation (представление)

- **Назначение:** UI: страницы, компоненты, контексты, роутинг.
- **Содержимое:**
  - текущие `src/components/`, `src/pages/`, `src/context/`, `src/hooks/`, `src/App.jsx`, `src/main.jsx`.
- **Правило:** вызывает только use cases из `application`. Не импортирует напрямую `firebase` или репозитории — только через use cases.

---

## Целевая структура каталогов

```
src/
├── domain/
│   ├── entities/           # Expense, Income, Category, Subscription
│   │   ├── expense.js
│   │   ├── income.js
│   │   └── ...
│   └── ports/              # Интерфейсы репозиториев
│       ├── ExpenseRepository.js
│       ├── IncomeRepository.js
│       └── ...
│
├── application/
│   └── useCases/
│       ├── expenses/       # addExpense, getExpenses, updateExpense, ...
│       ├── incomes/
│       ├── subscriptions/
│       └── categories/
│
├── infrastructure/
│   └── firebase/
│       ├── firebase.js     # инициализация (перенос из services/firebase.js)
│       ├── FirestoreExpenseRepository.js
│       ├── FirestoreIncomeRepository.js
│       └── ...
│
├── components/             # Presentation
│   ├── layout/
│   ├── features/
│   └── ui/
├── pages/
├── context/
├── hooks/
├── lib/                    # утилиты UI/общие (utils, buildInfo, appUpdate, devMode)
├── App.jsx
└── main.jsx
```

---

## Правила зависимостей

| Откуда        | Куда можно импортировать |
|---------------|---------------------------|
| Presentation  | Application, Domain (entities для типов/отображения), lib |
| Application   | Domain (entities + ports) |
| Domain        | Ничего (только чистый JS) |
| Infrastructure| Domain, Firebase SDK      |

**Запрещено:**

- Импорт Firebase или репозиториев в `context/` или `pages/` — только use cases.
- Импорт React/UI в `domain` и `application`.

---

## Подключение в UI (пример: расходы)

1. **Создание репозитория:** в провайдере (или корневом компоненте) по `user.uid` создаётся репозиторий:  
   `new FirestoreExpenseRepository(db, user.uid)`.
2. **Создание use cases:** use cases создаются с этим репозиторием (например, `createAddExpenseUseCase(repo)`).
3. **Context:** провайдер хранит репозиторий и use cases в state/useMemo и отдаёт в контекст методы, которые вызывают use case (например, `addExpense` → `addExpenseUseCase.execute(data)`).

Так UI остаётся независимым от Firestore; замена хранилища делается только в `infrastructure`.

---

## Пошаговая миграция

1. Ввести слой **domain**: сущности и порты (как в `domain/entities/expense.js` и `domain/ports/ExpenseRepository.js`).
2. Перенести логику из контекстов в **application/useCases** (один сценарий за раз).
3. Реализовать репозитории в **infrastructure/firebase** и заменить прямые вызовы Firestore в контекстах на вызовы use cases с этими репозиториями.
4. Оставить в **presentation** только вызовы use cases и отображение; валидацию вызывать внутри use cases или в domain.

После миграции файлы в `services/` (кроме иконок и т.п.) переезжают в `infrastructure/firebase/`, а валидация из `lib/validation.js` может использоваться в use cases или быть перенесена в domain/application.

---

## Реализованный пример среза (Expense)

Уже добавлено как образец:

- **Domain:** `src/domain/entities/expense.js` (сущность, `toExpense`), `src/domain/ports/ExpenseRepository.js` (контракт).
- **Application:** `src/application/useCases/expenses/addExpense.js` — use case «добавить расход» (валидация + вызов репозитория).
- **Infrastructure:** `src/infrastructure/firebase/FirestoreExpenseRepository.js` — реализация репозитория для Firestore.

Подключение в UI: в `ExpenseProvider` можно создать репозиторий `createFirestoreExpenseRepository(db, user.uid)`, use case `createAddExpenseUseCase(repo)` и вызывать `addExpenseUseCase.execute(data)` вместо прямого вызова Firestore и валидации. Остальные методы (remove, update, reorder) и подписку на список можно постепенно перевести на репозиторий и при необходимости вынести в отдельные use cases.
