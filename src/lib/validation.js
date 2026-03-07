/**
 * Validation utilities for user input
 */

const VALID_CURRENCIES = ['RUB', 'USD', 'WON', 'KZT'];
const DANGEROUS_CONTENT_PATTERN = /<script|javascript:|onerror=|onload=/i;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const MAX_MONEY_VALUE = 1000000000;

function parseNumericValue(value) {
    return typeof value === 'string' ? parseFloat(value) : Number(value);
}

function buildValidationResult(errors) {
    return {
        valid: errors.length === 0,
        errors
    };
}

function buildSanitizationError(errors) {
    return {
        valid: false,
        errors,
        data: null
    };
}

function buildSanitizationSuccess(data) {
    return {
        valid: true,
        errors: [],
        data
    };
}

function validateTextField(errors, value, messages, { min = 2, max = 100 } = {}) {
    if (!value || typeof value !== 'string') {
        errors.push(messages.required);
        return;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
        errors.push(messages.empty);
    } else if (trimmedValue.length > max) {
        errors.push(messages.tooLong);
    } else if (trimmedValue.length < min) {
        errors.push(messages.tooShort);
    }

    if (DANGEROUS_CONTENT_PATTERN.test(trimmedValue)) {
        errors.push(messages.invalid);
    }
}

function validateMoneyField(errors, value, messages) {
    if (value === undefined || value === null || value === '') {
        errors.push(messages.required);
        return;
    }

    const numericValue = parseNumericValue(value);

    if (Number.isNaN(numericValue)) {
        errors.push(messages.notNumber);
    } else if (numericValue < 0) {
        errors.push(messages.negative);
    } else if (numericValue > MAX_MONEY_VALUE) {
        errors.push(messages.tooLarge);
    } else if (!Number.isFinite(numericValue)) {
        errors.push(messages.notFinite);
    }
}

function validateCurrency(errors, currency) {
    if (currency && !VALID_CURRENCIES.includes(currency)) {
        errors.push('Недопустимая валюта');
    }
}

function validateOptionalDate(errors, value, messages, { pastYears, futureYears }) {
    if (!value) {
        return;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        errors.push(messages.invalid);
        return;
    }

    const now = new Date();
    const maxPast = new Date(now.getFullYear() - pastYears, 0, 1);
    const maxFuture = new Date(now.getFullYear() + futureYears, 11, 31);

    if (date < maxPast) {
        errors.push(messages.tooPast);
    } else if (date > maxFuture) {
        errors.push(messages.tooFuture);
    }
}

function validateRequiredDate(errors, value, requiredMessage, dateMessages, range) {
    if (!value) {
        errors.push(requiredMessage);
        return;
    }

    validateOptionalDate(errors, value, dateMessages, range);
}

function validateOptionalCategory(errors, value) {
    if (value && typeof value === 'string' && value.length > 50) {
        errors.push('Название категории слишком длинное (максимум 50 символов)');
    }
}

function validateHexColor(errors, color) {
    if (color && typeof color === 'string' && !HEX_COLOR_PATTERN.test(color)) {
        errors.push('Некорректный формат цвета (должен быть hex, например #a78bfa)');
    }
}

function validateNote(errors, note) {
    if (!note || typeof note !== 'string') {
        return;
    }

    if (note.length > 300) {
        errors.push('Заметка слишком длинная (максимум 300 символов)');
    }

    if (DANGEROUS_CONTENT_PATTERN.test(note)) {
        errors.push('Заметка содержит недопустимые символы');
    }
}

