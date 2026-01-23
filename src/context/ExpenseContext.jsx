import React, { createContext, useContext, useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, writeBatch } from 'firebase/firestore';
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
            // Sort by order field, then by spentAt/createdAt if order is missing
            items.sort((a, b) => {
                const aOrder = a.order !== undefined ? a.order : Infinity;
                const bOrder = b.order !== undefined ? b.order : Infinity;
                if (aOrder !== bOrder) {
                    return aOrder - bOrder;
                }
                // If order is the same or missing, sort newest first
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
            const maxOrder = expenses.length > 0 
                ? Math.max(...expenses.map(e => e.order || 0))
                : -1;
            const newItem = { 
                ...expense, 
                id: Date.now().toString(), 
                order: maxOrder + 1,
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

        const maxOrder = expenses.length > 0 
            ? Math.max(...expenses.map(e => e.order || 0))
            : -1;

        await addDoc(collection(db, 'users', user.uid, 'expenses'), {
            ...validation.data,
            order: maxOrder + 1,
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
        
        const sortedExpenses = [...expenses].sort((a, b) => {
            const aOrder = a.order !== undefined ? a.order : Infinity;
            const bOrder = b.order !== undefined ? b.order : Infinity;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            const aTime = new Date(a.spentAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.spentAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        });
        
        const [movedItem] = sortedExpenses.splice(oldIndex, 1);
        sortedExpenses.splice(newIndex, 0, movedItem);
        
        // Update orders
        const updates = sortedExpenses.map((expense, index) => ({
            id: expense.id,
            order: index
        }));
        
        if (!user || user.uid === 'demo_user') {
            // Update local state
            const updatedExpenses = expenses.map(expense => {
                const update = updates.find(u => u.id === expense.id);
                return update ? { ...expense, order: update.order } : expense;
            });
            setExpenses(updatedExpenses);
            return;
        }
        
        // Update Firestore in batch
        try {
            const batch = writeBatch(db);
            updates.forEach(({ id, order }) => {
                const expenseRef = doc(db, 'users', user.uid, 'expenses', id);
                batch.update(expenseRef, { order });
            });
            await batch.commit();
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

