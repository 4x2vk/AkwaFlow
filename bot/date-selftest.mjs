import { normalizeText } from './index.js';

// local re-import of parseDateEnhanced from the same file (commonjs interop is tricky),
// so just copy the function body here for the test.
const parseDateEnhancedLocal = (rawText) => {
  const text = normalizeText(rawText).toLowerCase();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (/\bсегодня\b/.test(text)) {
    return { date: new Date(now).toISOString(), cycle: `Каждый ${now.getDate()} числа` };
  }
  if (/\bзавтра\b/.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return { date: d.toISOString(), cycle: `Каждый ${d.getDate()} числа` };
  }
  if (/\bпослезавтра\b/.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return { date: d.toISOString(), cycle: `Каждый ${d.getDate()} числа` };
  }
  const inDays = text.match(/\bчерез\s+(\d{1,3})\s*(дн(я|ей)?|день)\b/);
  if (inDays) {
    const days = parseInt(inDays[1], 10);
    const d = new Date(now);
    d.setDate(d.getDate() + Math.max(0, days));
    return { date: d.toISOString(), cycle: `Каждый ${d.getDate()} числа` };
  }

  const dm = text.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/);
  if (dm) {
    const day = parseInt(dm[1], 10);
    const month = parseInt(dm[2], 10) - 1;
    const yearRaw = dm[3];
    let year = now.getFullYear();
    if (yearRaw) {
      const y = parseInt(yearRaw, 10);
      year = y < 100 ? 2000 + y : y;
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      if (!yearRaw && d < now) d.setFullYear(d.getFullYear() + 1);
      return { date: d.toISOString(), cycle: `Каждый ${day} числа` };
    }
  }

  const monthMap = {
    янв: 0, фев: 1, мар: 2, апр: 3, май: 4, июн: 5, июл: 6, авг: 7, сен: 8, окт: 9, ноя: 10, дек: 11
  };
  const m = text.match(/\b(\d{1,2})\s+(янв(?:ар[ья])?|фев(?:рал[ья])?|мар(?:т[а])?|апр(?:ел[ья])?|ма[йя]|июн(?:[ья])?|июл(?:[ья])?|авг(?:уст[а])?|сен(?:тябр[ья])?|окт(?:ябр[ья])?|ноя(?:бр[ья])?|дек(?:ябр[ья])?)\b/);
  if (m) {
    const day = parseInt(m[1], 10);
    const token = m[2].slice(0, 3);
    const month = monthMap[token];
    if (month !== undefined) {
      const d = new Date(now.getFullYear(), month, day);
      if (d < now) d.setFullYear(d.getFullYear() + 1);
      return { date: d.toISOString(), cycle: `Каждый ${day} числа` };
    }
  }

  // fallback to parseDate from main file is hard to reuse here; just rely on normalizeText+regex like in bot
  const parseDateLikeBot = (txt) => {
    // copy of updated parseDate logic
    const plain = txt;
    const baseNow = new Date();
    baseNow.setHours(0, 0, 0, 0);

    const explicitMatches = [...plain.matchAll(/(\d{1,2})\s*(?:числа|число|го|е|th)\b/gi)];
    if (explicitMatches.length > 0) {
      const last = explicitMatches[explicitMatches.length - 1];
      const day = parseInt(last[1], 10);
      if (day >= 1 && day <= 31) {
        const year = baseNow.getFullYear();
        const month = baseNow.getMonth();
        let paymentDate = new Date(year, month, day);
        if (paymentDate < baseNow) {
          paymentDate = new Date(year, month + 1, day);
        }
        return { date: paymentDate.toISOString(), cycle: `Каждый ${day} числа` };
      }
    }

    const genericMatches = [...plain.matchAll(/(^|[^\d])(\d{1,2})(?!\d)/g)];
    if (genericMatches.length > 0) {
      const candidates = genericMatches
        .map(m => parseInt(m[2], 10))
        .filter(d => d >= 1 && d <= 31);
      if (candidates.length > 0) {
        const day = candidates[candidates.length - 1];
        const year = baseNow.getFullYear();
        const month = baseNow.getMonth();
        let paymentDate = new Date(year, month, day);
        if (paymentDate < baseNow) {
          paymentDate = new Date(year, month + 1, day);
        }
        return { date: paymentDate.toISOString(), cycle: `Каждый ${day} числа` };
      }
    }

    const nextMonth = new Date(baseNow.getFullYear(), baseNow.getMonth() + 1, 1);
    return { date: nextMonth.toISOString(), cycle: 'Каждый 1 числа' };
  };

  return parseDateLikeBot(text);
};

const ex = 'Добавь нетфликс 22222 вон 31число';
console.log('raw:', ex);
console.log('normalized:', normalizeText(ex));
const res = parseDateEnhancedLocal(ex);
console.log('result:', res, 'as local date:', new Date(res.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }));

