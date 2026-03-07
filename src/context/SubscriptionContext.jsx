/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { validateAndSanitizeSubscription } from '../lib/validation';
import {
    applyOrderUpdates,
    buildReorderUpdates,
    commitOrderUpdates,
    getNextOrder
} from '../lib/orderedCollections';
import {
    addUserCollectionDoc,
    createDemoEntity,
    deleteUserCollectionDoc,
    ensureUserExists,
    isDemoUser,
    mapCategoryItems,
    mapSubscriptionItems,
    updateUserCollectionDoc
} from './subscriptionContextUtils';

const SubscriptionContext = createContext();

export function useSubscriptions() {
    return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }) {
    const { user } = useAuth();
    const [subscriptions, setSubscriptions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) {
            setSubscriptions([]);
            setCategories([]);
            setLoading(false);
            return;
        }

        // Ensure user document exists when they open the app
        ensureUserExists(db, user.uid);

        try {
            const qSubs = query(collection(db, 'users', user.uid, 'subscriptions'));
            const qCats = query(collection(db, 'users', user.uid, 'categories'));

            const unsubSubs = onSnapshot(qSubs, (querySnapshot) => {
                setSubscriptions(mapSubscriptionItems(querySnapshot));
                setLoading(false);
            }, (error) => {
                console.error('[SUBSCRIPTIONS] Firebase snapshot error:', error);
                setLoading(false);
            });

            const unsubCats = onSnapshot(qCats, (querySnapshot) => {
                setCategories(mapCategoryItems(querySnapshot));
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
        if (isDemoUser(user)) {
            const newSub = createDemoEntity(subscriptions, sub, {
                createdAt: new Date().toISOString()
            });
            setSubscriptions([...subscriptions, newSub]);
            return;
        }
        
        try {
            const subscriptionData = {
                ...sub,
                order: getNextOrder(subscriptions),
                createdAt: new Date().toISOString()
            };

            await addUserCollectionDoc(db, user.uid, 'subscriptions', subscriptionData);
        } catch (error) {
            console.error('[SUBSCRIPTIONS] Error adding subscription:', error);
            alert('Ошибка при добавлении подписки. Пожалуйста, попробуйте еще раз.');
            throw error;
        }
    };

    const removeSubscription = async (id) => {
        if (isDemoUser(user)) {
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
        try {
            await deleteUserCollectionDoc(db, user.uid, 'subscriptions', id);
        } catch (error) {
            console.error('[SUBSCRIPTIONS] Error deleting subscription:', error);
            alert('Ошибка при удалении подписки');
        }
    };

    const addCategory = async (cat) => {
        if (isDemoUser(user)) {
            const newCat = createDemoEntity(categories, cat);
            setCategories([...categories, newCat]);
            return newCat;
        }

        const docRef = await addUserCollectionDoc(db, user.uid, 'categories', {
            ...cat,
            order: getNextOrder(categories)
        });

        // Возвращаем созданную категорию, чтобы UI мог сразу выбрать её
        return {
            id: docRef.id,
            ...cat,
            order: getNextOrder(categories)
        };
    };

    const removeCategory = async (id) => {
        if (isDemoUser(user)) {
            setCategories(categories.filter(c => c.id !== id));
            return;
        }
        await deleteUserCollectionDoc(db, user.uid, 'categories', id);
    };

    const updateSubscription = async (id, data) => {
        if (isDemoUser(user)) {
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
            await updateUserCollectionDoc(db, user.uid, 'subscriptions', id, validation.data);
        } catch (error) {
            console.error('[SUBSCRIPTIONS] Error updating subscription:', error.code || 'UNKNOWN');
            alert('Ошибка при обновлении подписки');
        }
    };

    const reorderSubscriptions = async (oldIndex, newIndex) => {
        if (oldIndex === newIndex) return;

        const updates = buildReorderUpdates(subscriptions, oldIndex, newIndex);

        if (isDemoUser(user)) {
            setSubscriptions((prev) => applyOrderUpdates(prev, updates));
            return;
        }

        try {
            await commitOrderUpdates(db, user.uid, 'subscriptions', updates);
        } catch (error) {
            console.error('[SUBSCRIPTIONS] Error reordering subscriptions:', error);
            alert('Ошибка при изменении порядка подписок');
        }
    };

    const reorderCategories = async (oldIndex, newIndex) => {
        if (oldIndex === newIndex) return;

        const updates = buildReorderUpdates(categories, oldIndex, newIndex);

        if (isDemoUser(user)) {
            setCategories((prev) => applyOrderUpdates(prev, updates));
            return;
        }

        try {
            await commitOrderUpdates(db, user.uid, 'categories', updates);
        } catch (error) {
            console.error('[SUBSCRIPTIONS] Error reordering categories:', error);
            alert('Ошибка при изменении порядка категорий');
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

        if (isDemoUser(user)) {
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
        await updateUserCollectionDoc(db, user.uid, 'categories', id, data);

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
            updateCategory,
            reorderSubscriptions,
            reorderCategories
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
}
