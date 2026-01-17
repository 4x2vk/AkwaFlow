import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';

const AdminContext = createContext();

export function useAdmin() {
    return useContext(AdminContext);
}

// Admin IDs - loaded from Firestore or environment variable
// Priority: 1) Firestore config, 2) VITE_ADMIN_IDS env var, 3) Empty array
let ADMIN_IDS = import.meta.env.VITE_ADMIN_IDS
    ? import.meta.env.VITE_ADMIN_IDS.split(',').map(id => id.trim()).filter(id => id.length > 0)
    : [];

// Debug logging
console.log('[ADMIN] ==========================================');
console.log('[ADMIN] VITE_ADMIN_IDS from env:', import.meta.env.VITE_ADMIN_IDS);
console.log('[ADMIN] Initial Admin IDs:', ADMIN_IDS);
console.log('[ADMIN] ==========================================');

export function AdminProvider({ children }) {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminStats, setAdminStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adminIds, setAdminIds] = useState(ADMIN_IDS);

    // Load admin IDs from Firestore config (if exists)
    useEffect(() => {
        const loadAdminIds = async () => {
            try {
                const configDoc = await getDoc(doc(db, 'config', 'admin'));
                if (configDoc.exists()) {
                    const configData = configDoc.data();
                    if (configData.adminIds && Array.isArray(configData.adminIds)) {
                        const firestoreAdminIds = configData.adminIds.map(id => String(id));
                        console.log('[ADMIN] Loaded admin IDs from Firestore:', firestoreAdminIds);
                        setAdminIds(firestoreAdminIds);
                        return;
                    }
                }
                console.log('[ADMIN] No admin config in Firestore, using env vars');
            } catch (error) {
                console.warn('[ADMIN] Error loading admin config from Firestore:', error);
                console.log('[ADMIN] Using env vars as fallback');
            }
        };
        loadAdminIds();
    }, []);

    useEffect(() => {
        if (user?.uid) {
            const userIsAdmin = adminIds.includes(String(user.uid));
            console.log('[ADMIN] Checking admin status for user:', user.uid);
            console.log('[ADMIN] Admin IDs list:', adminIds);
            console.log('[ADMIN] Is admin:', userIsAdmin);
            setIsAdmin(userIsAdmin);
        } else {
            setIsAdmin(false);
        }
        setLoading(false);
    }, [user, adminIds]);

    const fetchAdminStats = async () => {
        if (!isAdmin) {
            console.warn('[ADMIN] User is not admin, cannot fetch stats');
            return;
        }

        try {
            setLoading(true);
            console.log('[ADMIN] Fetching admin statistics...');

            // Get all users
            const usersSnapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
            const users = [];
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            let totalSubscriptions = 0;
            let totalCategories = 0;
            let activeUsers = 0;
            let inactiveUsers = 0;
            let newUsersLast7Days = 0;
            let newUsersLast30Days = 0;
            const usersByDay = {};
            const subscriptionsByDay = {};

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const userId = userDoc.id;

                // Parse dates
                let createdAt = null;
                let lastSeen = null;

                if (userData.createdAt) {
                    if (userData.createdAt.toDate) {
                        createdAt = userData.createdAt.toDate();
                    } else if (typeof userData.createdAt === 'string') {
                        createdAt = new Date(userData.createdAt);
                    }
                }

                if (userData.lastSeen) {
                    if (userData.lastSeen.toDate) {
                        lastSeen = userData.lastSeen.toDate();
                    } else if (typeof userData.lastSeen === 'string') {
                        lastSeen = new Date(userData.lastSeen);
                    }
                }

                // Count new users
                if (createdAt) {
                    const createdDate = createdAt.toISOString().split('T')[0];
                    usersByDay[createdDate] = (usersByDay[createdDate] || 0) + 1;

                    if (createdAt >= sevenDaysAgo) {
                        newUsersLast7Days++;
                    }
                    if (createdAt >= thirtyDaysAgo) {
                        newUsersLast30Days++;
                    }
                }

                // Get user subscriptions
                const subsSnapshot = await getDocs(collection(db, 'users', userId, 'subscriptions'));
                const userSubs = subsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                totalSubscriptions += userSubs.length;

                // Count subscriptions by creation date
                userSubs.forEach(sub => {
                    let subCreatedAt = null;
                    if (sub.createdAt) {
                        if (sub.createdAt.toDate) {
                            subCreatedAt = sub.createdAt.toDate();
                        } else if (typeof sub.createdAt === 'string') {
                            subCreatedAt = new Date(sub.createdAt);
                        }
                    }
                    if (subCreatedAt) {
                        const subDate = subCreatedAt.toISOString().split('T')[0];
                        subscriptionsByDay[subDate] = (subscriptionsByDay[subDate] || 0) + 1;
                    }
                });

                // Get user categories
                const catsSnapshot = await getDocs(collection(db, 'users', userId, 'categories'));
                totalCategories += catsSnapshot.size;

                // Determine if user is active (last seen within last 7 days)
                const isActive = lastSeen && lastSeen >= sevenDaysAgo;
                if (isActive) {
                    activeUsers++;
                } else {
                    inactiveUsers++;
                }

                users.push({
                    id: userId,
                    telegramId: userData.telegramId || userId,
                    createdAt,
                    lastSeen,
                    subscriptionCount: userSubs.length,
                    categoryCount: catsSnapshot.size,
                    isActive
                });
            }

            const stats = {
                totalUsers: users.length,
                activeUsers,
                inactiveUsers,
                newUsersLast7Days,
                newUsersLast30Days,
                totalSubscriptions,
                totalCategories,
                averageSubscriptionsPerUser: users.length > 0 ? (totalSubscriptions / users.length).toFixed(1) : 0,
                usersByDay,
                subscriptionsByDay,
                users: users.sort((a, b) => {
                    const aDate = a.lastSeen || a.createdAt || new Date(0);
                    const bDate = b.lastSeen || b.createdAt || new Date(0);
                    return bDate - aDate;
                })
            };

            setAdminStats(stats);
            console.log('[ADMIN] Statistics fetched successfully:', stats);
        } catch (error) {
            console.error('[ADMIN] Error fetching admin statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchAdminStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    const value = {
        isAdmin,
        adminStats,
        loading,
        refreshStats: fetchAdminStats
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
}
