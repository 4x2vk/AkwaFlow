import TelegramBot from 'node-telegram-bot-api';
import admin from 'firebase-admin';
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
let serviceAccount;
try {
    // For Railway - get from environment variable
    if (process.env.SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized from environment variable');
    } else {
        // Local development - try to load from file
        try {
            serviceAccount = require('./service-account.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin initialized from file');
        } catch (fileError) {
            console.warn("⚠️ Warning: 'service-account.json' not found. Bot database writes will fail.");
        }
    }
} catch (e) {
    console.error("❌ Firebase Admin initialization error:", e.message);
    console.warn("⚠️ Warning: Bot database writes will fail.");
}

const db = admin.firestore();

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL || 'https://akwaflow-manager-v1.web.app';
const openaiApiKey = process.env.OPENAI_API_KEY;
const RUN_MODE = process.env.RUN_MODE || 'bot'; // 'bot' | 'selftest'

// Admin IDs - comma-separated list of Telegram user IDs who can send broadcasts
// Example: ADMIN_IDS=123456789,987654321
const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];

// Check if user is admin
const isAdmin = (userId) => {
    return adminIds.includes(String(userId));
};

if (!token && RUN_MODE === 'bot') {
    console.error("❌ CRTICAL ERROR: TELEGRAM_BOT_TOKEN is missing provided!");
    console.error("Please set TELEGRAM_BOT_TOKEN environment variable");
    // Don't exit - let Railway see the error in logs
    process.exit(1);
}

let bot;
if (RUN_MODE === 'bot') {
    try {
        // Only enable polling in production (Railway/server)
        // Set ENABLE_POLLING=true in environment to force polling
        const enablePolling = process.env.ENABLE_POLLING === 'true' || process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
        
        if (enablePolling) {
            bot = new TelegramBot(token, { polling: true });
            console.log('✅ Telegram Bot initialized with polling');
        } else {
            bot = new TelegramBot(token, { polling: false });
            console.log('✅ Telegram Bot initialized (polling disabled - use webhook or set ENABLE_POLLING=true)');
        }
    } catch (error) {
        console.error('❌ Error initializing Telegram Bot:', error);
        process.exit(1);
    }

    // Handle bot errors
    bot.on('error', (error) => {
        console.error('❌ Bot error:', error);
    });

    bot.on('polling_error', (error) => {
        console.error('❌ Bot polling error:', error);
        // Don't exit on polling errors - they can be temporary
    });
}

// Currency Helper
const detectCurrency = (input) => {
    const text = String(input || '').toLowerCase().trim();

    // helper: match token as standalone word-ish (prevents false positives)
    // allow digit before token to support "6000вон", "5000руб"
    const hasToken = (token) => new RegExp(`(^|[\\s,.;:()\\-\\d])${token}([\\s,.;:()\\-]|$)`, 'i').test(text);

    // 1) KZT / Tenge
    // examples: "1000 тг", "1000 тенге", "1000 тенг", "1000 kzt", "1000 ₸"
    if (
        text.includes('₸') ||
        hasToken('kzt') ||
        hasToken('тенге') ||
        hasToken('тенг') ||
        hasToken('тен') ||
        hasToken('тг') ||
        text.includes('казахстан') // "казахстанский тенге"
    ) {
        return { code: 'KZT', symbol: '₸' };
    }

    // 2) RUB / Ruble
    // examples: "1000 руб", "1000 рублей", "1000 р", "1000 rub", "1000 ₽"
    if (
        text.includes('₽') ||
        hasToken('rub') ||
        hasToken('руб') ||
        hasToken('руб.') ||
        hasToken('рублей') ||
        hasToken('рубля') ||
        hasToken('рубль') ||
        hasToken('р') // common shorthand (works best when separated by spaces/punct)
    ) {
        return { code: 'RUB', symbol: '₽' };
    }

    // 3) USD / Dollar
    // examples: "10$", "10 usd", "10 доллар", "10 бакс"
    if (
        text.includes('$') ||
        hasToken('usd') ||
        hasToken('дол') ||
        hasToken('доллар') ||
        hasToken('доллара') ||
        hasToken('долларов') ||
        hasToken('бакс') ||
        hasToken('баксов')
    ) {
        return { code: 'USD', symbol: '$' };
    }

    // 4) WON / KRW
    // examples: "1000 вон", "1000 won", "1000 krw", "1000 ₩"
    if (
        text.includes('₩') ||
        hasToken('krw') ||
        hasToken('won') ||
        hasToken('вон') ||
        hasToken('воны') ||
        hasToken('вона')
    ) {
        return { code: 'WON', symbol: '₩' };
    }

    // Default
    return { code: 'WON', symbol: '₩' };
};

