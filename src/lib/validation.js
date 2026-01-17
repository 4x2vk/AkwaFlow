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
