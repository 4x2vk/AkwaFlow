const MONTH_LABELS = [
    { name: 'Янв', month: 0 },
    { name: 'Фев', month: 1 },
    { name: 'Мар', month: 2 },
    { name: 'Апр', month: 3 },
    { name: 'Май', month: 4 },
    { name: 'Июн', month: 5 },
    { name: 'Июл', month: 6 },
    { name: 'Авг', month: 7 },
    { name: 'Сен', month: 8 },
    { name: 'Окт', month: 9 },
    { name: 'Ноя', month: 10 },
    { name: 'Дек', month: 11 }
];

function toValidDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function resolveBillingPeriod(subscription) {
    return subscription.billingPeriod || (subscription.cycle?.includes('год') ? 'yearly' : 'monthly');
}

function getMonthlySubscriptionCost(subscription) {
    const cost = Number(subscription.cost || 0);
    return resolveBillingPeriod(subscription) === 'yearly' ? cost / 12 : cost;
}

function accumulateCurrencyTotal(totals, currency, amount) {
    totals[currency] = (totals[currency] || 0) + amount;
    return totals;
}

export function getMonthLabels() {
    return MONTH_LABELS.map((label) => ({ ...label }));
}

export function toYearlyByCurrency(monthlyByCurrency) {
    return Object.entries(monthlyByCurrency).reduce((totals, [currency, amount]) => {
        totals[currency] = Number(amount || 0) * 12;
        return totals;
    }, {});
}

export function getSubscriptionMonthlyByCurrency(subscriptions) {
    return subscriptions.reduce((totals, subscription) => {
        const currency = subscription.currencySymbol || '₩';
        return accumulateCurrencyTotal(totals, currency, getMonthlySubscriptionCost(subscription));
    }, {});
}

export function getTotalsByCurrencyForMonth(items, {
    dateField,
    amountField = 'amount',
    year,
    month
}) {
    return items.reduce((totals, item) => {
        const date = toValidDate(item?.[dateField]);
        if (!date || date.getFullYear() !== year || date.getMonth() !== month) {
            return totals;
        }

        return accumulateCurrencyTotal(
            totals,
            item.currencySymbol || '₩',
            Number(item?.[amountField] || 0)
        );
    }, {});
}

export function getTotalsByCurrencyForYear(items, {
    dateField,
    amountField = 'amount',
    year,
    maxMonth
}) {
    return items.reduce((totals, item) => {
        const date = toValidDate(item?.[dateField]);
        if (!date || date.getFullYear() !== year || date.getMonth() > maxMonth) {
            return totals;
        }

        return accumulateCurrencyTotal(
            totals,
            item.currencySymbol || '₩',
            Number(item?.[amountField] || 0)
        );
    }, {});
}

export function mergeCurrencyTotals(baseTotals, extraTotals) {
    const merged = { ...baseTotals };

    Object.entries(extraTotals).forEach(([currency, amount]) => {
        merged[currency] = (merged[currency] || 0) + Number(amount || 0);
    });

    return merged;
}

export function subtractCurrencyTotals(leftTotals, rightTotals) {
    const currencies = new Set([
        ...Object.keys(leftTotals),
        ...Object.keys(rightTotals)
    ]);

    return [...currencies].reduce((totals, currency) => {
        totals[currency] = Number(leftTotals[currency] || 0) - Number(rightTotals[currency] || 0);
        return totals;
    }, {});
}

export function getPrimaryCurrency(...currencyMaps) {
    for (const currencyMap of currencyMaps) {
        const [firstCurrency] = Object.keys(currencyMap || {});
        if (firstCurrency) {
            return firstCurrency;
        }
    }

    return '₩';
}

export function getSubscriptionMonthlyTotal(subscriptions) {
    return subscriptions.reduce((total, subscription) => total + getMonthlySubscriptionCost(subscription), 0);
}

export function getMonthlyAmountSeries(items, {
    dateField,
    amountField = 'amount',
    valueKey,
    year
}) {
    const months = getMonthLabels().map((monthLabel) => ({
        ...monthLabel,
        [valueKey]: 0
    }));

    items.forEach((item) => {
        const date = toValidDate(item?.[dateField]);
        if (!date || date.getFullYear() !== year) {
            return;
        }

        months[date.getMonth()][valueKey] += Number(item?.[amountField] || 0);
    });

    return months;
}

export function buildMonthlyCompareData({
    currentMonth,
    expenseMonthlyTotals,
    incomeMonthlyTotals,
    subscriptionMonthlyTotal
}) {
    return getMonthLabels()
        .filter((monthLabel) => monthLabel.month <= currentMonth)
        .map((monthLabel) => {
            const expenses = expenseMonthlyTotals.find((entry) => entry.month === monthLabel.month)?.expenses || 0;
            const income = incomeMonthlyTotals.find((entry) => entry.month === monthLabel.month)?.income || 0;

            return {
                name: monthLabel.name,
                month: monthLabel.month,
                income,
                subscriptions: subscriptionMonthlyTotal,
                expenses,
                net: income - (subscriptionMonthlyTotal + expenses)
            };
        });
}

export function getSubscriptionByCategory(subscriptions) {
    const categories = {};

    subscriptions.forEach((subscription) => {
        const category = subscription.category || 'Общие';

        if (!categories[category]) {
            categories[category] = {
                name: category,
                value: 0,
                color: subscription.color || '#6B7280'
            };
        }

        categories[category].value += getMonthlySubscriptionCost(subscription);
    });

    return Object.values(categories).filter((entry) => entry.value > 0);
}

export function getItemsByCategoryForMonth(items, {
    dateField,
    year,
    month,
    fallbackColor
}) {
    const categories = {};

    items.forEach((item) => {
        const date = toValidDate(item?.[dateField]);
        if (!date || date.getFullYear() !== year || date.getMonth() !== month) {
            return;
        }

        const category = item.category || 'Общие';

        if (!categories[category]) {
            categories[category] = {
                name: category,
                value: 0,
                color: item.color || fallbackColor
            };
        }

        categories[category].value += Number(item.amount || 0);
    });

    return Object.values(categories).filter((entry) => entry.value > 0);
}