// Text normalization (helps understand “same meaning” phrases)
const normalizeText = (input) => {
    return String(input || '')
        .replace(/[“”«»"]/g, ' ')
        .replace(/[’‘]/g, "'")
        .replace(/\u00A0/g, ' ')
        .replace(/ё/gi, 'е')
        .replace(/[^\p{L}\p{N}\s.,;:()\-+$/₽₩₸€]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

// Language detection (rough): ru / en / ko
const detectLanguage = (input) => {
    const t = String(input || '');
    if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(t)) return 'ko';
    if (/[А-Яа-яЁё]/.test(t)) return 'ru';
    return 'en';
};

// Intent detection (RU/EN + synonyms)
const detectIntent = (rawText) => {
    const t = normalizeText(rawText).toLowerCase();
    const has = (re) => re.test(t);

    if (has(/^\/start\b/)) return 'start';
    if (has(/\b(помощь|help|хелп|что ты умеешь|как пользоваться)\b/)) return 'help';
    if (has(/^\/(income|доход)\b/)) return 'income_add';
    if (has(/\b(мои доходы|список доходов|покажи доходы|показать доходы)\b/)) return 'income_list';
    if (has(/\b(удал(и|ить)|убери|сотри|отмени|remove|delete)\b/) && has(/\b(доход|доходы|прибыл(ь|и)|зарплат)\b/)) return 'income_remove';
    if (has(/^\/(expense|расходы?|spend)\b/)) return 'expense_add';
    if (has(/\b(мои расходы|список расходов|покажи расходы|показать расходы)\b/)) return 'expense_list';
    if (has(/\b(удал(и|ить)|убери|сотри|отмени|remove|delete)\b/) && has(/\b(расход|расходы|трата|траты)\b/)) return 'expense_remove';
    if (has(/\b(расход|трата|траты|потратил|потратила|купил|купила|spend|spent|expense)\b/)) return 'expense_add';
    if (has(/\b(доход|доходы|заработал|заработала|получил|получила|прибыл(ь|и)|income|earned)\b/)) return 'income_add';
    if (has(/\b(удал(и|ить)|убери|сотри|отмени|remove|delete)\b/)) return 'remove';
    if (has(/\b(добав(ь|ить|ляй|им)|создай|запиши|оформи|подключи|add)\b/)) return 'add';
    if (has(/\b(мои подписки|список подписок|покажи подписки|показать подписки|список|list|subscriptions)\b/)) return 'list';
    if (has(/\b(привет|hello|hi)\b/)) return 'greet';

    // Often in voice: user says “нетфликс 1000 тг 17 февраля” without “добавь”
    if (/\d/.test(t) && (/[₽₩₸$]/.test(t) || /\b(rub|usd|kzt|krw|won|руб|дол|тен|тг|вон)\b/.test(t))) return 'add';

    return 'unknown';
};

// Intent detection v2 (RU/EN/KO) + ambiguity support
const detectIntentV2 = (rawText) => {
    const raw = String(rawText || '');
    const t = normalizeText(raw).toLowerCase();
    const lang = detectLanguage(rawText);
    const has = (re) => re.test(t);
    // Unicode-aware token matcher (JS \\b is ASCII-only and fails for RU/KO)
    const hasToken = (token) => new RegExp(`(^|[^\\p{L}\\p{N}_])${token}([^\\p{L}\\p{N}_]|$)`, 'iu').test(t);
    const hasAnyToken = (tokens) => tokens.some((tok) => hasToken(tok));

    // Commands / global
    if (has(/^\/start\b/)) return { intent: 'start', lang, confidence: 1 };
    if (has(/^\/help\b/) || has(/\b(помощь|help|хелп|что ты умеешь|как пользоваться)\b/)) return { intent: 'help', lang, confidence: 1 };
    if (has(/^\/cancel\b/) || has(/\b(отмена|cancel|стоп|stop)\b/)) return { intent: 'cancel', lang, confidence: 1 };

    // Lists
    if (
        t.includes('мои подписки') ||
        t.includes('список подписок') ||
        t.includes('покажи подписки') ||
        t.includes('показать подписки') ||
        t.includes('my subscriptions') ||
        t.includes('subscriptions list') ||
        t.includes('내 구독') ||
        t.includes('구독 목록') ||
        t.includes('구독 리스트')
    ) return { intent: 'subscription_list', lang, confidence: 0.95 };

    if (
        t.includes('мои расходы') ||
        t.includes('список расходов') ||
        t.includes('покажи расходы') ||
        t.includes('показать расходы') ||
        t.includes('my expenses') ||
        t.includes('expenses list') ||
        t.includes('내 지출') ||
        t.includes('지출 목록') ||
        t.includes('지출 리스트')
    ) return { intent: 'expense_list', lang, confidence: 0.95 };

    if (
        t.includes('мои доходы') ||
        t.includes('список доходов') ||
        t.includes('покажи доходы') ||
        t.includes('показать доходы') ||
        t.includes('my incomes') ||
        t.includes('my income') ||
        t.includes('incomes list') ||
        t.includes('내 수입') ||
        t.includes('수입 목록') ||
        t.includes('수입 리스트')
    ) return { intent: 'income_list', lang, confidence: 0.95 };

    // Remove
    const removeRe = /\b(удал(и|ить)|убери|сотри|отмени|remove|delete)\b/;
    if (has(removeRe) || has(/^\/(remove|delete)\b/)) {
        if (hasAnyToken(['подписк', 'subscription', '구독'])) return { intent: 'subscription_remove', lang, confidence: 0.95 };
        if (hasAnyToken(['расход', 'расходы', 'трата', 'траты', 'expense', 'spent', '지출'])) return { intent: 'expense_remove', lang, confidence: 0.95 };
        if (hasAnyToken(['доход', 'доходы', 'income', 'earned', '수입'])) return { intent: 'income_remove', lang, confidence: 0.95 };
        return { intent: 'remove', lang, confidence: 0.7 }; // legacy: subscription remove by name
    }

    // Explicit add type triggers
    const expenseTokens = ['расход', 'расходы', 'трата', 'траты', 'потратил', 'потратила', 'купил', 'купила', 'spend', 'spent', 'expense', '지출', '썼어', '사용', '결제'];
    const incomeTokens = ['доход', 'доходы', 'прибыль', 'получил', 'получила', 'заработал', 'заработала', 'income', 'earned', '수입', '월급', '받았'];
    const subTokens = ['подписк', 'subscription', 'sub', '구독', '매달'];
    const addVerbTokens = ['добав', 'создай', 'запиши', 'оформи', 'подключи', 'add', '추가', '등록'];

    if (hasAnyToken(expenseTokens)) return { intent: 'expense_add', lang, confidence: 0.9 };
    if (hasAnyToken(incomeTokens)) return { intent: 'income_add', lang, confidence: 0.9 };
    if (hasAnyToken(subTokens)) return { intent: 'subscription_add', lang, confidence: 0.85 };

    if (has(/\b(привет|hello|hi)\b/) || (lang === 'ko' && has(/\b(안녕|안녕하세요)\b/))) return { intent: 'greet', lang, confidence: 0.8 };

    // Heuristic: contains money (numbers + currency)
    const hasMoney =
        /\d/.test(t) &&
        (
            /[₽₩₸$€]/.test(t) ||
            hasAnyToken(['rub', 'usd', 'kzt', 'krw', 'won', 'eur', 'руб', 'дол', 'тен', 'тг', 'вон', '원', '만원', '천원']) ||
            /(\d)\s*(вон|원|руб|р(?![a-z])|тг|тенге|won|krw|usd|rub|kzt|eur)/iu.test(t)
        );

    // “add + money” but no type -> treat as subscription add (as before), low confidence
    if (hasMoney && hasAnyToken(addVerbTokens)) {
        return { intent: 'subscription_add', lang, confidence: 0.6 };
    }

    // Money but no clear type -> ask
    if (hasMoney) return { intent: 'add_ambiguous', lang, confidence: 0.45 };

    // Backward-compatible: old "list" keyword
    if (hasAnyToken(['список', 'list', 'subscriptions'])) return { intent: 'subscription_list', lang, confidence: 0.55 };

    return { intent: 'unknown', lang, confidence: 0.1 };
};

const buildHelpMessage = () => {
    return [
        'Я помогу быстро вести ваши подписки и расходы — прямо здесь, в Telegram.',
        '',
        'Что я умею:',
        '• добавлять подписки (текстом или голосом)',
        '• добавлять разовые расходы',
        '• добавлять разовые доходы',
        '• показывать список ваших подписок',
        '• показывать список ваших расходов',
        '• показывать список ваших доходов',
        '• удалять подписки по названию',
        '• удалять доходы и расходы по названию',
        '• понимать разные валюты (₩ / ₽ / $ / ₸ и слова вроде “вон”, “руб”, “тенге”)',
        '• понимать базовые команды на русском/английском/корейском',
        '• указывать категории (категория Название)',
        '',
        'Примеры:',
        '• «Добавь Netflix 10000 вон 12 числа»',
        '• «Добавь Spotify 5$ завтра»',
        '• «Добавь YouTube 1000 тг 17 февраля»',
        '• «Расход 12000 вон кафе сегодня»',
        '• «Потратил 5000₩ такси вчера»',
        '• «Доход 500000₩ зарплата сегодня»',
        '• «Получил 2000$ фриланс 17.02»',
        '• «Добавь компьютер 100000вон сегодня категория Купанг»',
        '• «Expense 50$ food today category Food»',
        '• «Starbucks 6000 won today»',
        '• «스타벅스 6000원 오늘»',
        '• «Мои расходы»',
        '• «Мои доходы»',
        '• «Удали Netflix»',
        '• «Удали доход зарплата»',
        '• «Мои подписки»',
        '',
        'Если чего-то не хватит (суммы/даты) — я вежливо уточню.',
        'Чтобы отменить любой диалог: /cancel',
        'Политика приватности: /privacy'
    ].join('\n');
};

const buildWelcomeMessage = () => {
    return [
        'Здравствуйте! 👋',
        '',
        'Я AkwaFlow — аккуратный помощник по подпискам. Помогу быстро записать расходы и доходы и увидеть баланс.',
        '',
        'Отправьте мне сообщение (можно голосом):',
        '• «Добавь Netflix 10000 вон 12 числа»',
        '• «Расход 12000 вон кафе сегодня»',
        '• «Доход 500000₩ зарплата сегодня»',
        '• «Удали Spotify»',
        '• «Удали доход зарплата»',
        '• «Мои подписки»',
        '• «Мои расходы»',
        '• «Мои доходы»',
        '',
        'Справка: /help',
        'Приватность: /privacy',
        'Отмена текущего шага: /cancel',
        '',
        'Чтобы открыть приложение, нажмите синюю кнопку «Подписки» слева.'
    ].join('\n');
};

// Simple conversation state (in-memory). Enough for “ask follow-up question”.
// NOTE: If you run multiple bot instances, move this to Firestore/Redis.
const PENDING_TTL_MS = 10 * 60 * 1000; // 10 minutes
const pendingByChat = new Map(); // chatId -> { type, data, step, createdAt }

const clearPending = (chatId) => {
    pendingByChat.delete(String(chatId));
};

const getPending = (chatId) => {
    const key = String(chatId);
    const p = pendingByChat.get(key);
    if (!p) return null;
    if (Date.now() - p.createdAt > PENDING_TTL_MS) {
        pendingByChat.delete(key);
        return null;
    }
    return p;
};

const setPending = (chatId, pending) => {
    pendingByChat.set(String(chatId), { ...pending, createdAt: Date.now() });
};

// Date Helper - Parse date from text like "12 числа" or "31число"
const parseDate = (text) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 1) Явный паттерн "12 числа/число/го/е/th" — берём ПОСЛЕДНЕЕ вхождение (обычно день в конце)
    const explicitMatches = [...text.matchAll(/(\d{1,2})\s*(?:числа|число|го|е|th)\b/gi)];
    if (explicitMatches.length > 0) {
        const last = explicitMatches[explicitMatches.length - 1];
        const day = parseInt(last[1], 10);
        if (day >= 1 && day <= 31) {
            const year = now.getFullYear();
            const month = now.getMonth();
            let paymentDate = new Date(year, month, day);
            if (paymentDate < now) {
                paymentDate = new Date(year, month + 1, day);
            }
            return {
                date: paymentDate.toISOString(),
                cycle: `Каждый ${day} числа`
            };
        }
    }

    // 2) Любое "1–2 цифры как отдельный день" — игнорируем длинные суммы (>=100), берём ПОСЛЕДНЮЮ
    const genericMatches = [...text.matchAll(/(^|[^\d])(\d{1,2})(?!\d)/g)];
    if (genericMatches.length > 0) {
        const candidates = genericMatches
            .map(m => parseInt(m[2], 10))
            .filter(d => d >= 1 && d <= 31);
        if (candidates.length > 0) {
            const day = candidates[candidates.length - 1];
            const year = now.getFullYear();
            const month = now.getMonth();
            let paymentDate = new Date(year, month, day);
            if (paymentDate < now) {
                paymentDate = new Date(year, month + 1, day);
            }
            return {
                date: paymentDate.toISOString(),
                cycle: `Каждый ${day} числа`
            };
        }
    }

    // 3) По умолчанию — следующий месяц, 1 число
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
        date: nextMonth.toISOString(),
        cycle: 'Каждый 1 числа'
    };
};

// Enhanced date parser: “17 февраля”, “17.02”, “завтра”, “через 3 дня”
const parseDateEnhanced = (rawText) => {
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

    // dd.mm[.yyyy] or dd/mm[/yyyy]
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

    // “17 февраля” / “17 фев”
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

    // fallback
    return parseDate(text);
};

const detectBillingPeriod = (rawText) => {
    const t = normalizeText(rawText).toLowerCase();
    if (/\b(год|годовая|ежегодно|раз в год|annual|yearly)\b/.test(t)) return 'yearly';
    return 'monthly';
};

