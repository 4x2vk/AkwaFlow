/**
 * Validation utilities for user input
 */

/**
 * Validates subscription data
 * @param {Object} data - Subscription data to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateSubscription(data) {
    const errors = [];
    
    // Validate name
    if (!data.name || typeof data.name !== 'string') {
        errors.push('Имя подписки обязательно');
    } else {
        const name = data.name.trim();
        if (name.length === 0) {
            errors.push('Имя подписки не может быть пустым');
        } else if (name.length > 100) {
            errors.push('Имя подписки слишком длинное (максимум 100 символов)');
        } else if (name.length < 2) {
            errors.push('Имя подписки слишком короткое (минимум 2 символа)');
        }
        // Check for potentially dangerous characters (basic XSS prevention)
        if (/<script|javascript:|onerror=|onload=/i.test(name)) {
            errors.push('Имя содержит недопустимые символы');
        }
    }
    
    // Validate cost
    if (data.cost === undefined || data.cost === null || data.cost === '') {
        errors.push('Стоимость обязательна');
    } else {
        const cost = typeof data.cost === 'string' ? parseFloat(data.cost) : Number(data.cost);
        if (isNaN(cost)) {
            errors.push('Стоимость должна быть числом');
        } else if (cost < 0) {
            errors.push('Стоимость не может быть отрицательной');
        } else if (cost > 1000000000) {
            errors.push('Стоимость слишком большая (максимум 1,000,000,000)');
        } else if (!isFinite(cost)) {
            errors.push('Стоимость должна быть конечным числом');
        }
    }
    
    // Validate currency
    const validCurrencies = ['RUB', 'USD', 'WON', 'KZT'];
    if (data.currency && !validCurrencies.includes(data.currency)) {
        errors.push('Недопустимая валюта');
    }
    
    // Validate date
    if (data.nextPaymentDate) {
        const date = new Date(data.nextPaymentDate);
        if (isNaN(date.getTime())) {
            errors.push('Некорректная дата платежа');
        } else {
            // Check if date is too far in the past or future
            const now = new Date();
            const maxPast = new Date(now.getFullYear() - 1, 0, 1);
            const maxFuture = new Date(now.getFullYear() + 10, 11, 31);
            
            if (date < maxPast) {
                errors.push('Дата платежа слишком далеко в прошлом');
            } else if (date > maxFuture) {
                errors.push('Дата платежа слишком далеко в будущем');
            }
        }
    }
    
    // Validate category
    if (data.category && typeof data.category === 'string') {
        if (data.category.length > 50) {
            errors.push('Название категории слишком длинное (максимум 50 символов)');
        }
    }
    
    // Validate color (hex color)
    if (data.color && typeof data.color === 'string') {
        if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
            errors.push('Некорректный формат цвета (должен быть hex, например #a78bfa)');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validates category data
 * @param {Object} data - Category data to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateCategory(data) {
    const errors = [];
    
    // Validate name
    if (!data.name || typeof data.name !== 'string') {
        errors.push('Название категории обязательно');
    } else {
        const name = data.name.trim();
        if (name.length === 0) {
            errors.push('Название категории не может быть пустым');
        } else if (name.length > 50) {
            errors.push('Название категории слишком длинное (максимум 50 символов)');
        } else if (name.length < 2) {
            errors.push('Название категории слишком короткое (минимум 2 символа)');
        }
        // Check for potentially dangerous characters
        if (/<script|javascript:|onerror=|onload=/i.test(name)) {
            errors.push('Название содержит недопустимые символы');
        }
    }
    
    // Validate color
    if (data.color && typeof data.color === 'string') {
        if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
            errors.push('Некорректный формат цвета (должен быть hex, например #a78bfa)');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Sanitizes string input (basic XSS prevention)
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
}

/**
 * Validates and sanitizes subscription data
 * @param {Object} data - Raw subscription data
 * @returns {{valid: boolean, errors: string[], data: Object}} Sanitized data
 */
export function validateAndSanitizeSubscription(data) {
    const validation = validateSubscription(data);
    
    if (!validation.valid) {
        return {
            valid: false,
            errors: validation.errors,
            data: null
        };
    }
    
    // Sanitize string fields
    const sanitized = {
        ...data,
        name: sanitizeString(data.name),
        category: data.category ? sanitizeString(data.category) : 'Общие',
        cost: typeof data.cost === 'string' ? parseFloat(data.cost) : Number(data.cost),
        currency: data.currency || 'RUB',
        currencySymbol: data.currencySymbol || '₽',
        nextPaymentDate: data.nextPaymentDate || null,
        billingPeriod: data.billingPeriod || 'monthly',
        color: data.color || '#a78bfa',
        icon: data.icon || (data.name ? data.name[0].toUpperCase() : '?'),
        iconUrl: data.iconUrl || null
    };
    
    return {
        valid: true,
        errors: [],
        data: sanitized
    };
}

