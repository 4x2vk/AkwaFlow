/**
 * Development mode utilities
 * Allows testing the app in browser without Telegram WebApp
 */

const DEV_MODE_KEY = 'akwaflow_dev_mode';
const DEV_UID_KEY = 'akwaflow_dev_uid';

export const isDevMode = () => {
    // SECURITY: Dev mode is disabled in production by default.
    // If you really need to test a deployed build, set:
    // VITE_ALLOW_DEV_MODE_IN_PROD=true
    const allowInProd = String(import.meta.env.VITE_ALLOW_DEV_MODE_IN_PROD || '').toLowerCase() === 'true';
    if (!import.meta.env.DEV && !allowInProd) {
        return false;
    }
    
    // Check URL parameter first - if found, enable and save to localStorage
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === 'true') {
        // Auto-enable dev mode when found in URL
        enableDevMode();
        return true;
    }
    
    // Check localStorage
    return localStorage.getItem(DEV_MODE_KEY) === 'true';
};

export const enableDevMode = () => {
    localStorage.setItem(DEV_MODE_KEY, 'true');
    console.log('[DEV] Development mode enabled');
};

export const disableDevMode = () => {
    localStorage.removeItem(DEV_MODE_KEY);
    localStorage.removeItem(DEV_UID_KEY);
    console.log('[DEV] Development mode disabled');
};

export const getDevUID = () => {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const urlUid = urlParams.get('uid');
    if (urlUid) {
        // Save to localStorage for convenience
        localStorage.setItem(DEV_UID_KEY, urlUid);
        return urlUid;
    }
    
    // Check localStorage
    return localStorage.getItem(DEV_UID_KEY) || 'dev_user_123456789';
};

export const setDevUID = (uid) => {
    localStorage.setItem(DEV_UID_KEY, uid);
    console.log('[DEV] Dev UID set to:', uid);
};

/**
 * Mock Telegram WebApp API for development
 */
export const mockTelegramWebApp = () => {
    if (window.Telegram?.WebApp) {
        // Already exists (real Telegram), don't mock
        return;
    }
    
    if (!isDevMode()) {
        return;
    }
    
    console.log('[DEV] Creating mock Telegram WebApp API');
    
    window.Telegram = {
        WebApp: {
            initData: '',
            initDataUnsafe: {
                user: {
                    id: parseInt(getDevUID().replace(/\D/g, '') || '123456789'),
                    first_name: 'Dev',
                    last_name: 'User',
                    username: 'dev_user',
                    language_code: 'ru'
                },
                query_id: '',
                auth_date: Math.floor(Date.now() / 1000),
                hash: ''
            },
            version: '7.0',
            platform: 'web',
            colorScheme: 'dark',
            themeParams: {
                bg_color: '#1e1e1e',
                text_color: '#ffffff',
                hint_color: '#9ca3af',
                link_color: '#a78bfa',
                button_color: '#a78bfa',
                button_text_color: '#000000'
            },
            isExpanded: true,
            viewportHeight: window.innerHeight,
            viewportStableHeight: window.innerHeight,
            headerColor: '#1e1e1e',
            backgroundColor: '#1e1e1e',
            isClosingConfirmationEnabled: false,
            BackButton: {
                isVisible: false,
                onClick: () => {},
                offClick: () => {},
                show: () => {},
                hide: () => {}
            },
            MainButton: {
                text: '',
                color: '#a78bfa',
                textColor: '#000000',
                isVisible: false,
                isActive: true,
                isProgressVisible: false,
                setText: () => {},
                onClick: () => {},
                offClick: () => {},
                show: () => {},
                hide: () => {},
                enable: () => {},
                disable: () => {},
                showProgress: () => {},
                hideProgress: () => {},
                setParams: () => {}
            },
            HapticFeedback: {
                impactOccurred: () => {},
                notificationOccurred: () => {},
                selectionChanged: () => {}
            },
            CloudStorage: {
                setItem: () => Promise.resolve(),
                getItem: () => Promise.resolve(null),
                getItems: () => Promise.resolve([]),
                removeItem: () => Promise.resolve(),
                removeItems: () => Promise.resolve()
            },
            ready: () => {
                console.log('[DEV] Mock Telegram WebApp ready() called');
            },
            expand: () => {
                console.log('[DEV] Mock Telegram WebApp expand() called');
            },
            close: () => {
                console.log('[DEV] Mock Telegram WebApp close() called');
            },
            sendData: () => {
                console.log('[DEV] Mock Telegram WebApp sendData() called');
            },
            openLink: (url) => {
                console.log('[DEV] Mock Telegram WebApp openLink() called:', url);
                window.open(url, '_blank');
            },
            openTelegramLink: (url) => {
                console.log('[DEV] Mock Telegram WebApp openTelegramLink() called:', url);
            },
            openInvoice: () => {
                console.log('[DEV] Mock Telegram WebApp openInvoice() called');
            },
            showPopup: () => {
                console.log('[DEV] Mock Telegram WebApp showPopup() called');
            },
            showAlert: (message) => {
                alert(message);
            },
            showConfirm: (message) => {
                return Promise.resolve(confirm(message));
            },
            showScanQrPopup: () => {
                console.log('[DEV] Mock Telegram WebApp showScanQrPopup() called');
            },
            closeScanQrPopup: () => {
                console.log('[DEV] Mock Telegram WebApp closeScanQrPopup() called');
            },
            readTextFromClipboard: () => {
                return Promise.resolve(navigator.clipboard?.readText() || '');
            },
            requestWriteAccess: () => {
                return Promise.resolve(true);
            },
            requestContact: () => {
                return Promise.resolve(true);
            }
        }
    };
    
    console.log('[DEV] ✅ Mock Telegram WebApp API created');
};
