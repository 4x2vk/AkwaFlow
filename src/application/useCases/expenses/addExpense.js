/**
 * Use case: добавить расход.
 * Application слой — оркестрация и валидация; зависит только от domain (порт).
 */

import { validateAndSanitizeExpense } from '../../../lib/validation';

/**
 * Создаёт use case добавления расхода.
 * @param {import('../../../domain/ports/ExpenseRepository.js').ExpenseRepository} expenseRepository - Репозиторий (инжектируется из Infrastructure)
 * @returns {{ execute: (expense: Object) => Promise<{ success: boolean, errors?: string[] }> }}
 */
export function createAddExpenseUseCase(expenseRepository) {
    return {
        async execute(expense) {
            const validation = validateAndSanitizeExpense(expense);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }
            await expenseRepository.add(validation.data);
            return { success: true };
        }
    };
}
