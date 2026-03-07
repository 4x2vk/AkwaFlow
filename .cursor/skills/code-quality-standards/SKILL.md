---
name: code-quality-standards
description: Стандарты качества кода. Use when reviewing DRY, complexity, naming, or code style.
---

# Code Quality Standards

Стандарты качества для AkwaFlow.

## DRY

Не дублируй логику. Выноси в use cases, утилиты, хуки.

## Сложность

- Функции — одна ответственность
- Компоненты — разумный размер, при необходимости разбивай

## Именование

- Компоненты: PascalCase
- Функции/переменные: camelCase
- Константы: UPPER_SNAKE_CASE
- Файлы: соответствуют экспорту (Button.jsx → Button)

## Линтинг

Проект использует ESLint. Запуск: `npm run lint`.
