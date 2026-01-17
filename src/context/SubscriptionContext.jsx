import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, getDocs, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { validateAndSanitizeSubscription } from '../lib/validation';

const SubscriptionContext = createContext();

export function useSubscriptions() {
    return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }) {
    const { user } = useAuth();
    const [subscriptions, setSubscriptions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial Mock Data for Demo
    // Initial Mock Data removed as per user request


    // Helper function to ensure user document exists
    const ensureUserExists = async (uid) => {
        try {
            const userDocRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                // Create user document with metadata
                await setDoc(userDocRef, {
                    createdAt: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    telegramId: String(uid)
                });
                console.log(`[SUBSCRIPTIONS] Created user document for ${uid}`);
            } else {
                // Update lastSeen timestamp
                await updateDoc(userDocRef, {
                    lastSeen: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`[SUBSCRIPTIONS] Error ensuring user exists for ${uid}:`, error);
        }
    };

    useEffect(() => {
        if (!user?.uid) {
            setSubscriptions([]);
            setCategories([]);
            setLoading(false);
            return;
        }

        // Ensure user document exists when they open the app
        ensureUserExists(user.uid);

        try {
            console.log('[SUBSCRIPTIONS] Setting up Firebase listeners for user:', user.uid);
            const subsPath = `users/${user.uid}/subscriptions`;
            const catsPath = `users/${user.uid}/categories`;
            console.log('[SUBSCRIPTIONS] Subscriptions path:', subsPath);
            console.log('[SUBSCRIPTIONS] Categories path:', catsPath);
            
            // Test direct query first
            const testCollection = collection(db, 'users', user.uid, 'subscriptions');
            console.log('[SUBSCRIPTIONS] Testing direct query...');
            getDocs(testCollection).then((testSnapshot) => {
                console.log('[SUBSCRIPTIONS] Direct query result - size:', testSnapshot.size);
                console.log('[SUBSCRIPTIONS] Direct query result - empty:', testSnapshot.empty);
                testSnapshot.forEach((doc) => {
                    console.log('[SUBSCRIPTIONS] Direct query - doc:', doc.id, doc.data());
                });
            }).catch((err) => {
                console.error('[SUBSCRIPTIONS] Direct query error:', err);
            });
            
            const qSubs = query(collection(db, 'users', user.uid, 'subscriptions'));
            const qCats = query(collection(db, 'users', user.uid, 'categories'));

            const unsubSubs = onSnapshot(qSubs, (querySnapshot) => {
                const subs = [];
                console.log('[SUBSCRIPTIONS] Snapshot received, size:', querySnapshot.size);
                console.log('[SUBSCRIPTIONS] Snapshot empty:', querySnapshot.empty);
                console.log('[SUBSCRIPTIONS] Snapshot metadata:', querySnapshot.metadata);
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log('[SUBSCRIPTIONS] Document ID:', doc.id);
                    console.log('[SUBSCRIPTIONS] Document data (raw):', data);
                    
                    // Convert Firestore Timestamp to ISO string if needed
                    const processedData = { ...data };
                    if (data.createdAt && data.createdAt.toDate) {
                        processedData.createdAt = data.createdAt.toDate().toISOString();
                    }
                    if (data.nextPaymentDate && typeof data.nextPaymentDate === 'string') {
                        // Already a string, keep it
                        processedData.nextPaymentDate = data.nextPaymentDate;
                    } else if (data.nextPaymentDate && data.nextPaymentDate.toDate) {
                        processedData.nextPaymentDate = data.nextPaymentDate.toDate().toISOString();
                    }
                    
                    console.log('[SUBSCRIPTIONS] Document data (processed):', processedData);
                    subs.push({ id: doc.id, ...processedData });
                });
                
                console.log('[SUBSCRIPTIONS] ✅ Received update from Firebase:', subs.length, 'subscriptions');
                console.log('[SUBSCRIPTIONS] Subscriptions array:', subs);
                setSubscriptions(subs);
                setLoading(false);
            }, (error) => {
                console.error('[SUBSCRIPTIONS] ❌ Firebase snapshot error:', error);
                console.error('[SUBSCRIPTIONS] Error code:', error.code);
                console.error('[SUBSCRIPTIONS] Error message:', error.message);
                console.error('[SUBSCRIPTIONS] Full error:', error);
                setLoading(false);
            });

            const unsubCats = onSnapshot(qCats, (querySnapshot) => {
                const cats = [];
                querySnapshot.forEach((doc) => {
                    cats.push({ id: doc.id, ...doc.data() });
                });
                setCategories(cats);
                // Don't set loading to false here, let subscriptions handle it
            }, (error) => {
                console.error('[SUBSCRIPTIONS] Categories error:', error);
            });

            return () => {
                unsubSubs();
                unsubCats();
            };
        } catch (err) {
            console.error("Firebase connection error:", err);
            setSubscriptions([]);
            setCategories([]);
            setLoading(false);
        }
    }, [user]);



    const addSubscription = async (sub) => {
        if (!user || user.uid === 'demo_user') {
            const newSub = { ...sub, id: Date.now().toString() };
            setSubscriptions([...subscriptions, newSub]);
            return;
        }
        
        try {
            console.log('[SUBSCRIPTIONS] Adding subscription for user:', user.uid);
            // Не логируем полные данные для безопасности
            
            // Add createdAt timestamp like in bot
            const subscriptionData = {
                ...sub,
                createdAt: new Date().toISOString()
            };
            
            const collectionRef = collection(db, 'users', user.uid, 'subscriptions');
            console.log('[SUBSCRIPTIONS] Collection path: users/' + user.uid + '/subscriptions');
            
            const docRef = await addDoc(collectionRef, subscriptionData);
            console.log('[SUBSCRIPTIONS] ✅ Subscription added successfully with ID:', docRef.id);
            console.log('[SUBSCRIPTIONS] Full document path:', docRef.path);
            
            // Data will be synced automatically via onSnapshot, no need to update state manually
        } catch (error) {
            console.error('[SUBSCRIPTIONS] ❌ Error adding subscription:', error);
            console.error('[SUBSCRIPTIONS] Error code:', error.code);
            console.error('[SUBSCRIPTIONS] Error message:', error.message);
            console.error('[SUBSCRIPTIONS] Full error:', error);
            
            // Show error to user (не раскрываем детали ошибки)
            alert('Ошибка при добавлении подписки. Пожалуйста, попробуйте еще раз.');
            throw error; // Re-throw so caller can handle it
        }
    };

    const removeSubscription = async (id) => {
        if (!user || user.uid === 'demo_user') {
            setSubscriptions(subscriptions.filter(s => s.id !== id));
            return;
        }
        
        // Проверка: убеждаемся, что подписка принадлежит текущему пользователю
        const subscription = subscriptions.find(s => s.id === id);
        if (!subscription) {
            console.error('[SUBSCRIPTIONS] Subscription not found:', id);
            alert('Подписка не найдена');
            return;
        }
        
        // Дополнительная проверка безопасности
        const subscriptionRef = doc(db, 'users', user.uid, 'subscriptions', id);
        try {
            await deleteDoc(subscriptionRef);
        } catch (error) {
            console.error('[SUBSCRIPTIONS] Error deleting subscription:', error);
            alert('Ошибка при удалении подписки');
        }
    };

    const addCategory = async (cat) => {
        if (!user || user.uid === 'demo_user') {
            const newCat = { ...cat, id: Date.now().toString() };
            setCategories([...categories, newCat]);
            return;
        }
        await addDoc(collection(db, 'users', user.uid, 'categories'), cat);
    };

    const removeCategory = async (id) => {
        if (!user || user.uid === 'demo_user') {
            setCategories(categories.filter(c => c.id !== id));
            return;
        }
        await deleteDoc(doc(db, 'users', user.uid, 'categories', id));
    };

    const updateSubscription = async (id, data) => {
        if (!user || user.uid === 'demo_user') {
            setSubscriptions(subscriptions.map(s => s.id === id ? { ...s, ...data } : s));
            return;
        }
        
        // Проверка: убеждаемся, что подписка принадлежит текущему пользователю
        const subscription = subscriptions.find(s => s.id === id);
        if (!subscription) {
            console.error('[SUBSCRIPTIONS] Subscription not found:', id);
            alert('Подписка не найдена');
            return;
        }
        
        // Валидация данных перед обновлением
        try {
            const validation = validateAndSanitizeSubscription(data);
            if (!validation.valid) {
                alert('Ошибка валидации: ' + validation.errors.join(', '));
                return;
            }
            await updateDoc(doc(db, 'users', user.uid, 'subscriptions', id), validation.data);
        } catch (error) {
            console.error('[SUBSCRIPTIONS] Error updating subscription:', error.code || 'UNKNOWN');
            alert('Ошибка при обновлении подписки');
        }
    };

    const updateCategory = async (id, data) => {
        // Find the category being updated to get its name
        const categoryToUpdate = categories.find(c => c.id === id);
        if (!categoryToUpdate) {
            console.error('[CATEGORY] Category not found:', id);
            return;
        }

        const oldCategoryName = categoryToUpdate.name;
        const newCategoryName = data.name;
        const newColor = data.color;
        const categoryNameChanged = newCategoryName && newCategoryName !== oldCategoryName;

        if (!user || user.uid === 'demo_user') {
            // Update category
            setCategories(categories.map(c => c.id === id ? { ...c, ...data } : c));
            
            // Update all subscriptions with this category
            setSubscriptions(subscriptions.map(s => {
                if (s.category === oldCategoryName) {
                    const updates = {};
                    if (newColor) updates.color = newColor;
                    if (categoryNameChanged) updates.category = newCategoryName;
                    return { ...s, ...updates };
                }
                return s;
            }));
            return;
        }

        // Update category in Firestore
        await updateDoc(doc(db, 'users', user.uid, 'categories', id), data);

        // Update all subscriptions with this category
        const subscriptionsToUpdate = subscriptions.filter(s => s.category === oldCategoryName);
        
        if (subscriptionsToUpdate.length > 0) {
            // Use batch write for efficient updates
            const batch = writeBatch(db);
            subscriptionsToUpdate.forEach(sub => {
                const subRef = doc(db, 'users', user.uid, 'subscriptions', sub.id);
                const updates = {};
                if (newColor) updates.color = newColor;
                if (categoryNameChanged) updates.category = newCategoryName;
                if (Object.keys(updates).length > 0) {
                    batch.update(subRef, updates);
                }
            });
            await batch.commit();
            const updateMessages = [];
            if (newColor) updateMessages.push('color');
            if (categoryNameChanged) updateMessages.push('name');
            console.log(`[CATEGORY] Updated ${updateMessages.join(' and ')} for ${subscriptionsToUpdate.length} subscriptions in category "${oldCategoryName}"`);
        }
    };

    return (
        <SubscriptionContext.Provider value={{
            subscriptions,
            categories,
            loading,
            addSubscription,
            removeSubscription,
            addCategory,
            removeCategory,
            updateSubscription,
            updateCategory
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
}
