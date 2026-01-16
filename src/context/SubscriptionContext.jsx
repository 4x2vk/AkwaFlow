import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';

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


    useEffect(() => {
        if (!user?.uid) {
            setSubscriptions([]);
            setCategories([]);
            setLoading(false);
            return;
        }

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
            console.log('[SUBSCRIPTIONS] Adding subscription to Firebase for user:', user.uid);
            console.log('[SUBSCRIPTIONS] Subscription data:', sub);
            
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
            
            // Show error to user (you might want to add a toast notification here)
            alert('Ошибка при добавлении подписки: ' + error.message);
            throw error; // Re-throw so caller can handle it
        }
    };

    const removeSubscription = async (id) => {
        if (!user || user.uid === 'demo_user') {
            setSubscriptions(subscriptions.filter(s => s.id !== id));
            return;
        }
        await deleteDoc(doc(db, 'users', user.uid, 'subscriptions', id));
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
        await updateDoc(doc(db, 'users', user.uid, 'subscriptions', id), data);
    };

    const updateCategory = async (id, data) => {
        if (!user || user.uid === 'demo_user') {
            setCategories(categories.map(c => c.id === id ? { ...c, ...data } : c));
            return;
        }
        await updateDoc(doc(db, 'users', user.uid, 'categories', id), data);
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