function validateIconFields(errors, data) {
    if (data.icon && typeof data.icon === 'string') {
        if (data.icon.length > 5) {
            errors.push('Иконка слишком длинная');
        }

        if (DANGEROUS_CONTENT_PATTERN.test(data.icon)) {
            errors.push('Иконка содержит недопустимые символы');
        }
    }

    if (data.iconUrl && typeof data.iconUrl === 'string') {
        if (data.iconUrl.length > 500) {
            errors.push('Ссылка на иконку слишком длинная');
        }

        if (DANGEROUS_CONTENT_PATTERN.test(data.iconUrl)) {
            errors.push('Ссылка на иконку содержит недопустимые символы');
        }
    }
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
 * Validates subscription data
 * @param {Object} data - Subscription data to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateSubscription(data) {
    const errors = [];

    validateTextField(errors, data.name, {
        required: 'Имя подписки обязательно',
        empty: 'Имя подписки не может быть пустым',
        tooLong: 'Имя подписки слишком длинное (максимум 100 символов)',
        tooShort: 'Имя подписки слишком короткое (минимум 2 символа)',
        invalid: 'Имя содержит недопустимые символы'
    });
    validateMoneyField(errors, data.cost, {
        required: 'Стоимость обязательна',
        notNumber: 'Стоимость должна быть числом',
        negative: 'Стоимость не может быть отрицательной',
        tooLarge: 'Стоимость слишком большая (максимум 1,000,000,000)',
        notFinite: 'Стоимость должна быть конечным числом'
    });
    validateCurrency(errors, data.currency);
    validateOptionalDate(errors, data.nextPaymentDate, {
        invalid: 'Некорректная дата платежа',
        tooPast: 'Дата платежа слишком далеко в прошлом',
        tooFuture: 'Дата платежа слишком далеко в будущем'
    }, { pastYears: 1, futureYears: 10 });
    validateOptionalCategory(errors, data.category);
    validateHexColor(errors, data.color);

    return buildValidationResult(errors);
}

/**
 * Validates category data
 * @param {Object} data - Category data to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateCategory(data) {
    const errors = [];

    validateTextField(errors, data.name, {
        required: 'Название категории обязательно',
        empty: 'Название категории не может быть пустым',
        tooLong: 'Название категории слишком длинное (максимум 50 символов)',
        tooShort: 'Название категории слишком короткое (минимум 2 символа)',
        invalid: 'Название содержит недопустимые символы'
    }, { max: 50 });
    validateHexColor(errors, data.color);

    return buildValidationResult(errors);
}

/**
 * Validates and sanitizes subscription data
 * @param {Object} data - Raw subscription data
 * @returns {{valid: boolean, errors: string[], data: Object}} Sanitized data
 */
export function validateAndSanitizeSubscription(data) {
    const validation = validateSubscription(data);

    if (!validation.valid) {
        return buildSanitizationError(validation.errors);
    }

    return buildSanitizationSuccess({
        ...data,
        name: sanitizeString(data.name),
        category: data.category ? sanitizeString(data.category) : 'Общие',
        cost: parseNumericValue(data.cost),
        currency: data.currency || 'RUB',
        currencySymbol: data.currencySymbol || '₽',
        nextPaymentDate: data.nextPaymentDate || null,
        billingPeriod: data.billingPeriod || 'monthly',
        cycle: data.cycle ? sanitizeString(data.cycle) : (data.billingPeriod === 'yearly' ? 'Ежегодно' : 'Ежемесячно'),
        color: data.color || '#a78bfa',
        icon: data.icon || (data.name ? data.name[0].toUpperCase() : '?'),
        iconUrl: data.iconUrl || null
    });
}

function validateTransaction(data, config) {
    const errors = [];

    validateTextField(errors, data.title, config.titleMessages);
    validateMoneyField(errors, data.amount, {
        required: 'Сумма обязательна',
        notNumber: 'Сумма должна быть числом',
        negative: 'Сумма не может быть отрицательной',
        tooLarge: 'Сумма слишком большая (максимум 1,000,000,000)',
        notFinite: 'Сумма должна быть конечным числом'
    });
    validateCurrency(errors, data.currency);
    validateRequiredDate(errors, data[config.dateField], 'Дата обязательна', {
        invalid: 'Некорректная дата',
        tooPast: 'Дата слишком далеко в прошлом',
        tooFuture: 'Дата слишком далеко в будущем'
    }, { pastYears: 10, futureYears: 1 });
    validateOptionalCategory(errors, data.category);
    validateNote(errors, data.note);
    validateHexColor(errors, data.color);
    validateIconFields(errors, data);

    return buildValidationResult(errors);
}

/**
 * Validates expense data (one-time spend)
 * @param {Object} data - Expense data to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateExpense(data) {
    return validateTransaction(data, {
        dateField: 'spentAt',
        titleMessages: {
            required: 'Название расхода обязательно',
            empty: 'Название расхода не может быть пустым',
            tooLong: 'Название расхода слишком длинное (максимум 100 символов)',
            tooShort: 'Название расхода слишком короткое (минимум 2 символа)',
            invalid: 'Название содержит недопустимые символы'
        }
    });
}

/**
 * Validates and sanitizes expense data
 * @param {Object} data - Raw expense data
 * @returns {{valid: boolean, errors: string[], data: Object}} Sanitized data
 */
export function validateAndSanitizeExpense(data) {
    const validation = validateExpense(data);

    if (!validation.valid) {
        return buildSanitizationError(validation.errors);
    }

    const sanitizedTitle = sanitizeString(data.title);

    return buildSanitizationSuccess({
        ...data,
        title: sanitizedTitle,
        amount: parseNumericValue(data.amount),
        currency: data.currency || 'RUB',
        currencySymbol: data.currencySymbol || '₽',
        spentAt: data.spentAt,
        category: data.category ? sanitizeString(data.category) : 'Общие',
        color: data.color || '#a78bfa',
        note: data.note ? sanitizeString(data.note) : '',
        icon: data.icon || (data.title ? sanitizedTitle[0]?.toUpperCase() : '?'),
        iconUrl: data.iconUrl || null
    });
}

/**
 * Validates income data (one-time receive)
 * @param {Object} data - Income data to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateIncome(data) {
    return validateTransaction(data, {
        dateField: 'receivedAt',
        titleMessages: {
            required: 'Название дохода обязательно',
            empty: 'Название дохода не может быть пустым',
            tooLong: 'Название дохода слишком длинное (максимум 100 символов)',
            tooShort: 'Название дохода слишком короткое (минимум 2 символа)',
            invalid: 'Название содержит недопустимые символы'
        }
    });
}

/**
 * Validates and sanitizes income data
 * @param {Object} data - Raw income data
 * @returns {{valid: boolean, errors: string[], data: Object}} Sanitized data
 */
export function validateAndSanitizeIncome(data) {
    const validation = validateIncome(data);

    if (!validation.valid) {
        return buildSanitizationError(validation.errors);
    }

    const sanitizedTitle = sanitizeString(data.title);

    return buildSanitizationSuccess({
        ...data,
        title: sanitizedTitle,
        amount: parseNumericValue(data.amount),
        currency: data.currency || 'RUB',
        currencySymbol: data.currencySymbol || '₽',
        receivedAt: data.receivedAt,
        category: data.category ? sanitizeString(data.category) : 'Общие',
        color: data.color || '#a78bfa',
        note: data.note ? sanitizeString(data.note) : '',
        icon: data.icon || (data.title ? sanitizedTitle[0]?.toUpperCase() : '?'),
        iconUrl: data.iconUrl || null
    });
}
