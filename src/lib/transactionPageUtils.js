const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns "YYYY-MM" for the given date value. Uses local month.
 * Date-only strings (YYYY-MM-DD) are parsed as local date to avoid timezone
 * shifting the month (e.g. "2026-03-01" must stay March in all timezones).
 */
export function getMonthKey(dateValue) {
    if (dateValue == null || dateValue === '') {
        return null;
    }

    const str = String(dateValue).trim();
    if (DATE_ONLY_REGEX.test(str)) {
        const [year, month] = str.split('-').map(Number);
        if (month >= 1 && month <= 12 && Number.isFinite(year)) {
            return `${year}-${String(month).padStart(2, '0')}`;
        }
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getDefaultMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getPreviousMonthKey(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const previousMonthDate = new Date(year, month - 2, 1);

    return getDefaultMonthKey(previousMonthDate);
}

function getItemDate(item, dateFields) {
    return dateFields.map((fieldName) => item?.[fieldName]).find(Boolean);
}

export function filterItemsByMonth(items, selectedMonth, dateFields) {
    if (!selectedMonth) {
        return items;
    }

    return items.filter((item) => getMonthKey(getItemDate(item, dateFields)) === selectedMonth);
}

export function buildMonthCurrencyTotals(items, {
    dateFields,
    currentMonthKey,
    previousMonthKey,
    amountField = 'amount',
    currencyField = 'currencySymbol',
    fallbackCurrency = '₩'
}) {
    return items.reduce((totals, item) => {
        const monthKey = getMonthKey(getItemDate(item, dateFields));

        if (!monthKey) {
            return totals;
        }

        const currency = item?.[currencyField] || fallbackCurrency;
        const amount = Number(item?.[amountField] || 0);

        if (monthKey === currentMonthKey) {
            totals.totalsThisMonth[currency] = (totals.totalsThisMonth[currency] || 0) + amount;
        }

        if (monthKey === previousMonthKey) {
            totals.totalsPrevMonth[currency] = (totals.totalsPrevMonth[currency] || 0) + amount;
        }

        return totals;
    }, {
        totalsThisMonth: {},
        totalsPrevMonth: {}
    });
}

export function resolveReorderMove(filteredItems, sortedItems, index, direction) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= filteredItems.length) {
        return null;
    }

    const currentItem = filteredItems[index];
    const targetItem = filteredItems[targetIndex];

    if (!currentItem || !targetItem) {
        return null;
    }

    const fromIndex = sortedItems.findIndex((item) => item.id === currentItem.id);
    const toIndex = sortedItems.findIndex((item) => item.id === targetItem.id);

    if (fromIndex < 0 || toIndex < 0) {
        return null;
    }

    return { fromIndex, toIndex };
}
