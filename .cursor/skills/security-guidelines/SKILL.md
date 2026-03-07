---
name: security-guidelines
description: Проверки безопасности для Firebase и веб-приложений. Use when auditing auth, Firestore rules, or handling secrets.
---

# Security Guidelines

Безопасность в AkwaFlow (Firebase, React).

## Firebase

- Firestore rules: проверь `firestore.rules`
- Auth: только аутентифицированные пользователи
- Данные пользователя изолированы по `userId`

## Секреты

- Никогда не коммитить: `service-account*.json`, `.env`, API keys
- Переменные окружения — через `.env.example` как шаблон

## OWASP Top 10

- XSS: санитизация ввода, React по умолчанию экранирует
- Injection: параметризованные запросы, валидация
- Auth: проверка `user.uid` на сервере/в rules

## Связь

Используется **Security-Auditor** и правило `security`.
