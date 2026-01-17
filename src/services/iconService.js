/**
 * Сервис для получения иконок подписок и категорий из различных API
 */

// Кэш для хранения найденных иконок
const iconCache = new Map();

/**
 * Извлекает домен из названия сервиса
 * Например: "Netflix" -> "netflix.com", "Spotify Premium" -> "spotify.com"
 */
function extractDomain(name) {
    if (!name) return null;
    
    // Убираем лишние слова и приводим к нижнему регистру
    const cleanName = name
        .toLowerCase()
        .replace(/\s+(premium|pro|plus|basic|standard|deluxe|ultimate|max|mini|lite|free|trial)/gi, '')
        .trim();
    
    // Популярные сервисы - маппинг вручную
    const knownServices = {
        'netflix': 'netflix.com',
        'spotify': 'spotify.com',
        'youtube': 'youtube.com',
        'youtube premium': 'youtube.com',
        'apple': 'apple.com',
        'apple music': 'apple.com',
        'apple tv': 'apple.com',
        'amazon': 'amazon.com',
        'amazon prime': 'amazon.com',
        'disney': 'disney.com',
        'disney plus': 'disney.com',
        'disney+': 'disney.com',
        'hbo': 'hbo.com',
        'hbo max': 'hbo.com',
        'hulu': 'hulu.com',
        'paramount': 'paramount.com',
        'paramount plus': 'paramount.com',
        'twitch': 'twitch.tv',
        'discord': 'discord.com',
        'telegram': 'telegram.org',
        'telegram premium': 'telegram.org',
        'adobe': 'adobe.com',
        'microsoft': 'microsoft.com',
        'office': 'microsoft.com',
        'microsoft office': 'microsoft.com',
        'google': 'google.com',
        'google drive': 'google.com',
        'google one': 'google.com',
        'dropbox': 'dropbox.com',
        'icloud': 'icloud.com',
        'github': 'github.com',
        'notion': 'notion.so',
        'figma': 'figma.com',
        'canva': 'canva.com',
        'zoom': 'zoom.us',
        'slack': 'slack.com',
        'linkedin': 'linkedin.com',
        'linkedin premium': 'linkedin.com',
        'twitter': 'twitter.com',
        'x': 'twitter.com',
        'instagram': 'instagram.com',
        'facebook': 'facebook.com',
        'meta': 'facebook.com',
        'tiktok': 'tiktok.com',
        'uber': 'uber.com',
        'uber eats': 'ubereats.com',
        'deliveroo': 'deliveroo.com',
        'doordash': 'doordash.com',
        'grubhub': 'grubhub.com',
        'airbnb': 'airbnb.com',
        'booking': 'booking.com',
        'expedia': 'expedia.com',
        'nintendo': 'nintendo.com',
        'playstation': 'playstation.com',
        'xbox': 'xbox.com',
        'steam': 'steam.com',
        'epic games': 'epicgames.com',
        'ea': 'ea.com',
        'electronic arts': 'ea.com',
        'ubisoft': 'ubisoft.com',
        'blizzard': 'blizzard.com',
        'activision': 'activision.com',
        'riot games': 'riotgames.com',
        'league of legends': 'riotgames.com',
        'valorant': 'riotgames.com',
        'nvidia': 'nvidia.com',
        'nvidia geforce now': 'nvidia.com',
        'geforce now': 'nvidia.com',
    };
    
    // Проверяем известные сервисы
    if (knownServices[cleanName]) {
        return knownServices[cleanName];
    }
    
    // Пытаемся найти домен в названии (если уже есть .com, .ru и т.д.)
    const domainMatch = name.match(/([a-z0-9-]+\.(com|ru|org|net|io|co|tv|app|dev|me|ai|cloud|online|store|shop|tech|xyz|site|website|space|blog|info|biz|us|uk|de|fr|jp|cn|kr|in|au|ca|br|mx|es|it|nl|pl|se|no|dk|fi|cz|at|ch|be|ie|pt|gr|tr|ae|sa|il|za|nz|sg|my|th|ph|id|vn|hk|tw|mo|jp|kr|cn|in|pk|bd|lk|mm|kh|la|mn|kz|uz|tj|kg|tm|af|ir|iq|sy|jo|lb|ye|om|kw|qa|bh|az|am|ge|by|ua|md|ro|bg|rs|hr|si|sk|hu|ee|lv|lt|is|mt|cy|lu|mc|ad|li|sm|va|al|ba|mk|me|xk|rs|bg|ro|md|ua|by|ru|kz|uz|tj|kg|tm|az|am|ge|il|ps|jo|lb|sy|iq|ir|af|pk|bd|lk|np|bt|mv|in|mm|th|la|kh|vn|ph|my|sg|bn|id|tl|pg|fj|nc|pf|ws|to|tv|ki|nr|pw|mh|fm|gu|mp|as|vi|pr|do|ht|cu|jm|bb|tt|gd|lc|vc|ag|dm|kn|bs|bz|gt|sv|hn|ni|cr|pa|co|ve|gy|sr|gf|ec|pe|bo|py|uy|ar|cl|fk|gs|tf|aq|io|cc|cx|nf|hm|bv|sj|pm|yt|re|mu|sc|km|dj|so|et|er|sd|ss|cf|td|ne|ml|bf|ci|gh|tg|bj|ng|cm|gq|ga|cg|cd|ao|zm|mw|mz|mg|mu|sc|km|dj|so|et|er|sd|ss|cf|td|ne|ml|bf|ci|gh|tg|bj|ng|cm|gq|ga|cg|cd|ao|zm|mw|mz|mg|zw|bw|na|sz|ls|za|st|gw|gn|sl|lr|cv|mr|sn|gm|ma|eh|dz|tn|ly|eg|sd|ss|et|er|dj|so|ke|ug|rw|bi|tz|zm|mw|mz|mg|zw|bw|na|sz|ls|za|st|gw|gn|sl|lr|cv|mr|sn|gm|ma|eh|dz|tn|ly|eg))/i);
    if (domainMatch) {
        return domainMatch[1].toLowerCase();
    }
    
    // Если ничего не найдено, пробуем просто добавить .com
    const simpleName = cleanName.replace(/[^a-z0-9]/g, '');
    if (simpleName.length > 2) {
        return `${simpleName}.com`;
    }
    
    return null;
}

