# Настройка агентов под AkwaFlow

Скопируй нужный промпт в чат Cursor — агент просканирует проект и обновит конфигурацию.

---

## Test-Runner

```
Просканируй проект AkwaFlow и обнови .cursor/agents/test-runner.md:
1. Найди команды: npm run lint, npm run build (из package.json)
2. Укажи реальные команды вместо дженерик-примеров
3. Учти что в проекте нет Vitest/Jest — только ESLint и Vite build
4. Добавь проверку firebase deploy (если применимо)
```

---

## Test-Writer

```
Просканируй проект AkwaFlow и обнови .cursor/agents/test-writer.md:
1. Определи: в проекте нет тестового фреймворка (нет Vitest/Jest в package.json)
2. Рекомендуй добавить Vitest для unit-тестов: npm install -D vitest @testing-library/react
3. Структура тестов: __tests__ рядом с модулем или src/**/*.test.jsx
4. Для use cases — тестировать через моки репозиториев
```

---

## Worker (Clean Architecture)

```
Обнови .cursor/agents/worker.md с учётом текущей структуры AkwaFlow:
1. Прочитай ARCHITECTURE.md
2. Добавь примеры путей: domain/entities/, domain/ports/, application/useCases/, infrastructure/firebase/
3. Укажи что Expense уже мигрирован — использовать как образец для Income, Category, Subscription
```
