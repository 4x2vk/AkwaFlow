import React, { createContext, useContext, useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { validateAndSanitizeIncome } from '../lib/validation';

/* eslint-disable react-refresh/only-export-components */
const IncomeContext = createContext();

export function useIncomes() {
    return useContext(IncomeContext);
}

export function IncomeProvider({ children }) {
    const { user } = useAuth();
    const [incomes, setIncomes] = useState([]);
    const [loadedUid, setLoadedUid] = useState(null);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        if (!user?.uid) return;

        const qIncomes = query(collection(db, 'users', user.uid, 'incomes'));

        const unsub = onSnapshot(qIncomes, (querySnapshot) => {
            const items = [];
            querySnapshot.forEach((d) => {
                const data = d.data();
                const processed = { ...data };

                // Normalize potential Firestore Timestamp fields
                if (data.createdAt && data.createdAt.toDate) {
                    processed.createdAt = data.createdAt.toDate().toISOString();
                }
                if (data.receivedAt && data.receivedAt.toDate) {
                    processed.receivedAt = data.receivedAt.toDate().toISOString();
                }

                items.push({ id: d.id, ...processed });
            });
            // Sort newest first (by receivedAt then createdAt)
            items.sort((a, b) => {
                const aTime = new Date(a.receivedAt || a.createdAt || 0).getTime();
                const bTime = new Date(b.receivedAt || b.createdAt || 0).getTime();
                return bTime - aTime;
            });
            setIncomes(items);
            setLoadedUid(user.uid);
            setLoadError(null);
        }, (error) => {
            console.error('[INCOMES] Snapshot error:', error);
            setLoadedUid(user.uid);
            setLoadError(error);
        });

        return () => unsub();
    }, [user?.uid]);

    const effectiveUid = user?.uid || null;
    const loading = effectiveUid ? (loadedUid !== effectiveUid && !loadError) : false;
    const visibleIncomes = effectiveUid && loadedUid === effectiveUid ? incomes : [];

    const addIncome = async (income) => {
        if (!user || user.uid === 'demo_user') {
            const newItem = { ...income, id: Date.now().toString(), createdAt: new Date().toISOString() };
            setIncomes((prev) => [newItem, ...prev]);
            return;
        }

        const validation = validateAndSanitizeIncome(income);
        if (!validation.valid) {
            alert('Ошибка валидации: ' + validation.errors.join(', '));
            return;
        }

        try {
            await addDoc(collection(db, 'users', user.uid, 'incomes'), {
                ...validation.data,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('[INCOMES] Error adding income:', {
                code: error?.code,
                message: error?.message
            });
            throw error;
        }
    };

    const removeIncome = async (id) => {
        if (!user || user.uid === 'demo_user') {
            setIncomes((prev) => prev.filter((e) => e.id !== id));
            return;
        }

        await deleteDoc(doc(db, 'users', user.uid, 'incomes', id));
    };

    const updateIncome = async (id, data) => {
        if (!user || user.uid === 'demo_user') {
            setIncomes((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
            return;
        }

        const validation = validateAndSanitizeIncome(data);
        if (!validation.valid) {
            alert('Ошибка валидации: ' + validation.errors.join(', '));
            return;
        }

        await updateDoc(doc(db, 'users', user.uid, 'incomes', id), validation.data);
    };

    return (
        <IncomeContext.Provider value={{
            incomes: visibleIncomes,
            loading,
            addIncome,
            removeIncome,
            updateIncome
        }}>
            {children}
        </IncomeContext.Provider>
    );
}

