import React, { createContext, useContext, useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { validateAndSanitizeIncome } from '../lib/validation';
import {
    applyOrderUpdates,
    buildReorderUpdates,
    commitOrderUpdates,
    mapSnapshotDocs,
    sortByOrderThenDate
} from '../lib/orderedCollections';

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
            const items = sortByOrderThenDate(
                mapSnapshotDocs(querySnapshot, ['createdAt', 'receivedAt']),
                ['receivedAt', 'createdAt']
            );
            setIncomes(items);
            setLoadedUid(user.uid);
            setLoadError(null);
        }, (error) => {
            console.error('[INCOMES] Snapshot error:', error);
            setIncomes([]);
            setLoadedUid(user.uid);
            setLoadError(error);
        });

        return () => unsub();
    }, [user?.uid]);

    const effectiveUid = user?.uid || null;
    const loading = effectiveUid ? (loadedUid !== effectiveUid && !loadError) : false;
    const visibleIncomes = effectiveUid && loadedUid === effectiveUid ? incomes : [];

    const addIncome = async (income) => {
        const newOrder = -Date.now();
        if (!user || user.uid === 'demo_user') {
            const newItem = { 
                ...income, 
                id: Date.now().toString(), 
                order: newOrder,
                createdAt: new Date().toISOString() 
            };
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
                order: newOrder,
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

    const reorderIncomes = async (oldIndex, newIndex) => {
        if (oldIndex === newIndex) return;

        const updates = buildReorderUpdates(
            sortByOrderThenDate(incomes, ['receivedAt', 'createdAt']),
            oldIndex,
            newIndex
        );

        if (!user || user.uid === 'demo_user') {
            setIncomes((prev) => applyOrderUpdates(prev, updates));
            return;
        }

        try {
            await commitOrderUpdates(db, user.uid, 'incomes', updates);
        } catch (error) {
            console.error('[INCOMES] Error reordering incomes:', error);
            alert('Ошибка при изменении порядка доходов');
        }
    };

    return (
        <IncomeContext.Provider value={{
            incomes: visibleIncomes,
            loading,
            loadError,
            addIncome,
            removeIncome,
            updateIncome,
            reorderIncomes
        }}>
            {children}
        </IncomeContext.Provider>
    );
}

