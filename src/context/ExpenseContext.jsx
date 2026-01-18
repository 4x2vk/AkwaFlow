import React, { createContext, useContext, useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { validateAndSanitizeExpense } from '../lib/validation';

/* eslint-disable react-refresh/only-export-components */
const ExpenseContext = createContext();

export function useExpenses() {
    return useContext(ExpenseContext);
}

export function ExpenseProvider({ children }) {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [loadedUid, setLoadedUid] = useState(null);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        if (!user?.uid) return;

        const qExpenses = query(collection(db, 'users', user.uid, 'expenses'));

        const unsub = onSnapshot(qExpenses, (querySnapshot) => {
            const items = [];
            querySnapshot.forEach((d) => {
                const data = d.data();
                const processed = { ...data };

                // Normalize potential Firestore Timestamp fields
                if (data.createdAt && data.createdAt.toDate) {
                    processed.createdAt = data.createdAt.toDate().toISOString();
                }
                if (data.spentAt && data.spentAt.toDate) {
                    processed.spentAt = data.spentAt.toDate().toISOString();
                }

                items.push({ id: d.id, ...processed });
            });
            // Sort newest first (by spentAt then createdAt)
            items.sort((a, b) => {
                const aTime = new Date(a.spentAt || a.createdAt || 0).getTime();
                const bTime = new Date(b.spentAt || b.createdAt || 0).getTime();
                return bTime - aTime;
            });
            setExpenses(items);
            setLoadedUid(user.uid);
            setLoadError(null);
        }, (error) => {
            console.error('[EXPENSES] Snapshot error:', error);
            setLoadedUid(user.uid);
            setLoadError(error);
        });

        return () => unsub();
    }, [user?.uid]);

    const effectiveUid = user?.uid || null;
    const loading = effectiveUid ? (loadedUid !== effectiveUid && !loadError) : false;
    const visibleExpenses = effectiveUid && loadedUid === effectiveUid ? expenses : [];

    const addExpense = async (expense) => {
        if (!user || user.uid === 'demo_user') {
            const newItem = { ...expense, id: Date.now().toString(), createdAt: new Date().toISOString() };
            setExpenses((prev) => [newItem, ...prev]);
            return;
        }

        const validation = validateAndSanitizeExpense(expense);
        if (!validation.valid) {
            alert('Ошибка валидации: ' + validation.errors.join(', '));
            return;
        }

        await addDoc(collection(db, 'users', user.uid, 'expenses'), {
            ...validation.data,
            createdAt: new Date().toISOString()
        });
    };

    const removeExpense = async (id) => {
        if (!user || user.uid === 'demo_user') {
            setExpenses((prev) => prev.filter((e) => e.id !== id));
            return;
        }

        await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
    };

    const updateExpense = async (id, data) => {
        if (!user || user.uid === 'demo_user') {
            setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
            return;
        }

        const validation = validateAndSanitizeExpense(data);
        if (!validation.valid) {
            alert('Ошибка валидации: ' + validation.errors.join(', '));
            return;
        }

        await updateDoc(doc(db, 'users', user.uid, 'expenses', id), validation.data);
    };

    return (
        <ExpenseContext.Provider value={{
            expenses: visibleExpenses,
            loading,
            addExpense,
            removeExpense,
            updateExpense
        }}>
            {children}
        </ExpenseContext.Provider>
    );
}

