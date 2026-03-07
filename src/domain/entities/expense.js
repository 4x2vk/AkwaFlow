/**
 * Domain entity: Expense (расход).
 * Чистая модель данных без зависимостей от Фреймворков и БД.
 */

/**
 * @typedef {Object} Expense
 * @property {string} [id] - Идентификатор (присваивается при сохранении)
 * @property {string} title - Название
 * @property {number} amount - Сумма
 * @property {string} [currency] - Валюта (RUB, USD, ...)
 * @property {string} [currencySymbol] - Символ валюты
 * @property {string} spentAt - Дата расхода (ISO string)
 * @property {string} [category] - Категория
 * @property {string} [color] - Цвет (hex)
 * @property {string} [note] - Заметка
 * @property {string} [icon] - Иконка (короткий текст)
 * @property {string|null} [iconUrl] - URL иконки
 * @property {number} [order] - Порядок для сортировки
 * @property {string} [createdAt] - Дата создания (ISO string)
 */

/**
 * Нормализует данные из хранилища (например, Firestore Timestamp) в доменную сущность.
 * @param {Object} raw - Сырые данные (id + data из документа)
 * @returns {Expense}
 */
export function toExpense(raw) {
    const data = raw?.data ?? raw ?? {};
    return {
        id: raw?.id ?? data.id,
        title: data.title ?? '',
        amount: data.amount ?? 0,
        currency: data.currency ?? 'RUB',
        currencySymbol: data.currencySymbol ?? '₽',
        spentAt: normalizeTimestamp(data.spentAt) ?? '',
        category: data.category ?? 'Общие',
        color: data.color ?? '#a78bfa',
        note: data.note ?? '',
        icon: data.icon ?? '',
        iconUrl: data.iconUrl ?? null,
        order: data.order ?? 0,
        createdAt: normalizeTimestamp(data.createdAt) ?? new Date().toISOString()
    };
}

function normalizeTimestamp(value) {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (value.toDate && typeof value.toDate === 'function') return value.toDate().toISOString();
    return undefined;
}