// Date parser for expenses/incomes (RU/EN/KO relative + numeric + RU months)
const parseTransactionDate = (rawText) => {
    const t = normalizeText(rawText).toLowerCase();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (/\b(сегодня|today|오늘)\b/.test(t)) return new Date(now).toISOString();
    if (/\b(вчера|yesterday|어제)\b/.test(t)) {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return d.toISOString();
    }
    if (/\b(завтра|tomorrow|내일)\b/.test(t)) {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        return d.toISOString();
    }
    if (/\b(послезавтра|day\s*after\s*tomorrow|모레)\b/.test(t)) {
        const d = new Date(now);
        d.setDate(d.getDate() + 2);
        return d.toISOString();
    }

    const dm = t.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/);
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
        if (!isNaN(d.getTime())) return d.toISOString();
    }

    const monthMap = {
        янв: 0, фев: 1, мар: 2, апр: 3, май: 4, июн: 5, июл: 6, авг: 7, сен: 8, окт: 9, ноя: 10, дек: 11
    };
    const m = t.match(/\b(\d{1,2})\s+(янв(?:ар[ья])?|фев(?:рал[ья])?|мар(?:т[а])?|апр(?:ел[ья])?|ма[йя]|июн(?:[ья])?|июл(?:[ья])?|авг(?:уст[а])?|сен(?:тябр[ья])?|окт(?:ябр[ья])?|ноя(?:бр[ья])?|дек(?:ябр[ья])?)\b/);
    if (m) {
        const day = parseInt(m[1], 10);
        const token = m[2].slice(0, 3);
        const month = monthMap[token];
        if (month !== undefined) {
            const d = new Date(now.getFullYear(), month, day);
            if (!isNaN(d.getTime())) return d.toISOString();
        }
    }

    const dayOnly = t.match(/\b(\d{1,2})\s*(числа|число|го|е)\b/);
    if (dayOnly) {
        const day = parseInt(dayOnly[1], 10);
        if (day >= 1 && day <= 31) {
            const d = new Date(now.getFullYear(), now.getMonth(), day);
            if (!isNaN(d.getTime())) return d.toISOString();
        }
    }

    return new Date(now).toISOString();
};

const extractTitleGeneric = (rawText) => {
    const normalized = normalizeText(rawText);
    const lower = normalized.toLowerCase();

    const stop = new Set([
        // RU verbs/labels
        'добавь', 'добавить', 'создай', 'запиши', 'оформи', 'подключи',
        'расход', 'расходы', 'трата', 'траты', 'потратил', 'потратила', 'купил', 'купила',
        'доход', 'доходы', 'прибыль', 'прибыл', 'заработал', 'заработала', 'получил', 'получила',
        'подписка', 'подписки', 'подписку',
        // EN
        'add', 'create', 'save', 'record', 'expense', 'spent', 'spend', 'income', 'earned', 'subscription', 'sub',
        // KO (minimal)
        '추가', '등록', '지출', '수입', '구독', '매달', '월급', '결제', '사용', '썼어',
        // Prepositions / misc
        'на', 'за', 'в', 'for', 'on', 'at',
        // Date words
        'сегодня', 'вчера', 'завтра', 'послезавтра', 'через', 'today', 'yesterday', 'tomorrow', '오늘', '어제', '내일', '모레',
        'числа', 'число', 'го', 'е', 'th',
        // Currency tokens
        '₩', '₽', '₸', '$', '€',
        'won', 'krw', 'rub', 'usd', 'kzt', 'eur',
        'руб', 'руб.', 'рубль', 'рубля', 'рублей',
        'доллар', 'доллара', 'долларов', 'бакс', 'баксов',
        'тенге', 'тенг', 'тг',
        'вон', 'вона', 'воны',
        '원', '만원', '천원',
        // Category labels
        'категория', 'категории', 'категорию', 'кат', 'category', '카테고리', '분류'
    ]);

    const tokens = lower.split(/\s+/g).filter(Boolean);
    const category = extractCategory(rawText, detectLanguage(rawText));
    const categoryLower = category ? category.toLowerCase().trim() : null;
    const categoryTokens = categoryLower ? categoryLower.split(/\s+/g).filter(Boolean) : [];
    const out = [];

    for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        
        // Skip category label tokens
        if (stop.has(tok) && (tok === 'категория' || tok === 'category' || tok === '카테고리' || tok === '분류' || tok === 'кат')) {
            // Skip the category label and the next token(s) that match the category value
            continue;
        }
        
        // Skip tokens that match the category value (handle multi-word categories)
        if (categoryTokens.length > 0) {
            let matchesCategory = false;
            // Check if current token starts a sequence matching category tokens
            for (let j = 0; j < categoryTokens.length && i + j < tokens.length; j++) {
                if (tokens[i + j] === categoryTokens[j]) {
                    if (j === categoryTokens.length - 1) {
                        matchesCategory = true;
                        // Skip all tokens in this category sequence
                        i += j;
                        break;
                    }
                } else {
                    break;
                }
            }
            if (matchesCategory) continue;
        }

        // Drop pure numbers
        if (/^\d+(?:[.,]\d+)?$/.test(tok)) continue;

        // If token mixes digits+letters like "6000вон" -> strip digits -> "вон"
        if (/\d/.test(tok) && /[a-zа-яё가-힣]/i.test(tok)) {
            tok = tok.replace(/[\d.,]+/g, '');
        }

        // Remove leftover currency symbols attached
        tok = tok.replace(/[₽₩₸$€]/g, '');
        tok = tok.trim();
        if (!tok) continue;
        // If it became a pure number after stripping symbols, drop it
        if (/^\d+(?:[.,]\d+)?$/.test(tok)) continue;
        if (stop.has(tok)) continue;

        // Very short noise after stripping (e.g. single-letter tokens)
        if (tok.length < 2) continue;

        out.push(tok);
    }

    const title = out.join(' ').trim();
    if (!title || title.length < 2) return '';
    return title.length > 120 ? title.slice(0, 120) : title;
};

// Extract category from phrases like:
// "категория Купанг", "category Food", "카테고리 쇼핑"
const extractCategory = (rawText, lang) => {
    const text = normalizeText(rawText);
    const lower = text.toLowerCase();

    // Simple patterns per language - match anywhere, prefer last match
    const patterns = [
        // RU
        /\bкатегор(?:ия|ии|ию|ией)?\s+([^\d.,;]+?)(?:\s|$)/gi,
        // EN
        /\bcategory\s+([^\d.,;]+?)(?:\s|$)/gi,
        // Short RU alias
        /\bкат\s+([^\d.,;]+?)(?:\s|$)/gi,
        // KO
        /(카테고리|분류)\s+([^\d.,;]+?)(?:\s|$)/gi
    ];

    let matchText = null;
    for (const re of patterns) {
        const matches = [...text.matchAll(re)];
        if (matches.length > 0) {
            // Take the last match (usually at the end of phrase)
            const lastMatch = matches[matches.length - 1];
            // Last capturing group is the value
            matchText = lastMatch[lastMatch.length - 1];
        }
    }

    if (!matchText) return null;

    let cat = matchText.trim();
    // Remove extra spaces and trailing service words
    cat = cat.replace(/\s+/g, ' ');

    // Normalize case: first letter upper, rest as is
    if (cat.length === 0) return null;

    // For non-latin, just trim; for latin, capitalize first
    if (/^[a-z]/i.test(cat[0])) {
        cat = cat[0].toUpperCase() + cat.slice(1);
    }

    return cat;
};

const extractSlotsV2 = (rawText, intentInfo) => {
    const normalized = normalizeText(rawText);
    const lang = intentInfo?.lang || detectLanguage(rawText);
    const intent = intentInfo?.intent || 'unknown';

    const { code, symbol } = detectCurrency(normalized);
    const amount = intent === 'subscription_add' ? extractSubscriptionCost(normalized) : extractCost(normalized);

    const billingPeriod = detectBillingPeriod(normalized);
    const subscriptionDate = parseDateEnhanced(normalized);
    const txDate = parseTransactionDate(normalized);
    const title = extractTitleGeneric(normalized);
    const category = extractCategory(rawText, lang);

    return {
        lang,
        intent,
        amount,
        currencyCode: code || 'WON',
        currencySymbol: symbol || '₩',
        billingPeriod,
        subscription: {
            nextPaymentDate: subscriptionDate?.date,
            cycle: subscriptionDate?.cycle
        },
        transaction: {
            at: txDate
        },
        title,
        category
    };
};

const extractCost = (rawText) => {
    const text = normalizeText(rawText);
    // Prefer continuous digits first (handles "6000вон", "5000₩", etc.)
    const m = text.match(/(\d+(?:[.,]\d+)?|\d{1,3}(?:[ \u00A0]\d{3})*(?:[.,]\d+)?)/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/\s|\u00A0/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};

// For subscriptions it is common to сначала назвать день, потом сумму:
// «Добавь подписку KT 15 числа 12000 рублей»
// Здесь первая цифра = день, а реальная стоимость = последняя цифра рядом с валютой.
const extractSubscriptionCost = (rawText) => {
    const text = normalizeText(rawText);
    // Prefer continuous digits first (handles "5000вон", "6000₩" etc.)
    const numberRegex = /(\d+(?:[.,]\d+)?|\d{1,3}(?:[ \u00A0]\d{3})*(?:[.,]\d+)?)/g;
    const currencyRegex = /(₽|₩|₸|\$|\b(rub|usd|kzt|krw|won|руб(ль|ля|лей)?|доллар(а|ов)?|бакс(ов)?|тенге|тенг|тг|вон(а|ы)?)\b)/i;

    const matches = [];
    let m;
    while ((m = numberRegex.exec(text)) !== null) {
        matches.push({ value: m[1], index: m.index });
    }
    if (!matches.length) return null;

    // Ищем число, возле которого есть валюта (чаще всего это и есть стоимость)
    for (let i = matches.length - 1; i >= 0; i--) {
        const { value, index } = matches[i];
        const windowAfter = text.slice(index + value.length, index + value.length + 12);
        if (currencyRegex.test(windowAfter)) {
            const n = parseFloat(value.replace(/\s|\u00A0/g, '').replace(',', '.'));
            return Number.isFinite(n) ? n : null;
        }
    }

    // fallback: берём последнее число как стоимость
    const last = matches[matches.length - 1].value;
    const n = parseFloat(last.replace(/\s|\u00A0/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};

// Function to download audio file from Telegram
const downloadAudioFile = async (fileId) => {
    try {
        const file = await bot.getFile(fileId);
        const filePath = file.file_path;
        const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
        
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const localFilePath = path.join(tempDir, `${fileId}.ogg`);
        
        return new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(localFilePath);
            https.get(url, (response) => {
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(localFilePath);
                });
            }).on('error', (err) => {
                fs.unlinkSync(localFilePath).catch(() => {});
                reject(err);
            });
        });
    } catch (error) {
        console.error('[BOT] Error downloading audio file:', error);
        throw error;
    }
};

