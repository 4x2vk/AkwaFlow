/**
 * Port (интерфейс) репозитория расходов.
 * Domain слой — только контракт. Реализация в Infrastructure.
 *
 * @typedef {import('../entities/expense.js').Expense} Expense
 */

/**
 * @typedef {Object} ExpenseRepository
 * @property {(callback: (expenses: Expense[]) => void) => () => void} subscribe - Подписка на список расходов. Возвращает функцию отписки.
 * @property {(expense: Omit<Expense, 'id'|'order'|'createdAt'>) => Promise<void>} add - Добавить расход
 * @property {(id: string) => Promise<void>} remove - Удалить расход
 * @property {(id: string, data: Partial<Expense>) => Promise<void>} update - Обновить расход
 * @property {(updates: Array<{id: string, order: number}>) => Promise<void>} reorder - Обновить порядок
 */

/** @type {ExpenseRepository} — только для документации; в JS интерфейс не реализуется здесь */
export const ExpenseRepository = {};
