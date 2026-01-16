import TelegramBot from 'node-telegram-bot-api';
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Initialize Firebase Admin
try {
    const serviceAccount = require('./service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    console.warn("⚠️ Warning: 'service-account.json' not found. Bot database writes will fail.");
}

const db = admin.firestore();

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL || 'https://akwaflow-manager-v1.web.app';

if (!token) {
    console.error("❌ CRTICAL ERROR: TELEGRAM_BOT_TOKEN is missing provided!");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Currency Helper
const detectCurrency = (input) => {
    const text = input.toLowerCase().trim();
    if (text.includes('вон') || text.includes('won')) return { code: 'WON', symbol: '₩' };
    if (text.includes('руб') || text.includes('rub')) return { code: 'RUB', symbol: '₽' };
    if (text.includes('дол') || text.includes('usd') || text.includes('$')) return { code: 'USD', symbol: '$' };
    if (text.includes('тен') || text.includes('kzt')) return { code: 'KZT', symbol: '₸' };
    return { code: 'WON', symbol: '₩' }; // Default
};

// Date Helper - Parse date from text like "12 числа" or "12"
const parseDate = (text) => {
    // Try to find date pattern: "12 числа", "12 число", "12-го", "12-е", or just "12"
    const dateMatch = text.match(/(\d{1,2})(?:\s*(?:числа|число|го|е|th))?/i);
    if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        if (day >= 1 && day <= 31) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            
            // Create date for this month, or next month if day has passed
            let paymentDate = new Date(year, month, day);
            if (paymentDate < now) {
                // If date has passed this month, set for next month
                paymentDate = new Date(year, month + 1, day);
            }
            
            return {
                date: paymentDate.toISOString(),
                cycle: `Каждый ${day} числа`
            };
        }
    }
    // Default: next month, 1st day
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
        date: nextMonth.toISOString(),
        cycle: 'Каждый 1 числа'
    };
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Welcome message as requested
    const message = `Отправьте текстовое или голосовое сообщение:
• «Добавь Netflix 10000 вон 12 числа»
• «Удали Spotify»
• «Мои подписки»

Нажмите синюю кнопку «Подписки» слева, чтобы открыть приложение`;

    bot.sendMessage(chatId, message);
});

// Handle text messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    // 1. ADD Command: "Добавь Netflix за 999 вон 12 числа" OR "Добавь Netflix 999 вон"
    // Regex: "Добавь" <name> [за] <cost> <currency> [date]
    const addMatch = text.match(/(?:Добавь|Add)\s+(.+?)\s+(?:за|for)?\s*(\d+(?:[.,]\d+)?)\s*(.+)/i);

    if (addMatch) {
        const name = addMatch[1].trim();
        const cost = parseFloat(addMatch[2].replace(',', '.'));
        const restOfText = addMatch[3].trim();
        
        // Extract currency and date from the rest of the text
        const { code, symbol } = detectCurrency(restOfText);
        const { date, cycle } = parseDate(restOfText);

        try {
            const userDocRef = db.collection('users').doc(String(chatId));
            const subscriptionData = {
                name,
                cost,
                currency: code,
                currencySymbol: symbol,
                cycle: cycle,
                nextPaymentDate: date,
                category: 'Общие',
                color: '#00D68F',
                icon: name[0].toUpperCase(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            console.log(`[BOT] Adding subscription for user ${chatId}:`, subscriptionData);
            await userDocRef.collection('subscriptions').add(subscriptionData);
            
            const dateStr = new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
            bot.sendMessage(chatId, `✅ Добавлено: ${name} (${symbol}${cost}), следующий платеж: ${dateStr}`);
            console.log(`[BOT] Subscription added successfully for user ${chatId}`);
        } catch (e) {
            console.error('[BOT] Error adding subscription:', e);
            bot.sendMessage(chatId, '❌ Ошибка при добавлении в базу данных.');
        }
        return;
    }

    // 2. REMOVE Command: "Удали Spotify"
    // Allow "Удали" or just "Удалить" etc
    const removeMatch = text.match(/(?:Удали|Удалить|Remove|Delete)\s+(.+)/i);
    if (removeMatch) {
        const nameToRemove = removeMatch[1].trim();
        try {
            const snapshot = await db.collection('users').doc(String(chatId)).collection('subscriptions')
                .where('name', '==', nameToRemove)
                .get();

            if (snapshot.empty) {
                bot.sendMessage(chatId, `⚠️ Подписка "${nameToRemove}" не найдена. Проверьте название в списке "Мои подписки".`);
                return;
            }

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            bot.sendMessage(chatId, `🗑️ Удалено: ${nameToRemove}`);
        } catch (e) {
            console.error(e);
            bot.sendMessage(chatId, '❌ Ошибка при удалении.');
        }
        return;
    }

    // 3. LIST Command: "Мои подписки"
    if (text.match(/(?:Мои подписки|Список|List)/i)) {
        try {
            const snapshot = await db.collection('users').doc(String(chatId)).collection('subscriptions').get();

            if (snapshot.empty) {
                bot.sendMessage(chatId, 'У вас пока нет активных подписок.');
                return;
            }

            let response = '📋 *Ваши подписки:*\n\n';

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const sym = data.currencySymbol || '₩';
                response += `• *${data.name}*: ${sym}${data.cost}\n`;
            });

            bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error(e);
            bot.sendMessage(chatId, '❌ Ошибка получения списка.');
        }
        return;
    }

    // 4. Greetings
    if (text.match(/(?:Привет|Hello|Hi|Start)/i)) {
        bot.sendMessage(chatId, `Привет! 👋 Я готов управлять твоими подписками.\n\nПросто напиши: "Добавь Apple Music 1000 руб 15 числа"`);
        return;
    }

    // Default Fallback
    bot.sendMessage(chatId, '🤔 Я не понял команду. Попробуйте так:\n• "Добавь Netflix 10000 вон 12 числа"\n• "Удали Spotify"\n• "Мои подписки"');
});

// Voice message handler (Placeholder)
bot.on('voice', (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '🎤 Я пока не умею слушать голосовые сообщения, но скоро научусь! Пожалуйста, напишите текстом.');
});

console.log('Bot is running...');
