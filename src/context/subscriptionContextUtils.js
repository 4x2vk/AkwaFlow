import { addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
    getNextOrder,
    mapSnapshotDocs,
    sortByOrderThenDate,
    sortByOrderThenText
} from '../lib/orderedCollections';

export function isDemoUser(user) {
    return !user || user.uid === 'demo_user';
}

export async function ensureUserExists(db, uid) {
    try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                telegramId: String(uid)
            });
            console.log(`[SUBSCRIPTIONS] Created user document for ${uid}`);
            return;
        }

        await updateDoc(userDocRef, {
            lastSeen: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[SUBSCRIPTIONS] Error ensuring user exists for ${uid}:`, error);
    }
}

export function mapSubscriptionItems(querySnapshot) {
    return sortByOrderThenDate(
        mapSnapshotDocs(querySnapshot, ['createdAt', 'nextPaymentDate']),
        ['createdAt']
    );
}

export function mapCategoryItems(querySnapshot) {
    return sortByOrderThenText(
        mapSnapshotDocs(querySnapshot),
        'name'
    );
}

export function createDemoEntity(list, payload, extra = {}) {
    return {
        ...payload,
        ...extra,
        id: Date.now().toString(),
        order: getNextOrder(list)
    };
}

export async function addUserCollectionDoc(db, userId, collectionName, payload) {
    return addDoc(collection(db, 'users', userId, collectionName), payload);
}

export async function deleteUserCollectionDoc(db, userId, collectionName, id) {
    return deleteDoc(doc(db, 'users', userId, collectionName, id));
}

export async function updateUserCollectionDoc(db, userId, collectionName, id, payload) {
    return updateDoc(doc(db, 'users', userId, collectionName, id), payload);
}