/**
 * Получает иконку из Google Favicon API
 */
async function getFaviconIcon(domain) {
    if (!domain) return null;
    
    const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    
    try {
        // Проверяем, доступна ли иконка
        const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        return url; // Возвращаем URL даже если не можем проверить (CORS)
    } catch (error) {
        console.warn(`[ICON] Error fetching favicon for ${domain}:`, error);
        return null;
    }
}

/**
 * Получает иконку из Clearbit Logo API (требует домен)
 */
async function getClearbitIcon(domain) {
    if (!domain) return null;
    
    const url = `https://logo.clearbit.com/${domain}`;
    
    try {
        const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        return url;
    } catch (error) {
        console.warn(`[ICON] Error fetching Clearbit logo for ${domain}:`, error);
        return null;
    }
}

/**
 * Основная функция для получения иконки по названию
 * @param {string} name - Название подписки или категории
 * @param {string} type - Тип: 'subscription' или 'category'
 * @returns {Promise<string|null>} URL иконки или null
 */
export async function getIcon(name, type = 'subscription') {
    if (!name) return null;
    
    // Проверяем кэш
    const cacheKey = `${type}_${name.toLowerCase()}`;
    if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey);
    }
    
    // Для категорий используем более простой подход
    if (type === 'category') {
        // Для категорий можно использовать эмодзи или простые иконки
        // Пока возвращаем null, чтобы использовать цветной фон
        iconCache.set(cacheKey, null);
        return null;
    }
    
    // Для подписок извлекаем домен
    const domain = extractDomain(name);
    if (!domain) {
        iconCache.set(cacheKey, null);
        return null;
    }
    
    // Пробуем получить иконку из Clearbit (лучшее качество)
    const clearbitIcon = await getClearbitIcon(domain);
    if (clearbitIcon) {
        iconCache.set(cacheKey, clearbitIcon);
        return clearbitIcon;
    }
    
    // Если Clearbit не сработал, используем Google Favicon
    const faviconIcon = await getFaviconIcon(domain);
    if (faviconIcon) {
        iconCache.set(cacheKey, faviconIcon);
        return faviconIcon;
    }
    
    // Если ничего не найдено, кэшируем null
    iconCache.set(cacheKey, null);
    return null;
}

/**
 * Очищает кэш иконок
 */
export function clearIconCache() {
    iconCache.clear();
}

/**
 * Предзагружает иконки для списка названий
 */
export async function preloadIcons(names, type = 'subscription') {
    const promises = names.map(name => getIcon(name, type));
    await Promise.all(promises);
}