// Function to transcribe audio using OpenAI Whisper API
const transcribeAudio = async (audioFilePath) => {
    if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY is not set. Please set it in environment variables.');
    }

    try {
        const FormData = (await import('form-data')).default;
        const form = new FormData();
        
        // Get filename with proper extension
        const fileName = path.basename(audioFilePath);
        
        // Read file as buffer
        const audioBuffer = fs.readFileSync(audioFilePath);
        
        // OpenAI Whisper requires filename with extension
        // Telegram sends .ogg files, which OpenAI supports
        form.append('file', audioBuffer, {
            filename: fileName,
            contentType: 'audio/ogg',
            knownLength: audioBuffer.length
        });
        form.append('model', 'whisper-1');
        form.append('language', 'ru'); // Russian language

        console.log(`[BOT] Sending audio file to OpenAI: ${fileName} (${audioBuffer.length} bytes)`);

        // Use https module directly instead of fetch for better form-data compatibility
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.openai.com',
                path: '/v1/audio/transcriptions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    ...form.getHeaders()
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        console.error(`[BOT] OpenAI API error response: ${responseData}`);
                        reject(new Error(`OpenAI API error: ${res.statusCode} - ${responseData}`));
                        return;
                    }

                    try {
                        const result = JSON.parse(responseData);
                        resolve(result.text);
                    } catch (parseError) {
                        console.error('[BOT] Error parsing OpenAI response:', parseError);
                        reject(new Error('Failed to parse OpenAI response'));
                    }
                });
            });

            req.on('error', (error) => {
                console.error('[BOT] Request error:', error);
                reject(error);
            });

            // Pipe form data to request
            form.pipe(req);
            
            // Handle form errors
            form.on('error', (error) => {
                console.error('[BOT] Form data error:', error);
                reject(error);
            });
        });
    } catch (error) {
        console.error('[BOT] Error transcribing audio:', error);
        throw error;
    }
};

