import React, { createContext, useContext, useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { validateAndSanitizeExpense } from '../lib/validation';
import {
    applyOrderUpdates,
    buildReorderUpdates,
    commitOrderUpdates,
    mapSnapshotDocs,
    sortByOrderThenDate
} from '../lib/orderedCollections';

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
            const items = sortByOrderThenDate(
                mapSnapshotDocs(querySnapshot, ['createdAt', 'spentAt']),
                ['spentAt', 'createdAt']
            );
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
        const newOrder = -Date.now();
        if (!user || user.uid === 'demo_user') {
            const newItem = { 
                ...expense, 
                id: Date.now().toString(), 
                order: newOrder,
                createdAt: new Date().toISOString() 
            };
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
            order: newOrder,
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

    const reorderExpenses = async (oldIndex, newIndex) => {
        if (oldIndex === newIndex) return;

        const updates = buildReorderUpdates(
            sortByOrderThenDate(expenses, ['spentAt', 'createdAt']),
            oldIndex,
            newIndex
        );

        if (!user || user.uid === 'demo_user') {
            setExpenses((prev) => applyOrderUpdates(prev, updates));
            return;
        }

        try {
            await commitOrderUpdates(db, user.uid, 'expenses', updates);
        } catch (error) {
            console.error('[EXPENSES] Error reordering expenses:', error);
            alert('Ошибка при изменении порядка расходов');
        }
    };

    return (
        <ExpenseContext.Provider value={{
            expenses: visibleExpenses,
            loading,
            addExpense,
            removeExpense,
            updateExpense,
            reorderExpenses
        }}>
            {children}
        </ExpenseContext.Provider>
    );
}

