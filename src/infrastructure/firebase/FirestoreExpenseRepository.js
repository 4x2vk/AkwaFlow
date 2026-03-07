/**
 * Реализация ExpenseRepository для Firestore.
 * Infrastructure слой — реализует domain/ports/ExpenseRepository.
 */

import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, writeBatch } from 'firebase/firestore';
import { toExpense } from '../../domain/entities/expense.js';

/**
 * Репозиторий расходов для одного пользователя (Firestore).
 * @param {import('firebase/firestore').Firestore} firestore - экземпляр Firestore
 * @param {string} userId - uid пользователя
 */
export function createFirestoreExpenseRepository(firestore, userId) {
    const coll = () => collection(firestore, 'users', userId, 'expenses');

    return {
        subscribe(callback) {
            const q = query(coll());
            const unsub = onSnapshot(q, (snapshot) => {
                const items = [];
                snapshot.forEach((d) => {
                    items.push(toExpense({ id: d.id, data: d.data() }));
                });
                items.sort((a, b) => {
                    const aOrder = a.order !== undefined ? a.order : Infinity;
                    const bOrder = b.order !== undefined ? b.order : Infinity;
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    const aTime = new Date(a.spentAt || a.createdAt || 0).getTime();
                    const bTime = new Date(b.spentAt || b.createdAt || 0).getTime();
                    return bTime - aTime;
                });
                callback(items);
            }, (error) => {
                console.error('[FirestoreExpenseRepository] Snapshot error:', error);
                callback([]);
            });
            return unsub;
        },

        async add(expense) {
            const current = await getCurrentOrders(firestore, userId);
            const maxOrder = current.length > 0 ? Math.max(...current.map((e) => e.order ?? 0)) : -1;
            await addDoc(coll(), {
                ...expense,
                order: maxOrder + 1,
                createdAt: new Date().toISOString()
            });
        },

        async remove(id) {
            await deleteDoc(doc(firestore, 'users', userId, 'expenses', id));
        },

        async update(id, data) {
            await updateDoc(doc(firestore, 'users', userId, 'expenses', id), data);
        },

        async reorder(updates) {
            const batch = writeBatch(firestore);
            updates.forEach(({ id: expenseId, order }) => {
                batch.update(doc(firestore, 'users', userId, 'expenses', expenseId), { order });
            });
            await batch.commit();
        }
    };
}

async function getCurrentOrders(firestore, userId) {
    return new Promise((resolve, reject) => {
        const q = query(collection(firestore, 'users', userId, 'expenses'));
        const unsub = onSnapshot(q, (snapshot) => {
            unsub();
            const items = [];
            snapshot.forEach((d) => items.push({ id: d.id, ...d.data() }));
            resolve(items);
        }, reject);
    });
}