// Common function to process text commands (extracted from message handler)
const processTextCommand = async (chatId, text) => {
    const rawText = String(text || '');
    const normalized = normalizeText(rawText);
    const intentInfo = detectIntentV2(normalized);
    const intent = intentInfo.intent;
    const slots = extractSlotsV2(normalized, intentInfo);

    // Ensure user document exists when they interact
    await ensureUserExists(chatId);

    // Global cancel (works during any pending flow)
    if (intent === 'cancel' || /\b(отмена|cancel|стоп|stop)\b/i.test(normalized) || /^\/cancel\b/i.test(rawText)) {
        clearPending(chatId);
        bot.sendMessage(chatId, 'Окей, отменил. Если захотите — начнём заново 🙂');
        return;
    }

    // If we are in a follow-up flow, handle it BEFORE intent routing
    const pending = getPending(chatId);
    if (pending) {
        // allow user to ask help anytime
        if (intent === 'help' || intent === 'start') {
            bot.sendMessage(chatId, buildHelpMessage());
            return;
        }

        if (pending.type === 'clarify_add_type') {
            const answer = normalized.toLowerCase().trim();
            const idx = parseInt(answer, 10);
            const choice = !isNaN(idx) ? idx : null;
            const looksExpense = /\b(расход|трата|expense|spent|지출)\b/i.test(answer) || choice === 1;
            const looksIncome = /\b(доход|income|earned|수입)\b/i.test(answer) || choice === 2;
            const looksSub = /\b(подписк|subscription|구독)\b/i.test(answer) || choice === 3;

            const originalText = pending.data?.rawText || '';
            if (!originalText) {
                clearPending(chatId);
                bot.sendMessage(chatId, buildHelpMessage());
                return;
            }

            if (!looksExpense && !looksIncome && !looksSub) {
                bot.sendMessage(chatId, 'Не понял выбор. Ответьте: 1 (расход), 2 (доход) или 3 (подписка).');
                return;
            }

            const baseIntentInfo = detectIntentV2(originalText);
            const baseSlots = extractSlotsV2(originalText, baseIntentInfo);
            const amount = baseSlots.amount;
            const title = baseSlots.title;

            if (!title || title.length < 2) {
                clearPending(chatId);
                bot.sendMessage(chatId, 'Не вижу название 😅 Напишите, пожалуйста, что именно: например «кофе» или «Netflix».');
                return;
            }
            if (amount === null) {
                clearPending(chatId);
                bot.sendMessage(chatId, 'Не вижу сумму 😅 Напишите число, например: «6000₩» или «5$».');
                return;
            }

            try {
                const userDocRef = db.collection('users').doc(String(chatId));

                if (looksExpense) {
                    const expenseData = {
                        title,
                        amount,
                        currency: baseSlots.currencyCode || 'WON',
                        currencySymbol: baseSlots.currencySymbol || '₩',
                        spentAt: baseSlots.transaction?.at,
                        category: baseSlots.category || 'Общие',
                        color: '#a78bfa',
                        note: '',
                        icon: String(title || '?')[0].toUpperCase(),
                        iconUrl: null,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    };
                    await userDocRef.collection('expenses').add(expenseData);
                    clearPending(chatId);
                    const dateStr = expenseData.spentAt ? new Date(expenseData.spentAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—';
                    bot.sendMessage(chatId, `✅ Готово! Добавил расход "${title}" на сумму ${expenseData.currencySymbol}${Number(amount).toLocaleString()}.\nДата: ${dateStr}. 😊`);
                    return;
                }

                if (looksIncome) {
                    const incomeData = {
                        title,
                        amount,
                        currency: baseSlots.currencyCode || 'WON',
                        currencySymbol: baseSlots.currencySymbol || '₩',
                        receivedAt: baseSlots.transaction?.at,
                        category: baseSlots.category || 'Общие',
                        color: '#22C55E',
                        note: '',
                        icon: String(title || '?')[0].toUpperCase(),
                        iconUrl: null,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    };
                    await userDocRef.collection('incomes').add(incomeData);
                    clearPending(chatId);
                    const dateStr = incomeData.receivedAt ? new Date(incomeData.receivedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—';
                    bot.sendMessage(chatId, `✅ Готово! Добавил доход "${title}" на сумму ${incomeData.currencySymbol}${Number(amount).toLocaleString()}.\nДата: ${dateStr}. 😊`);
                    return;
                }

                const subscriptionData = {
                    name: title,
                    cost: amount,
                    currency: baseSlots.currencyCode || 'WON',
                    currencySymbol: baseSlots.currencySymbol || '₩',
                    billingPeriod: baseSlots.billingPeriod || 'monthly',
                    cycle: baseSlots.subscription?.cycle || 'Каждый 1 числа',
                    nextPaymentDate: baseSlots.subscription?.nextPaymentDate,
                    category: baseSlots.category || 'Общие',
                    color: '#a78bfa',
                    icon: String(title || '?')[0].toUpperCase(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };
                await userDocRef.collection('subscriptions').add(subscriptionData);
                clearPending(chatId);
                const dateStr = subscriptionData.nextPaymentDate
                    ? new Date(subscriptionData.nextPaymentDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
                    : '—';
                bot.sendMessage(chatId, `✅ Готово! Добавил подписку "${subscriptionData.name}" на сумму ${subscriptionData.currencySymbol}${Number(subscriptionData.cost).toLocaleString()}.\nСледующий платеж: ${dateStr}. 😊`);
                return;
            } catch (e) {
                console.error('[BOT] clarify_add_type finalize error:', e);
                clearPending(chatId);
                bot.sendMessage(chatId, '😔 Не получилось сохранить. Попробуйте, пожалуйста, ещё раз чуть позже.');
                return;
            }
        }

        if (pending.type === 'add') {
            const current = pending.data || {};

            if (pending.step === 'ask_name') {
                const name = normalized.trim();
                if (!name || name.length < 2) {
                    bot.sendMessage(chatId, 'Название должно быть хотя бы 2 символа 🙂 Как называется сервис?');
                    return;
                }
                current.name = name;
                // next ask cost
                setPending(chatId, { type: 'add', step: 'ask_cost', data: current });
                bot.sendMessage(chatId, `Окей, *${current.name}*. А какая стоимость? Например: «1000 тг».`, { parse_mode: 'Markdown' });
                return;
            }

            if (pending.step === 'ask_cost') {
                const cost = extractCost(normalized);
                if (cost === null) {
                    bot.sendMessage(chatId, 'Не увидел сумму 😅 Напишите число, например: «1000 тг» или «5$».');
                    return;
                }
                const { code, symbol } = detectCurrency(normalized);
                current.cost = cost;
                current.currency = code;
                current.currencySymbol = symbol;
                // ask date (optional)
                setPending(chatId, { type: 'add', step: 'ask_date', data: current });
                bot.sendMessage(
                    chatId,
                    'Когда следующий платеж?\nНапример: «12 числа», «17 февраля», «завтра», «17.02».\nЕсли дата не важна — напишите «пропустить».'
                );
                return;
            }

            if (pending.step === 'ask_date') {
                if (/\b(пропусти|пропустить|skip)\b/i.test(normalized)) {
                    // default: use legacy default (next month 1st)
                    const { date, cycle } = parseDateEnhanced(''); // fallback
                    current.nextPaymentDate = date;
                    current.cycle = cycle;
                } else {
                    const { date, cycle } = parseDateEnhanced(normalized);
                    current.nextPaymentDate = date;
                    current.cycle = cycle;
                }

                // finalize add
                try {
                    const billingPeriod = detectBillingPeriod(normalized);
                    const userDocRef = db.collection('users').doc(String(chatId));
                    const subscriptionData = {
                        name: current.name,
                        cost: current.cost,
                        currency: current.currency || 'WON',
                        currencySymbol: current.currencySymbol || '₩',
                        billingPeriod,
                        cycle: current.cycle || 'Каждый 1 числа',
                        nextPaymentDate: current.nextPaymentDate,
                        category: 'Общие',
                        color: '#a78bfa',
                        icon: String(current.name || '?')[0].toUpperCase(),
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    };

                    if (!subscriptionData.name || subscriptionData.name.length > 100) {
                        bot.sendMessage(chatId, 'Название слишком длинное 😅 Давайте короче (до 100 символов).');
                        return;
                    }
                    if (isNaN(subscriptionData.cost) || subscriptionData.cost < 0 || subscriptionData.cost > 1000000000) {
                        bot.sendMessage(chatId, 'Стоимость некорректная. Можно число от 0 до 1,000,000,000 🙂');
                        return;
                    }

                    await userDocRef.collection('subscriptions').add(subscriptionData);
                    clearPending(chatId);

                    const dateStr = subscriptionData.nextPaymentDate
                        ? new Date(subscriptionData.nextPaymentDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
                        : '—';
                    bot.sendMessage(
                        chatId,
                        `✅ Готово! Добавил подписку "${subscriptionData.name}" на сумму ${subscriptionData.currencySymbol}${Number(subscriptionData.cost).toLocaleString()}.\nСледующий платеж: ${dateStr}. 😊`
                    );
                    return;
                } catch (e) {
                    console.error('[BOT] Pending add finalize error:', e);
                    clearPending(chatId);
                    bot.sendMessage(chatId, '😔 Не получилось сохранить подписку. Попробуйте, пожалуйста, ещё раз чуть позже.');
                    return;
                }
            }
        }

        if (pending.type === 'remove') {
            const options = pending.data?.options || [];
            const answer = normalized.trim();
            // allow “1”, “2”, or exact name
            const idx = parseInt(answer, 10);
            let chosen = null;
            if (!isNaN(idx) && idx >= 1 && idx <= options.length) {
                chosen = options[idx - 1];
            } else {
                chosen = options.find(o => String(o.name || '').toLowerCase() === answer.toLowerCase()) || null;
            }
            if (!chosen) {
                bot.sendMessage(chatId, 'Не понял выбор. Напишите номер (например 1) или точное название из списка.');
                return;
            }
            try {
                await chosen.ref.delete();
                clearPending(chatId);
                bot.sendMessage(chatId, `✅ Готово! Подписка "${chosen.name}" удалена. 😊`);
                return;
            } catch (e) {
                console.error('[BOT] Pending remove error:', e);
                clearPending(chatId);
                bot.sendMessage(chatId, '😔 Не получилось удалить подписку. Попробуйте позже.');
                return;
            }
        }

        if (pending.type === 'expense_remove') {
            const options = pending.data?.options || [];
            const answer = normalized.trim();
            const idx = parseInt(answer, 10);
            let chosen = null;
            if (!isNaN(idx) && idx >= 1 && idx <= options.length) {
                chosen = options[idx - 1];
            } else {
                chosen = options.find(o => String(o.name || '').toLowerCase() === answer.toLowerCase()) || null;
            }
            if (!chosen) {
                bot.sendMessage(chatId, 'Не понял выбор. Напишите номер (например 1) или точное название из списка.');
                return;
            }
            try {
                await chosen.ref.delete();
                clearPending(chatId);
                bot.sendMessage(chatId, `✅ Готово! Расход "${chosen.name}" удалён. 😊`);
                return;
            } catch (e) {
                console.error('[BOT] Pending expense remove error:', e);
                clearPending(chatId);
                bot.sendMessage(chatId, '😔 Не получилось удалить расход. Попробуйте позже.');
                return;
            }
        }

        if (pending.type === 'income_remove') {
            const options = pending.data?.options || [];
            const answer = normalized.trim();
            const idx = parseInt(answer, 10);
            let chosen = null;
            if (!isNaN(idx) && idx >= 1 && idx <= options.length) {
                chosen = options[idx - 1];
            } else {
                chosen = options.find(o => String(o.name || '').toLowerCase() === answer.toLowerCase()) || null;
            }
            if (!chosen) {
                bot.sendMessage(chatId, 'Не понял выбор. Напишите номер (например 1) или точное название из списка.');
                return;
            }
            try {
                await chosen.ref.delete();
                clearPending(chatId);
                bot.sendMessage(chatId, `✅ Готово! Доход "${chosen.name}" удалён. 😊`);
                return;
            } catch (e) {
                console.error('[BOT] Pending income remove error:', e);
                clearPending(chatId);
                bot.sendMessage(chatId, '😔 Не получилось удалить доход. Попробуйте позже.');
                return;
            }
        }
    }

    // HELP / START / GREET
    if (intent === 'start' || intent === 'help') {
        bot.sendMessage(chatId, intent === 'start' ? buildWelcomeMessage() : buildHelpMessage());
        return;
    }
    if (intent === 'greet') {
        bot.sendMessage(chatId, `Здравствуйте! 👋 Рад вас видеть.\n\n${buildHelpMessage()}`);
        return;
    }

    // LIST (more phrases handled by detectIntent)
    if (intent === 'subscription_list') {
        try {
            const snapshot = await db.collection('users').doc(String(chatId)).collection('subscriptions').get();
            if (snapshot.empty) {
                bot.sendMessage(chatId, '📭 Похоже, у вас пока нет подписок.\nХотите добавить первую? Напишите: «Добавь Netflix 10000 вон 12 числа» 🙂');
                return;
            }

            let response = '📋 *Ваши подписки:*\n\n';
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const sym = data.currencySymbol || '₩';
                response += `• *${data.name}*: ${sym}${Number(data.cost || 0).toLocaleString()}\n`;
            });
            bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
            return;
        } catch (e) {
            console.error('[BOT] List error:', e);
            bot.sendMessage(chatId, '😔 Извините, не удалось получить список подписок. Попробуйте позже. 🙏');
            return;
        }
    }

    // EXPENSE LIST
    if (intent === 'expense_list') {
        try {
            const snapshot = await db.collection('users').doc(String(chatId)).collection('expenses').get();
            if (snapshot.empty) {
                bot.sendMessage(chatId, '📭 Похоже, у вас пока нет расходов.\nНапишите: «Расход 12000 вон кафе сегодня» 🙂');
                return;
            }

            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), _ref: d.ref }));
            items.sort((a, b) => {
                const aTime = a.spentAt ? new Date(a.spentAt).getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
                const bTime = b.spentAt ? new Date(b.spentAt).getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
                return bTime - aTime;
            });

            let response = '🧾 *Ваши расходы (последние):*\n\n';
            items.slice(0, 15).forEach((e) => {
                const sym = e.currencySymbol || '₩';
                const amount = Number(e.amount || 0);
                const dateStr = e.spentAt ? new Date(e.spentAt).toLocaleDateString('ru-RU') : '';
                response += `• *${e.title || 'Расход'}*: ${sym}${amount.toLocaleString()}${dateStr ? ` — ${dateStr}` : ''}\n`;
            });
            bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
            return;
        } catch (e) {
            console.error('[BOT] Expense list error:', e);
            bot.sendMessage(chatId, '😔 Не удалось получить список расходов. Попробуйте позже. 🙏');
            return;
        }
    }

    // INCOME LIST
    if (intent === 'income_list') {
        try {
            const snapshot = await db.collection('users').doc(String(chatId)).collection('incomes').get();
            if (snapshot.empty) {
                bot.sendMessage(chatId, '📭 Похоже, у вас пока нет доходов.\nНапишите: «Доход 500000₩ зарплата сегодня» 🙂');
                return;
            }

            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), _ref: d.ref }));
            items.sort((a, b) => {
                const aTime = a.receivedAt ? new Date(a.receivedAt).getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
                const bTime = b.receivedAt ? new Date(b.receivedAt).getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
                return bTime - aTime;
            });

            let response = '💰 *Ваши доходы (последние):*\n\n';
            items.slice(0, 15).forEach((e) => {
                const sym = e.currencySymbol || '₩';
                const amount = Number(e.amount || 0);
                const dateStr = e.receivedAt ? new Date(e.receivedAt).toLocaleDateString('ru-RU') : '';
                response += `• *${e.title || 'Доход'}*: ${sym}${amount.toLocaleString()}${dateStr ? ` — ${dateStr}` : ''}\n`;
            });
            bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
            return;
        } catch (e) {
            console.error('[BOT] Income list error:', e);
            bot.sendMessage(chatId, '😔 Не удалось получить список доходов. Попробуйте позже. 🙏');
            return;
        }
    }

    // EXPENSE ADD
    if (intent === 'expense_add') {
        const amount = slots.amount;
        const spentAt = slots.transaction?.at;
        const title = slots.title;

        if (!title || title.length < 2) {
            bot.sendMessage(chatId, 'Как назвать расход? Например: «Расход 12000 вон кафе сегодня». 🙂');
            return;
        }
        if (amount === null) {
            bot.sendMessage(chatId, `Окей, *${title}*. А какая сумма? Например: «5000₩» или «1000 тг».`, { parse_mode: 'Markdown' });
            return;
        }

        try {
            const userDocRef = db.collection('users').doc(String(chatId));
            const expenseData = {
                title,
                amount,
                currency: slots.currencyCode || 'WON',
                currencySymbol: slots.currencySymbol || '₩',
                spentAt,
                category: slots.category || 'Общие',
                color: '#a78bfa',
                note: '',
                icon: String(title || '?')[0].toUpperCase(),
                iconUrl: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (title.length > 100) {
                bot.sendMessage(chatId, 'Название слишком длинное 😅 Давайте короче (до 100 символов).');
                return;
            }
            if (isNaN(amount) || amount < 0 || amount > 1000000000) {
                bot.sendMessage(chatId, 'Сумма некорректная. Можно число от 0 до 1,000,000,000 🙂');
                return;
            }

            await userDocRef.collection('expenses').add(expenseData);
            const dateStr = spentAt ? new Date(spentAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—';
            bot.sendMessage(chatId, `✅ Готово! Добавил расход "${title}" на сумму ${expenseData.currencySymbol}${Number(amount).toLocaleString()}.\nДата: ${dateStr}. 😊`);
            return;
        } catch (e) {
            console.error('[BOT] Error adding expense:', e);
            bot.sendMessage(chatId, '😔 Не получилось добавить расход. Попробуйте, пожалуйста, ещё раз чуть позже.');
            return;
        }
    }

    // INCOME ADD
    if (intent === 'income_add') {
        const amount = slots.amount;
        const receivedAt = slots.transaction?.at;
        const title = slots.title;

        if (!title || title.length < 2) {
            bot.sendMessage(chatId, 'Как назвать доход? Например: «Доход 500000₩ зарплата сегодня». 🙂');
            return;
        }
        if (amount === null) {
            bot.sendMessage(chatId, `Окей, *${title}*. А какая сумма? Например: «5000₩» или «1000 тг».`, { parse_mode: 'Markdown' });
            return;
        }

        try {
            const userDocRef = db.collection('users').doc(String(chatId));
            const incomeData = {
                title,
                amount,
                currency: slots.currencyCode || 'WON',
                currencySymbol: slots.currencySymbol || '₩',
                receivedAt,
                category: slots.category || 'Общие',
                color: '#22C55E',
                note: '',
                icon: String(title || '?')[0].toUpperCase(),
                iconUrl: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (title.length > 100) {
                bot.sendMessage(chatId, 'Название слишком длинное 😅 Давайте короче (до 100 символов).');
                return;
            }
            if (isNaN(amount) || amount < 0 || amount > 1000000000) {
                bot.sendMessage(chatId, 'Сумма некорректная. Можно число от 0 до 1,000,000,000 🙂');
                return;
            }

            await userDocRef.collection('incomes').add(incomeData);
            const dateStr = receivedAt ? new Date(receivedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—';
            bot.sendMessage(chatId, `✅ Готово! Добавил доход "${title}" на сумму ${incomeData.currencySymbol}${Number(amount).toLocaleString()}.\nДата: ${dateStr}. 😊`);
            return;
        } catch (e) {
            console.error('[BOT] Error adding income:', e);
            bot.sendMessage(chatId, '😔 Не получилось добавить доход. Попробуйте, пожалуйста, ещё раз чуть позже.');
            return;
        }
    }

    // ADD (robust parsing, supports different word order)
    if (intent === 'subscription_add' || intent === 'add') {
        const cost = slots.amount;
        const code = slots.currencyCode;
        const symbol = slots.currencySymbol;
        const billingPeriod = slots.billingPeriod;
        const { date, cycle } = parseDateEnhanced(normalized);
        const name = slots.title;

        if (!name || name.length < 2) {
            setPending(chatId, { type: 'add', step: 'ask_name', data: {} });
            bot.sendMessage(chatId, 'Подскажите, пожалуйста, *какой сервис* добавить? 🙂\nНапример: «Netflix».', { parse_mode: 'Markdown' });
            return;
        }
        if (cost === null) {
            setPending(chatId, { type: 'add', step: 'ask_cost', data: { name } });
            bot.sendMessage(chatId, `Окей, добавим *${name}* 🙂\nСкажите, пожалуйста, *стоимость* (например: «1000 тг» или «5$»).`, { parse_mode: 'Markdown' });
            return;
        }

        try {
            const userDocRef = db.collection('users').doc(String(chatId));
            const subscriptionData = {
                name,
                cost,
                currency: code,
                currencySymbol: symbol,
                billingPeriod,
                cycle: billingPeriod === 'yearly'
                    ? `Ежегодно${date ? `, ${new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}` : ''}`
                    : cycle,
                nextPaymentDate: date,
                category: slots.category || 'Общие',
                color: '#a78bfa',
                icon: name[0].toUpperCase(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (name.length > 100) {
                bot.sendMessage(chatId, 'Похоже, название слишком длинное 😅 Давайте короче (до 100 символов).');
                return;
            }
            if (isNaN(cost) || cost < 0 || cost > 1000000000) {
                bot.sendMessage(chatId, 'Похоже, стоимость некорректная. Можно число от 0 до 1,000,000,000 🙂');
                return;
            }

            console.log(`[BOT] ADD user=${chatId} name="${name}" cost=${cost} ${code}`);
            await userDocRef.collection('subscriptions').add(subscriptionData);

            const dateStr = date ? new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—';
            bot.sendMessage(chatId, `✅ Готово! Добавил подписку "${name}" на сумму ${symbol}${cost.toLocaleString()}.\nСледующий платеж: ${dateStr}. 😊`);
            return;
        } catch (e) {
            console.error('[BOT] Error adding subscription:', e);
            bot.sendMessage(chatId, '😔 Не получилось добавить подписку из‑за ошибки. Попробуйте, пожалуйста, ещё раз чуть позже.');
            return;
        }
    }

    // REMOVE (will be improved further, but already route here)
    if (intent === 'remove' || intent === 'subscription_remove') {
        const t = normalizeText(normalized);
        let nameToRemove = t.replace(/\b(удал(и|ить)|убери|сотри|отмени|remove|delete)\b/gi, ' ').trim();
        if (!nameToRemove) {
            bot.sendMessage(chatId, 'Какую подписку удалить? Напишите, например: «Удали Netflix». 🙂');
            return;
        }
        try {
            const col = db.collection('users').doc(String(chatId)).collection('subscriptions');
            const snapshot = await col.get();
            if (snapshot.empty) {
                bot.sendMessage(chatId, 'У вас пока нет подписок — удалять нечего 🙂');
                return;
            }

            const wanted = nameToRemove.toLowerCase();
            const matches = snapshot.docs
                .map(d => ({ ref: d.ref, data: d.data(), id: d.id }))
                .filter(({ data }) => {
                    const n = String(data.name || '').toLowerCase();
                    return n === wanted || n.includes(wanted) || wanted.includes(n);
                });

            if (matches.length === 0) {
                bot.sendMessage(chatId, `😔 Не нашёл подписку "${nameToRemove}".\nМогу показать список: напишите «Мои подписки».`);
                return;
            }
            if (matches.length > 1) {
                const list = matches.slice(0, 10).map((m, i) => `${i + 1}) ${m.data.name}`).join('\n');
                setPending(chatId, {
                    type: 'remove',
                    step: 'choose_one',
                    data: {
                        options: matches.slice(0, 10).map(m => ({ name: m.data.name, ref: m.ref }))
                    }
                });
                bot.sendMessage(chatId, `Нашёл несколько вариантов. Выберите номер:\n\n${list}\n\n(или напишите «отмена»)`);
                return;
            }

            await matches[0].ref.delete();
            bot.sendMessage(chatId, `✅ Готово! Подписка "${matches[0].data.name}" удалена. 😊`);
            return;
        } catch (e) {
            console.error('[BOT] Remove error:', e);
            bot.sendMessage(chatId, '😔 Извините, произошла ошибка при удалении подписки. Попробуйте еще раз позже. 🙏');
            return;
        }
    }

    // EXPENSE REMOVE
    if (intent === 'expense_remove') {
        const t = normalizeText(normalized);
        let titleToRemove = t
            .replace(/\b(удал(и|ить)|убери|сотри|отмени|remove|delete)\b/gi, ' ')
            .replace(/\b(расход|расходы|трата|траты)\b/gi, ' ')
            .trim();

        if (!titleToRemove) {
            bot.sendMessage(chatId, 'Какой расход удалить? Например: «Удали расход такси». 🙂');
            return;
        }

        try {
            const col = db.collection('users').doc(String(chatId)).collection('expenses');
            const snapshot = await col.get();
            if (snapshot.empty) {
                bot.sendMessage(chatId, 'У вас пока нет расходов — удалять нечего 🙂');
                return;
            }

            const wanted = titleToRemove.toLowerCase();
            const matches = snapshot.docs
                .map(d => ({ ref: d.ref, data: d.data(), id: d.id }))
                .filter(({ data }) => {
                    const n = String(data.title || '').toLowerCase();
                    return n === wanted || n.includes(wanted) || wanted.includes(n);
                });

            if (matches.length === 0) {
                bot.sendMessage(chatId, `😔 Не нашёл расход "${titleToRemove}".\nМогу показать список: напишите «Мои расходы».`);
                return;
            }
            if (matches.length > 1) {
                const list = matches.slice(0, 10).map((m, i) => `${i + 1}) ${m.data.title}`).join('\n');
                setPending(chatId, {
                    type: 'expense_remove',
                    step: 'choose_one',
                    data: {
                        options: matches.slice(0, 10).map(m => ({ name: m.data.title, ref: m.ref }))
                    }
                });
                bot.sendMessage(chatId, `Нашёл несколько вариантов. Выберите номер:\n\n${list}\n\n(или напишите «отмена»)`);
                return;
            }

            await matches[0].ref.delete();
            bot.sendMessage(chatId, `✅ Готово! Расход "${matches[0].data.title}" удалён. 😊`);
            return;
        } catch (e) {
            console.error('[BOT] Expense remove error:', e);
            bot.sendMessage(chatId, '😔 Извините, произошла ошибка при удалении расхода. Попробуйте еще раз позже. 🙏');
            return;
        }
    }

    // INCOME REMOVE
    if (intent === 'income_remove') {
        const t = normalizeText(normalized);
        let titleToRemove = t
            .replace(/\b(удал(и|ить)|убери|сотри|отмени|remove|delete)\b/gi, ' ')
            .replace(/\b(доход|доходы|прибыл(ь|и)|заработал|заработала|получил|получила)\b/gi, ' ')
            .trim();

        if (!titleToRemove) {
            bot.sendMessage(chatId, 'Какой доход удалить? Например: «Удали доход зарплата». 🙂');
            return;
        }

        try {
            const col = db.collection('users').doc(String(chatId)).collection('incomes');
            const snapshot = await col.get();
            if (snapshot.empty) {
                bot.sendMessage(chatId, 'У вас пока нет доходов — удалять нечего 🙂');
                return;
            }

            const wanted = titleToRemove.toLowerCase();
            const matches = snapshot.docs
                .map(d => ({ ref: d.ref, data: d.data(), id: d.id }))
                .filter(({ data }) => {
                    const n = String(data.title || '').toLowerCase();
                    return n === wanted || n.includes(wanted) || wanted.includes(n);
                });

            if (matches.length === 0) {
                bot.sendMessage(chatId, `😔 Не нашёл доход "${titleToRemove}".\nМогу показать список: напишите «Мои доходы».`);
                return;
            }
            if (matches.length > 1) {
                const list = matches.slice(0, 10).map((m, i) => `${i + 1}) ${m.data.title}`).join('\n');
                setPending(chatId, {
                    type: 'income_remove',
                    step: 'choose_one',
                    data: {
                        options: matches.slice(0, 10).map(m => ({ name: m.data.title, ref: m.ref }))
                    }
                });
                bot.sendMessage(chatId, `Нашёл несколько вариантов. Выберите номер:\n\n${list}\n\n(или напишите «отмена»)`);
                return;
            }

            await matches[0].ref.delete();
            bot.sendMessage(chatId, `✅ Готово! Доход "${matches[0].data.title}" удалён. 😊`);
            return;
        } catch (e) {
            console.error('[BOT] Income remove error:', e);
            bot.sendMessage(chatId, '😔 Извините, произошла ошибка при удалении дохода. Попробуйте еще раз позже. 🙏');
            return;
        }
    }

    if (intent === 'add_ambiguous') {
        const amount = slots.amount;
        const title = slots.title;
        if (!title || title.length < 2 || amount === null) {
            bot.sendMessage(chatId, `🤔 Я понял, что вы хотите что-то записать, но не вижу достаточно данных.\n\n${buildHelpMessage()}`);
            return;
        }

        setPending(chatId, {
            type: 'clarify_add_type',
            step: 'choose_type',
            data: { rawText: normalized }
        });

        bot.sendMessage(
            chatId,
            'Я понял данные, но не понял *тип операции*.\nВыберите:\n1) Расход\n2) Доход\n3) Подписка\n\nОтветьте цифрой (1/2/3).',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    // Default fallback
    bot.sendMessage(chatId, `🤔 Не понял, что именно сделать.\n\n${buildHelpMessage()}`);
};

// Helper function to ensure user document exists
const ensureUserExists = async (chatId) => {
    try {
        const userDocRef = db.collection('users').doc(String(chatId));
        const userDoc = await userDocRef.get();
        
        if (!userDoc.exists) {
            // Create user document with metadata
            await userDocRef.set({
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastSeen: admin.firestore.FieldValue.serverTimestamp(),
                telegramId: String(chatId)
            });
            console.log(`[BOT] Created user document for ${chatId}`);
        } else {
            // Update lastSeen timestamp
            await userDocRef.update({
                lastSeen: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error(`[BOT] Error ensuring user exists for ${chatId}:`, error);
    }
};

if (RUN_MODE === 'bot') {
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    // Ensure user document exists in Firebase
    await ensureUserExists(chatId);

    bot.sendMessage(chatId, buildWelcomeMessage());
});

// Privacy policy shortcut
bot.onText(/\/privacy/i, async (msg) => {
    const chatId = msg.chat.id;
    const shortRu =
        '🔒 Политика конфиденциальности (коротко):\n' +
        '• Мы храним ваш Telegram ID и данные подписок в Firebase.\n' +
        '• Голосовые (если включены) отправляются в OpenAI для распознавания команды.\n' +
        '• Запросы на удаление/вопросы: akzhaiyk@proton.me\n\n' +
        'Полный текст: PRIVACY_POLICY.md (в репозитории).';

    bot.sendMessage(chatId, shortRu);
});

// Admin command: /broadcast <message> - Send message to all users
bot.onText(/\/broadcast\s+(.+)/s, async (msg, match) => {
    const chatId = msg.chat.id;
    
    // Check if user is admin
    if (!isAdmin(chatId)) {
        bot.sendMessage(chatId, '❌ У вас нет прав для выполнения этой команды.');
        return;
    }
    
    const message = match[1].trim();
    
    if (!message) {
        bot.sendMessage(chatId, '❌ Пожалуйста, укажите сообщение для рассылки.\n\nПример: /broadcast Привет! Новая функция доступна! 🎉');
        return;
    }
    
    // Confirm before sending
    bot.sendMessage(chatId, `📢 Начинаю рассылку сообщения всем пользователям...\n\nСообщение:\n"${message}"`);
    
    try {
        const result = await broadcastToAllUsers(message, { parse_mode: 'Markdown' });
        
        bot.sendMessage(chatId, 
            `✅ Рассылка завершена!\n\n` +
            `✅ Отправлено: ${result.successCount} пользователям\n` +
            `❌ Ошибок: ${result.errorCount}\n\n` +
            (result.errors.length > 0 ? `Ошибки:\n${result.errors.slice(0, 5).map(e => `• ${e.userId}: ${e.error}`).join('\n')}` : '')
        );
    } catch (error) {
        console.error('[BROADCAST] Error in broadcast command:', error);
        bot.sendMessage(chatId, `❌ Ошибка при рассылке: ${error.message}`);
    }
});

// Voice message handler with speech recognition - MUST be registered BEFORE 'message' handler
bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    const voice = msg.voice;

    console.log(`[BOT] Voice message received from ${chatId}, file_id: ${voice.file_id}`);

    if (!openaiApiKey) {
        console.warn('[BOT] OPENAI_API_KEY not set, voice recognition disabled');
        bot.sendMessage(chatId, '😔 Извините, распознавание голоса временно недоступно. Пожалуйста, напишите текстом. 🙏');
        return;
    }

    // Cost control: ignore too long voice messages (prevents unexpected OpenAI spend)
    const maxVoiceSeconds = Number(process.env.MAX_VOICE_SECONDS || 60);
    if (voice?.duration && Number.isFinite(maxVoiceSeconds) && voice.duration > maxVoiceSeconds) {
        bot.sendMessage(
            chatId,
            `⏱️ Голосовое слишком длинное (${voice.duration} сек).\nПожалуйста, отправьте до ${maxVoiceSeconds} сек или напишите текстом.`
        );
        return;
    }

    let processingMsg = null;
    let audioFilePath = null;

    try {
        // Show user that bot is processing audio
        processingMsg = await bot.sendMessage(chatId, '🎤 Слушаю ваше сообщение... Пожалуйста, подождите немного! 😊');
        console.log(`[BOT] Processing voice message for user ${chatId}`);

        // Download audio file
        console.log(`[BOT] Downloading audio file ${voice.file_id}...`);
        audioFilePath = await downloadAudioFile(voice.file_id);
        console.log(`[BOT] Audio file downloaded to: ${audioFilePath}`);
        
        // Transcribe speech
        console.log(`[BOT] Transcribing audio with OpenAI Whisper...`);
        const transcribedText = await transcribeAudio(audioFilePath);
        // SECURITY: do not log user content, only log metadata
        console.log(`[BOT] Transcription ok (${String(transcribedText || '').length} chars)`);
        
        // Delete temporary file
        try {
            if (audioFilePath && fs.existsSync(audioFilePath)) {
                fs.unlinkSync(audioFilePath);
                console.log(`[BOT] Temp file deleted: ${audioFilePath}`);
            }
        } catch (unlinkError) {
            console.warn('[BOT] Error deleting temp file:', unlinkError);
        }

        // Delete processing message
        try {
            if (processingMsg) {
                await bot.deleteMessage(chatId, processingMsg.message_id);
            }
        } catch (deleteError) {
            console.warn('[BOT] Error deleting processing message:', deleteError);
        }

        if (!transcribedText || transcribedText.trim().length === 0) {
            bot.sendMessage(chatId, '😔 Извините, не удалось распознать речь. Пожалуйста, попробуйте записать сообщение еще раз или напишите текстом. 🎤');
            return;
        }

        // Send recognized text to user (don't send if transcription is the same as what we'll process)
        // bot.sendMessage(chatId, `📝 Распознано: "${transcribedText}"`, { reply_to_message_id: msg.message_id });

        // Process recognized text as regular text command
        await processTextCommand(chatId, transcribedText);
    } catch (error) {
        console.error('[BOT] Error processing voice message:', error);
        console.error('[BOT] Error stack:', error.stack);
        
        // Clean up temp file if it exists
        if (audioFilePath) {
            try {
                if (fs.existsSync(audioFilePath)) {
                    fs.unlinkSync(audioFilePath);
                }
            } catch (cleanupError) {
                console.warn('[BOT] Error cleaning up temp file:', cleanupError);
            }
        }

        // Send user-friendly error message
        const errorMessage = error.message || 'Неизвестная ошибка';
        bot.sendMessage(chatId, `😔 Извините, произошла ошибка при обработке голосового сообщения. Пожалуйста, попробуйте написать текстом или записать сообщение еще раз. 🙏`);
    }
});

// Handle text messages - registered AFTER voice handler
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Skip commands, voice messages, and other types
    if (!text || text.startsWith('/')) return;
    if (msg.voice) return; // Voice messages are handled separately

    await processTextCommand(chatId, text);
});

// Broadcast message to all users (for announcements about new features)
const broadcastToAllUsers = async (message, options = {}) => {
    try {
        console.log('[BROADCAST] Starting broadcast to all users...');
        const usersSnapshot = await db.collection('users').get();
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            try {
                await bot.sendMessage(userId, message, options);
                successCount++;
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                errorCount++;
                errors.push({ userId, error: error.message });
                
                // Log specific errors
                if (error.response && error.response.statusCode === 403) {
                    console.log(`[BROADCAST] User ${userId} blocked the bot`);
                } else {
                    console.error(`[BROADCAST] Error sending to user ${userId}:`, error.message);
                }
            }
        }
        
        console.log(`[BROADCAST] Completed: ${successCount} sent, ${errorCount} failed`);
        return { successCount, errorCount, errors };
    } catch (error) {
        console.error('[BROADCAST] Error in broadcast function:', error);
        throw error;
    }
};

// Notification system - check for upcoming payments
const checkUpcomingPayments = async () => {
    try {
        console.log('[NOTIFICATIONS] Checking for upcoming payments...');
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        
        // Get all users
        const usersSnapshot = await db.collection('users').get();
        let totalNotifications = 0;
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const subscriptionsSnapshot = await db.collection('users').doc(userId)
                .collection('subscriptions').get();
            
            const upcomingSubs = [];
            
            for (const subDoc of subscriptionsSnapshot.docs) {
                const subData = subDoc.data();
                if (!subData.nextPaymentDate) continue;
                
                // Parse nextPaymentDate (can be string or Timestamp)
                let paymentDate;
                if (subData.nextPaymentDate.toDate) {
                    paymentDate = subData.nextPaymentDate.toDate();
                } else {
                    paymentDate = new Date(subData.nextPaymentDate);
                }
                
                paymentDate.setHours(0, 0, 0, 0);
                
                // Check if payment is tomorrow (within 24 hours)
                if (paymentDate >= tomorrow && paymentDate < dayAfter) {
                    // Check if we already sent notification today
                    const lastNotification = subData.lastNotificationDate;
                    const today = new Date(now);
                    today.setHours(0, 0, 0, 0);
                    
                    let shouldNotify = true;
                    if (lastNotification) {
                        const lastNotifDate = lastNotification.toDate ? 
                            lastNotification.toDate() : new Date(lastNotification);
                        lastNotifDate.setHours(0, 0, 0, 0);
                        if (lastNotifDate.getTime() === today.getTime()) {
                            shouldNotify = false; // Already notified today
                        }
                    }
                    
                    if (shouldNotify) {
                        upcomingSubs.push({
                            id: subDoc.id,
                            ...subData,
                            paymentDate: paymentDate
                        });
                    }
                }
            }
            
            // Send notification if there are upcoming payments
            if (upcomingSubs.length > 0) {
                try {
                    let message = '🔔 *Напоминание об оплате*\n\n';
                    message += 'Завтра нужно оплатить:\n\n';
                    
                    for (const sub of upcomingSubs) {
                        const symbol = sub.currencySymbol || '₩';
                        const dateStr = sub.paymentDate.toLocaleDateString('ru-RU', { 
                            day: 'numeric', 
                            month: 'long' 
                        });
                        message += `• *${sub.name}*: ${symbol}${sub.cost}\n`;
                        message += `  Дата: ${dateStr}\n\n`;
                        
                        // Update lastNotificationDate
                        await db.collection('users').doc(userId)
                            .collection('subscriptions').doc(sub.id)
                            .update({
                                lastNotificationDate: admin.firestore.FieldValue.serverTimestamp()
                            });
                    }
                    
                    await bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
                    totalNotifications++;
                    console.log(`[NOTIFICATIONS] Sent notification to user ${userId} for ${upcomingSubs.length} subscriptions`);
                } catch (error) {
                    console.error(`[NOTIFICATIONS] Error sending notification to user ${userId}:`, error);
                }
            }
        }
        
        console.log(`[NOTIFICATIONS] Check completed. Sent ${totalNotifications} notifications.`);
    } catch (error) {
        console.error('[NOTIFICATIONS] Error checking upcoming payments:', error);
    }
};

// Run notification check every 6 hours
const NOTIFICATION_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// Run immediately on startup (after 1 minute to let bot initialize)
setTimeout(() => {
    checkUpcomingPayments();
}, 60000); // 1 minute delay

// Then run every 6 hours
setInterval(() => {
    checkUpcomingPayments();
}, NOTIFICATION_CHECK_INTERVAL);

console.log(`[NOTIFICATIONS] Notification system started. Will check every ${NOTIFICATION_CHECK_INTERVAL / 1000 / 60 / 60} hours.`);

// Debug info
console.log('🔍 Debug info:');
// Безопасное логирование - не показываем даже части токенов
console.log('- TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing');
console.log('- SERVICE_ACCOUNT:', process.env.SERVICE_ACCOUNT ? '✅ Set' : '❌ Missing');
console.log('- OPENAI_API_KEY:', openaiApiKey ? '✅ Set' : '❌ Missing (Voice recognition disabled)');
console.log('- ADMIN_IDS:', adminIds.length > 0 ? `✅ Set (${adminIds.length} admin(s))` : '❌ Missing (No admins configured)');
console.log('- WEB_APP_URL:', process.env.WEB_APP_URL || 'Using default');

// Health check server for Railway
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    // Health check endpoint - Railway will check this
    if (req.url === '/health' || req.url === '/') {
        const healthStatus = {
            status: 'ok',
            bot: 'running',
            telegram: token ? 'configured' : 'missing',
            openai: openaiApiKey ? 'configured' : 'missing',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
        
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify(healthStatus));
        
        // Log only occasionally to avoid spam
        if (Math.random() < 0.1) { // Log ~10% of requests
            console.log(`[HEALTH] Health check - OK`);
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`✅ Health check server listening on port ${PORT}`);
    console.log(`✅ Application is ready and healthy!`);
    console.log(`✅ Health check available at: http://localhost:${PORT}/health`);
    
    // Make an immediate health check to verify it works
    setTimeout(() => {
        http.get(`http://localhost:${PORT}/health`, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`✅ Health check verified: ${res.statusCode}`);
            });
        }).on('error', (err) => {
            console.warn(`⚠️ Health check test failed: ${err.message}`);
        });
    }, 1000);
    
    // Explicitly signal that the app is ready (for Railway/PM2)
    if (process.send) {
        process.send('ready');
    }
});

// Handle server errors
server.on('error', (error) => {
    console.error('❌ Server error:', error);
    // Don't exit - Railway will restart if needed
});

// Keep process alive - prevent accidental exit
process.on('SIGTERM', () => {
    console.log('⚠️ SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('⚠️ SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions - don't crash
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Don't exit - log and continue
});

// Handle unhandled promise rejections - don't crash
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - log and continue
});

// Keep process alive - reduced interval for better monitoring
setInterval(() => {
    // Heartbeat to keep process alive and show Railway that bot is running
    if (server.listening) {
        console.log('💓 Heartbeat - Bot is alive and healthy');
    }
}, 600000); // Every 10 minutes (reduced from 1 hour for better monitoring)

console.log('='.repeat(50));
console.log('🚀 Bot is running and ready!');
console.log('✅ All systems operational. Bot will stay online.');
console.log(`✅ Health check: http://localhost:${PORT}/health`);
console.log(`✅ Telegram Bot: ${bot ? 'Initialized' : 'Not initialized'}`);
console.log('='.repeat(50));
} // end RUN_MODE === 'bot'

// Expose NLU helpers for self-tests / tooling
export { detectIntentV2, extractSlotsV2, detectLanguage, normalizeText };