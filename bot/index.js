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

// Admin IDs - comma-separated list of Telegram user IDs who can send broadcasts
// Example: ADMIN_IDS=123456789,987654321
const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];

// Check if user is admin
const isAdmin = (userId) => {
    return adminIds.includes(String(userId));
};

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
            bot.sendMessage(chatId, `✅ Отлично! Добавил подписку "${name}" на сумму ${symbol}${cost.toLocaleString()}. Следующий платеж: ${dateStr}. 🎉`);
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
                bot.sendMessage(chatId, `😔 Извините, но подписка "${nameToRemove}" не найдена. Пожалуйста, проверьте название в списке "Мои подписки". 💡`);
                return;
            }

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            bot.sendMessage(chatId, `✅ Готово! Подписка "${nameToRemove}" успешно удалена. 😊`);
            return;
        } catch (e) {
            console.error(e);
            bot.sendMessage(chatId, '😔 Извините, произошла ошибка при удалении подписки. Попробуйте еще раз позже. 🙏');
            return;
        }
    }

    // 3. LIST Command: "Мои подписки"
    if (text.match(/(?:Мои подписки|Список|List)/i)) {
        try {
            const snapshot = await db.collection('users').doc(String(chatId)).collection('subscriptions').get();

            if (snapshot.empty) {
                bot.sendMessage(chatId, '📭 У вас пока нет активных подписок. Хотите добавить первую? Просто напишите: "Добавь Netflix 10000 вон 12 числа" 😊');
                return;
            }

            let response = '📋 *Ваши активные подписки:*\n\n';
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const sym = data.currencySymbol || '₩';
                response += `• *${data.name}*: ${sym}${data.cost}\n`;
            });

            bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
            return;
        } catch (e) {
            console.error(e);
            bot.sendMessage(chatId, '😔 Извините, не удалось получить список подписок. Попробуйте позже. 🙏');
            return;
        }
    }

    // 4. Greetings
    if (text.match(/(?:Привет|Hello|Hi|Start)/i)) {
        bot.sendMessage(chatId, `Привет! 👋 Рад тебя видеть! Я помогу управлять твоими подписками. 😊\n\nПросто напиши или скажи: "Добавь Apple Music 1000 руб 15 числа"`);
        return;
    }

    // Default Fallback
    bot.sendMessage(chatId, '🤔 Извините, я не совсем понял команду. Попробуйте один из вариантов:\n\n• "Добавь Netflix 10000 вон 12 числа"\n• "Удали Spotify"\n• "Мои подписки"\n\nИли просто скажите это голосовым сообщением! 🎤');
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
        console.log(`[BOT] Transcription result: "${transcribedText}"`);
        
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
console.log('- TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? `✅ Set (${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...)` : '❌ Missing');
console.log('- SERVICE_ACCOUNT:', process.env.SERVICE_ACCOUNT ? `✅ Set (${process.env.SERVICE_ACCOUNT.substring(0, 50)}...)` : '❌ Missing');
console.log('- OPENAI_API_KEY:', openaiApiKey ? `✅ Set (${openaiApiKey.substring(0, 10)}...)` : '❌ Missing (Voice recognition disabled)');
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