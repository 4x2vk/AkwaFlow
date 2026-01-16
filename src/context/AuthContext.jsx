import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [searchParams] = useSearchParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let uid = null;
        const tgWebApp = window.Telegram?.WebApp;

        // 1. Try to get UID from Telegram Web App SDK initDataUnsafe (easiest method)
        const tgUser = tgWebApp?.initDataUnsafe?.user;
        if (tgUser?.id) {
            uid = String(tgUser.id);
            console.log('[AUTH] User ID from initDataUnsafe:', uid);
        }

        // 2. Fallback: Parse initData string manually if initDataUnsafe is not available
        if (!uid && tgWebApp?.initData) {
            try {
                const initData = tgWebApp.initData;
                // Parse initData string (format: "user=%7B%22id%22%3A123456789%2C...")
                const params = new URLSearchParams(initData);
                const userParam = params.get('user');
                if (userParam) {
                    const userData = JSON.parse(decodeURIComponent(userParam));
                    if (userData.id) {
                        uid = String(userData.id);
                        console.log('[AUTH] User ID from parsed initData:', uid);
                    }
                }
            } catch (e) {
                console.warn('[AUTH] Failed to parse initData:', e);
            }
        }

        // 3. Fallback: Get UID from URL query parameter (For direct links)
        if (!uid) {
            uid = searchParams.get('uid');
            if (uid) {
                console.log('[AUTH] User ID from URL parameter:', uid);
            }
        }

        if (uid) {
            console.log('[AUTH] ✅ User identified:', uid);
            console.log('[AUTH] Telegram WebApp available:', !!tgWebApp);
            console.log('[AUTH] initDataUnsafe available:', !!tgWebApp?.initDataUnsafe);
            console.log('[AUTH] initData available:', !!tgWebApp?.initData);
            setUser({ uid });
        } else {
            console.log('[AUTH] ❌ No user found. strict mode.');
            console.log('[AUTH] Telegram WebApp available:', !!tgWebApp);
            console.log('[AUTH] initDataUnsafe:', tgWebApp?.initDataUnsafe);
            console.log('[AUTH] initData:', tgWebApp?.initData ? 'exists' : 'missing');
            setUser(null);
        }

        // Notify Telegram that the app is ready
        if (tgWebApp) {
            tgWebApp.ready();
            tgWebApp.expand(); // Auto expand
        }

        setLoading(false);
    }, [searchParams]);

    const value = { user, loading };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
