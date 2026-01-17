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

if (!token) {
    console.error("❌ CRTICAL ERROR: TELEGRAM_BOT_TOKEN is missing provided!");
    console.error("Please set TELEGRAM_BOT_TOKEN environment variable");
    // Don't exit - let Railway see the error in logs
    process.exit(1);
}

let bot;
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
        const audioFile = fs.createReadStream(audioFilePath);
        
        form.append('file', audioFile);
        form.append('model', 'whisper-1');
        form.append('language', 'ru'); // Russian language

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                ...form.getHeaders()
            },
            body: form
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result.text;
    } catch (error) {
        console.error('[BOT] Error transcribing audio:', error);
        throw error;
    }
};

// Common function to process text commands (extracted from message handler)
const processTextCommand = async (chatId, text) => {
    // Ensure user document exists when they interact
    await ensureUserExists(chatId);

    // 1. ADD Command: "Добавь Netflix за 999 вон 12 числа" OR "Добавь Netflix 999 вон"
    const addMatch = text.match(/(?:Добавь|Add)\s+(.+?)\s+(?:за|for)?\s*(\d+(?:[.,]\d+)?)\s*(.+)/i);

    if (addMatch) {
        const name = addMatch[1].trim();
        const cost = parseFloat(addMatch[2].replace(',', '.'));
        const restOfText = addMatch[3].trim();
        
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
            return;
        } catch (e) {
            console.error('[BOT] Error adding subscription:', e);
            bot.sendMessage(chatId, '❌ Ошибка при добавлении в базу данных.');
            return;
        }
    }

    // 2. REMOVE Command: "Удали Spotify"
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
            return;
        } catch (e) {
            console.error(e);
            bot.sendMessage(chatId, '❌ Ошибка при удалении.');
            return;
        }
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
            return;
        } catch (e) {
            console.error(e);
            bot.sendMessage(chatId, '❌ Ошибка получения списка.');
            return;
        }
    }

    // 4. Greetings
    if (text.match(/(?:Привет|Hello|Hi|Start)/i)) {
        bot.sendMessage(chatId, `Привет! 👋 Я готов управлять твоими подписками.\n\nПросто напиши: "Добавь Apple Music 1000 руб 15 числа"`);
        return;
    }

    // Default Fallback
    bot.sendMessage(chatId, '🤔 Я не понял команду. Попробуйте так:\n• "Добавь Netflix 10000 вон 12 числа"\n• "Удали Spotify"\n• "Мои подписки"');
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

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    // Ensure user document exists in Firebase
    await ensureUserExists(chatId);

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

    // Skip commands, voice messages, and other types
    if (!text || text.startsWith('/')) return;
    if (msg.voice) return; // Voice messages are handled separately

    await processTextCommand(chatId, text);
});

// Voice message handler with speech recognition
bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    const voice = msg.voice;

    if (!openaiApiKey) {
        bot.sendMessage(chatId, '⚠️ Распознавание голоса временно недоступно. Пожалуйста, напишите текстом.');
        return;
    }

    try {
        // Show user that bot is processing audio
        const processingMsg = await bot.sendMessage(chatId, '🎤 Обрабатываю голосовое сообщение...');

        // Download audio file
        const audioFilePath = await downloadAudioFile(voice.file_id);
        
        // Transcribe speech
        const transcribedText = await transcribeAudio(audioFilePath);
        
        // Delete temporary file
        try {
            fs.unlinkSync(audioFilePath);
        } catch (unlinkError) {
            console.warn('[BOT] Error deleting temp file:', unlinkError);
        }

        // Delete processing message
        try {
            await bot.deleteMessage(chatId, processingMsg.message_id);
        } catch (deleteError) {
            console.warn('[BOT] Error deleting processing message:', deleteError);
        }

        if (!transcribedText || transcribedText.trim().length === 0) {
            bot.sendMessage(chatId, '❌ Не удалось распознать речь. Попробуйте еще раз или напишите текстом.');
            return;
        }

        // Send recognized text to user
        bot.sendMessage(chatId, `📝 Распознано: "${transcribedText}"`, { reply_to_message_id: msg.message_id });

        // Process recognized text as regular text command
        await processTextCommand(chatId, transcribedText);
    } catch (error) {
        console.error('[BOT] Error processing voice message:', error);
        bot.sendMessage(chatId, '❌ Ошибка при обработке голосового сообщения. Попробуйте написать текстом.');
    }
});

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
console.log('- TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? `✅ Set (${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...)` : '❌ Missing');
console.log('- SERVICE_ACCOUNT:', process.env.SERVICE_ACCOUNT ? `✅ Set (${process.env.SERVICE_ACCOUNT.substring(0, 50)}...)` : '❌ Missing');
console.log('- OPENAI_API_KEY:', openaiApiKey ? `✅ Set (${openaiApiKey.substring(0, 10)}...)` : '❌ Missing (Voice recognition disabled)');
console.log('- WEB_APP_URL:', process.env.WEB_APP_URL || 'Using default');

// Health check server for Railway
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            bot: 'running',
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`✅ Health check server listening on port ${PORT}`);
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

// Keep process alive
setInterval(() => {
    // Heartbeat to keep process alive
    if (server.listening) {
        console.log('💓 Heartbeat - Bot is alive');
    }
}, 3600000); // Every hour

console.log('Bot is running...');
console.log('✅ All systems operational. Bot will stay online.');