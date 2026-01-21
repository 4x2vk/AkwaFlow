import { normalizeText, detectLanguage, extractCategory, extractTitleGeneric } from './index.js';

const testCases = [
    'Добавь кофе 7000 вон сегодня категория купанг',
    'Добавь макдак 7000 вон сегодня категория купанг',
    'Добавь компьютер 100000 вон сегодня категория Купанг',
    'Expense 50$ food today category Food',
    '카테고리 쇼핑 스타벅스 6000원'
];

console.log('Testing category extraction and title cleaning:\n');

for (const test of testCases) {
    const lang = detectLanguage(test);
    const category = extractCategory(test, lang);
    const title = extractTitleGeneric(test);
    
    console.log('---');
    console.log('Input:', test);
    console.log('Language:', lang);
    console.log('Category:', category);
    console.log('Title:', title);
    console.log('');
}