/**
 * Validates expense data (one-time spend)
 * @param {Object} data - Expense data to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateExpense(data) {
    const errors = [];
    
    // Validate title / name
    if (!data.title || typeof data.title !== 'string') {
        errors.push('Название расхода обязательно');
    } else {
        const title = data.title.trim();
        if (title.length === 0) {
            errors.push('Название расхода не может быть пустым');
        } else if (title.length > 100) {
            errors.push('Название расхода слишком длинное (максимум 100 символов)');
        } else if (title.length < 2) {
            errors.push('Название расхода слишком короткое (минимум 2 символа)');
        }
        if (/<script|javascript:|onerror=|onload=/i.test(title)) {
            errors.push('Название содержит недопустимые символы');
        }
    }
    
    // Validate amount
    if (data.amount === undefined || data.amount === null || data.amount === '') {
        errors.push('Сумма обязательна');
    } else {
        const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : Number(data.amount);
        if (isNaN(amount)) {
            errors.push('Сумма должна быть числом');
        } else if (amount < 0) {
            errors.push('Сумма не может быть отрицательной');
        } else if (amount > 1000000000) {
            errors.push('Сумма слишком большая (максимум 1,000,000,000)');
        } else if (!isFinite(amount)) {
            errors.push('Сумма должна быть конечным числом');
        }
    }
    
    // Validate currency
    const validCurrencies = ['RUB', 'USD', 'WON', 'KZT'];
    if (data.currency && !validCurrencies.includes(data.currency)) {
        errors.push('Недопустимая валюта');
    }
    
    // Validate date (spentAt)
    if (!data.spentAt) {
        errors.push('Дата обязательна');
    } else {
        const date = new Date(data.spentAt);
        if (isNaN(date.getTime())) {
            errors.push('Некорректная дата');
        } else {
            const now = new Date();
            const maxPast = new Date(now.getFullYear() - 10, 0, 1);
            const maxFuture = new Date(now.getFullYear() + 1, 11, 31);
            
            if (date < maxPast) {
                errors.push('Дата слишком далеко в прошлом');
            } else if (date > maxFuture) {
                errors.push('Дата слишком далеко в будущем');
            }
        }
    }
    
    // Validate category
    if (data.category && typeof data.category === 'string') {
        if (data.category.length > 50) {
            errors.push('Название категории слишком длинное (максимум 50 символов)');
        }
    }
    
    // Validate note
    if (data.note && typeof data.note === 'string') {
        if (data.note.length > 300) {
            errors.push('Заметка слишком длинная (максимум 300 символов)');
        }
        if (/<script|javascript:|onerror=|onload=/i.test(data.note)) {
            errors.push('Заметка содержит недопустимые символы');
        }
    }
    
    // Validate color (hex color)
    if (data.color && typeof data.color === 'string') {
        if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
            errors.push('Некорректный формат цвета (должен быть hex, например #a78bfa)');
        }
    }

    // Validate icon (short text) + iconUrl
    if (data.icon && typeof data.icon === 'string') {
        if (data.icon.length > 5) {
            errors.push('Иконка слишком длинная');
        }
        if (/<script|javascript:|onerror=|onload=/i.test(data.icon)) {
            errors.push('Иконка содержит недопустимые символы');
        }
    }
    if (data.iconUrl && typeof data.iconUrl === 'string') {
        if (data.iconUrl.length > 500) {
            errors.push('Ссылка на иконку слишком длинная');
        }
        if (/<script|javascript:|onerror=|onload=/i.test(data.iconUrl)) {
            errors.push('Ссылка на иконку содержит недопустимые символы');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validates and sanitizes expense data
 * @param {Object} data - Raw expense data
 * @returns {{valid: boolean, errors: string[], data: Object}} Sanitized data
 */
export function validateAndSanitizeExpense(data) {
    const validation = validateExpense(data);
    
    if (!validation.valid) {
        return {
            valid: false,
            errors: validation.errors,
            data: null
        };
    }
    
    const sanitized = {
        ...data,
        title: sanitizeString(data.title),
        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : Number(data.amount),
        currency: data.currency || 'RUB',
        currencySymbol: data.currencySymbol || '₽',
        spentAt: data.spentAt,
        category: data.category ? sanitizeString(data.category) : 'Общие',
        color: data.color || '#a78bfa',
        note: data.note ? sanitizeString(data.note) : '',
        icon: data.icon || (data.title ? sanitizeString(data.title)[0]?.toUpperCase() : '?'),
        iconUrl: data.iconUrl || null
    };
    
    return {
        valid: true,
        errors: [],
        data: sanitized
    };
}
