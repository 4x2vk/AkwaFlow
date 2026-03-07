import assert from 'node:assert/strict';

process.env.RUN_MODE = 'selftest';
process.env.TELEGRAM_BOT_TOKEN = 'test_token';

const { detectIntentV2, extractSlotsV2, normalizeText, extractCategory } = await import('./index.js');

const cases = [
    {
        name: 'inline category should stay expense',
        text: 'Расход 100000вон сегодня категория Еда',
        expect: {
            intent: 'expense_add',
            amount: 100000,
            category: 'Еда'
        }
    },
    {
        name: 'expense title keeps business name with category',
        text: 'Расход 5000₩ такси сегодня категория Транспорт',
        expect: {
            intent: 'expense_add',
            amount: 5000,
            category: 'Транспорт',
            titleIncludes: 'такси'
        }
    },
    {
        name: 'bare category command is category add',
        text: 'категория Дом и быт',
        expect: {
            intent: 'category_add',
            category: 'Дом и быт'
        }
    },
    {
        name: 'voice-like recurring phrase becomes subscription',
        text: 'Netflix 10000₩ 12 числа',
        expect: {
            intent: 'subscription_add',
            amount: 10000,
            titleIncludes: 'netflix'
        }
    },
    {
        name: 'same-day purchase without verb becomes expense',
        text: 'Кофе 6000вон сегодня',
        expect: {
            intent: 'expense_add',
            amount: 6000,
            titleIncludes: 'кофе'
        }
    },
    {
        name: 'day before subscription amount uses money not billing day',
        text: 'Добавь подписку KT 15 числа 12000 рублей',
        expect: {
            intent: 'subscription_add',
            amount: 12000,
            titleIncludes: 'kt'
        }
    },
    {
        name: 'date before expense amount still picks money',
        text: 'Расход 15 числа такси 12000 вон',
        expect: {
            intent: 'expense_add',
            amount: 12000,
            titleIncludes: 'такси'
        }
    },
    {
        name: 'income keeps amount when text starts with date',
        text: '17 февраля получил 2000$ фриланс',
        expect: {
            intent: 'income_add',
            amount: 2000,
            titleIncludes: 'фриланс'
        }
    },
    {
        name: 'future money phrase stays ambiguous',
        text: 'Starbucks 6000 won tomorrow',
        expect: {
            intent: 'add_ambiguous',
            amount: 6000,
            titleIncludes: 'starbucks'
        }
    },
    {
        name: 'english inline category stays expense',
        text: 'Expense 50$ food today category Food',
        expect: {
            intent: 'expense_add',
            amount: 50,
            category: 'Food',
            titleIncludes: 'food'
        }
    }
];

const failures = [];

for (const testCase of cases) {
    try {
        const intentInfo = detectIntentV2(testCase.text);
        const slots = extractSlotsV2(testCase.text, intentInfo);
        const category = extractCategory(testCase.text, intentInfo.lang) || slots.category;

        assert.equal(intentInfo.intent, testCase.expect.intent, 'intent');

        if (Object.hasOwn(testCase.expect, 'amount')) {
            assert.equal(slots.amount, testCase.expect.amount, 'amount');
        }

        if (Object.hasOwn(testCase.expect, 'category')) {
            assert.equal(category, testCase.expect.category, 'category');
        }

        if (Object.hasOwn(testCase.expect, 'titleIncludes')) {
            assert.match(normalizeText(slots.title).toLowerCase(), new RegExp(testCase.expect.titleIncludes, 'i'), 'title');
        }

        console.log(`PASS ${testCase.name}`);
    } catch (error) {
        failures.push({ name: testCase.name, text: testCase.text, error: error.message });
        console.log(`FAIL ${testCase.name}`);
        console.log(`  Input: ${testCase.text}`);
        console.log(`  Error: ${error.message}`);
    }
}

console.log(`\nChecked ${cases.length} NLU regression cases.`);

if (failures.length > 0) {
    console.error(`Failed: ${failures.length}`);
    process.exit(1);
}

console.log('All NLU regressions passed.');
