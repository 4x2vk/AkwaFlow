import { detectIntentV2, extractSlotsV2, normalizeText } from './index.js';

const samples = [
  'Кофе 6000вон сегодня',
  'Старбакс 6000вон сегодня',
  'Нетфликс 5000вон 12 число',
  'Расход 12000 вон кафе сегодня',
  'Доход 500000₩ зарплата сегодня',
  'Starbucks 6000 won today',
  'I spent 5$ taxi yesterday',
  '스타벅스 6000원 오늘',
  '내 지출 스타벅스 6000원 오늘',
];

for (const s of samples) {
  const ii = detectIntentV2(s);
  const slots = extractSlotsV2(s, ii);
  console.log('\n---');
  console.log(s);
  console.log('normalized:', normalizeText(s));
  console.log(ii);
  console.log({
    title: slots.title,
    amount: slots.amount,
    currency: slots.currencyCode,
    at: slots.transaction.at,
  });
}

