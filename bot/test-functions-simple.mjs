// Simple test that doesn't require bot initialization
// Import only the functions we need without triggering bot initialization

// Mock the required dependencies to avoid initialization
process.env.RUN_MODE = 'selftest';
process.env.TELEGRAM_BOT_TOKEN = 'test_token';

// Import after setting env vars
const { detectIntentV2, extractSlotsV2, normalizeText, extractCategory, detectLanguage } = await import('./index.js');

console.log('🧪 Тестирование всех функций бота\n');
console.log('='.repeat(60));

// Test cases for all functions
const testCases = [
    // Category operations
    {
        name: 'Добавление категории',
        tests: [
            'добавь категорию Бургер',
            'добавь категорию Еда',
            'add category Food',
            'создай категорию Транспорт',
            'категория Развлечения'
        ]
    },
    {
        name: 'Удаление категории',
        tests: [
            'удали категорию Бургер',
            'удали категорию Еда',
            'delete category Food',
            'убери категорию Транспорт'
        ]
    },
    {
        name: 'Список категорий',
        tests: [
            'мои категории',
            'список категорий',
            'покажи категории',
            'my categories',
            'show categories'
        ]
    },
    // Subscription operations
    {
        name: 'Добавление подписки',
        tests: [
            'Добавь Netflix 10000 вон 12 числа',
            'Добавь Spotify 5$ завтра',
            'Добавь YouTube 1000 тг 17 февраля',
            'Netflix 10000₩ 12 числа'
        ]
    },
    {
        name: 'Список подписок',
        tests: [
            'мои подписки',
            'список подписок',
            'покажи подписки',
            'my subscriptions'
        ]
    },
    {
        name: 'Удаление подписки',
        tests: [
            'Удали Netflix',
            'удали подписку Spotify',
            'delete Netflix',
            'remove subscription YouTube'
        ]
    },
    // Expense operations
    {
        name: 'Добавление расхода',
        tests: [
            'Расход 12000 вон кафе сегодня',
            'Потратил 5000₩ такси вчера',
            'Expense 50$ food today',
            'купил 1000 тг хлеб сегодня',
            'Расход 100000вон сегодня категория Еда'
        ]
    },
    {
        name: 'Список расходов',
        tests: [
            'мои расходы',
            'список расходов',
            'покажи расходы',
            'my expenses'
        ]
    },
    {
        name: 'Удаление расхода',
        tests: [
            'Удали расход такси',
            'удали такси',
            'delete expense coffee',
            'remove такси'
        ]
    },
    // Income operations
    {
        name: 'Добавление дохода',
        tests: [
            'Доход 500000₩ зарплата сегодня',
            'Получил 2000$ фриланс 17.02',
            'Income 1000$ salary today',
            'заработал 50000₩ сегодня'
        ]
    },
    {
        name: 'Список доходов',
        tests: [
            'мои доходы',
            'список доходов',
            'покажи доходы',
            'my incomes'
        ]
    },
    {
        name: 'Удаление дохода',
        tests: [
            'Удали доход зарплата',
            'удали зарплата',
            'delete income salary',
            'remove зарплата'
        ]
    },
    // Complex cases with categories
    {
        name: 'Операции с категориями',
        tests: [
            'Добавь компьютер 100000вон сегодня категория Купанг',
            'Expense 50$ food today category Food',
            'Расход 5000₩ такси сегодня категория Транспорт',
            'Доход 100000₩ фриланс сегодня категория Работа'
        ]
    }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const category of testCases) {
    console.log(`\n📋 ${category.name}:`);
    console.log('-'.repeat(60));
    
    for (const testText of category.tests) {
        totalTests++;
        try {
            const intentInfo = detectIntentV2(testText);
            const slots = extractSlotsV2(testText, intentInfo);
            
            // Extract category if present
            const categoryName = extractCategory(testText, intentInfo.lang);
            
            const result = {
                intent: intentInfo.intent,
                confidence: intentInfo.confidence,
                lang: intentInfo.lang,
                title: slots.title,
                amount: slots.amount,
                currency: slots.currencyCode,
                category: categoryName || slots.category,
                date: slots.transaction?.at || slots.subscription?.nextPaymentDate
            };
            
            // Check if intent was detected (not 'unknown')
            if (intentInfo.intent !== 'unknown' && intentInfo.confidence > 0.3) {
                passedTests++;
                console.log(`✅ "${testText}"`);
                console.log(`   Intent: ${result.intent} (confidence: ${result.confidence.toFixed(2)})`);
                if (result.title) console.log(`   Title: ${result.title}`);
                if (result.amount) console.log(`   Amount: ${result.amount} ${result.currency}`);
                if (result.category) console.log(`   Category: ${result.category}`);
                if (result.date) console.log(`   Date: ${new Date(result.date).toLocaleDateString('ru-RU')}`);
            } else {
                failedTests++;
                console.log(`❌ "${testText}"`);
                console.log(`   Intent: ${result.intent} (confidence: ${result.confidence.toFixed(2)}) - TOO LOW`);
            }
        } catch (error) {
            failedTests++;
            console.log(`❌ "${testText}"`);
            console.log(`   ERROR: ${error.message}`);
        }
    }
}

console.log('\n' + '='.repeat(60));
console.log(`📊 Результаты тестирования:`);
console.log(`   Всего тестов: ${totalTests}`);
console.log(`   ✅ Успешно: ${passedTests}`);
console.log(`   ❌ Провалено: ${failedTests}`);
console.log(`   📈 Успешность: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

// Special test for category extraction
console.log('\n🔍 Специальный тест извлечения категорий:');
console.log('-'.repeat(60));
const categoryTests = [
    'добавь категорию Бургер',
    'категория Еда',
    'add category Food',
    'удали категорию Транспорт',
    'Добавь компьютер 100000вон сегодня категория Купанг',
    'Expense 50$ food today category Food'
];

for (const test of categoryTests) {
    const lang = detectLanguage(test);
    const cat = extractCategory(test, lang);
    if (cat) {
        console.log(`✅ "${test}" → категория: "${cat}"`);
    } else {
        console.log(`❌ "${test}" → категория не найдена`);
    }
}

process.exit(0);
