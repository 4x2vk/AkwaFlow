import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isDevMode, getDevUID, setDevUID } from '../lib/devMode';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [searchParams] = useSearchParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const initializedRef = useRef(false);

    useEffect(() => {
        const devMode = isDevMode();
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

        // 3. Dev mode: Get UID from URL parameter or localStorage
        // ⚠️ SECURITY: Only works in development environment (import.meta.env.DEV === true)
        // In production, this code path will never execute
        if (!uid && import.meta.env.DEV && devMode) {
            const urlUid = searchParams.get('uid');
            if (urlUid) {
                uid = urlUid;
                // Save to localStorage for persistence across navigation
                setDevUID(urlUid);
                console.log('[AUTH] 🧪 DEV MODE: Using UID from URL parameter:', uid);
            } else {
                // In dev mode, always try to get UID from localStorage
                // This ensures auth persists across navigation
                const savedUid = getDevUID();
                if (savedUid && savedUid !== 'dev_user_123456789') {
                    uid = savedUid;
                    console.log('[AUTH] 🧪 DEV MODE: Using dev UID from localStorage:', uid);
                }
            }
        }

        // Update user state
        setUser(prevUser => {
            // If we found a UID, use it
            if (uid) {
                console.log('[AUTH] ✅ User identified:', uid);
                console.log('[AUTH] Telegram WebApp available:', !!tgWebApp);
                console.log('[AUTH] initDataUnsafe available:', !!tgWebApp?.initDataUnsafe);
                console.log('[AUTH] initData available:', !!tgWebApp?.initData);
                if (devMode) {
                    console.log('[AUTH] 🧪 DEV MODE ACTIVE');
                }
                initializedRef.current = true;
                return { uid };
            }
            
            // If no UID found
            if (!devMode) {
                // Not in dev mode - reset user
                console.log('[AUTH] ❌ No user found. strict mode.');
                console.log('[AUTH] Telegram WebApp available:', !!tgWebApp);
                console.log('[AUTH] initDataUnsafe:', tgWebApp?.initDataUnsafe);
                console.log('[AUTH] initData:', tgWebApp?.initData ? 'exists' : 'missing');
                if (import.meta.env.DEV) {
                    console.log('[AUTH] 💡 TIP: Add ?dev=true&uid=YOUR_UID to URL to enable dev mode');
                }
                return null;
            } else {
                // In dev mode - preserve existing user if we have one
                if (prevUser) {
                    console.log('[AUTH] 🧪 DEV MODE: Preserving existing user during navigation:', prevUser.uid);
                    return prevUser;
                }
                // No existing user and no UID found - return null
                console.log('[AUTH] 🧪 DEV MODE: No user found, but dev mode is active');
                return null;
            }
        });

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
