import { doc, writeBatch } from 'firebase/firestore';

export function normalizeFirestoreFields(data, fieldNames = []) {
    return fieldNames.reduce((normalized, fieldName) => {
        const value = normalized[fieldName];

        if (value?.toDate) {
            normalized[fieldName] = value.toDate().toISOString();
        }

        return normalized;
    }, { ...data });
}

export function mapSnapshotDocs(querySnapshot, fieldNames = []) {
    const items = [];

    querySnapshot.forEach((snapshotDoc) => {
        items.push({
            id: snapshotDoc.id,
            ...normalizeFirestoreFields(snapshotDoc.data(), fieldNames)
        });
    });

    return items;
}

function getOrderValue(item) {
    return item?.order !== undefined ? item.order : Infinity;
}

function getDateValue(item, fieldNames = []) {
    for (const fieldName of fieldNames) {
        const value = item?.[fieldName];
        const timestamp = new Date(value || 0).getTime();

        if (!Number.isNaN(timestamp)) {
            return timestamp;
        }
    }

    return 0;
}

export function sortByOrderThenDate(items, fieldNames = []) {
    return [...items].sort((left, right) => {
        const leftOrder = getOrderValue(left);
        const rightOrder = getOrderValue(right);

        if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
        }

        return getDateValue(right, fieldNames) - getDateValue(left, fieldNames);
    });
}

export function sortByOrderThenText(items, textField = 'name') {
    return [...items].sort((left, right) => {
        const leftOrder = getOrderValue(left);
        const rightOrder = getOrderValue(right);

        if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
        }

        return String(left?.[textField] || '').localeCompare(String(right?.[textField] || ''));
    });
}

export function buildReorderUpdates(items, oldIndex, newIndex) {
    if (oldIndex === newIndex) {
        return [];
    }

    const reorderedItems = [...items];
    const [movedItem] = reorderedItems.splice(oldIndex, 1);

    if (!movedItem) {
        return [];
    }

    reorderedItems.splice(newIndex, 0, movedItem);

    return reorderedItems.map((item, index) => ({
        id: item.id,
        order: index
    }));
}

export function applyOrderUpdates(items, updates) {
    if (updates.length === 0) {
        return items;
    }

    const orderById = new Map(updates.map(({ id, order }) => [id, order]));

    return items.map((item) => (
        orderById.has(item.id)
            ? { ...item, order: orderById.get(item.id) }
            : item
    ));
}

export async function commitOrderUpdates(db, userId, collectionName, updates) {
    if (!userId || updates.length === 0) {
        return;
    }

    const batch = writeBatch(db);

    updates.forEach(({ id, order }) => {
        batch.update(doc(db, 'users', userId, collectionName, id), { order });
    });

    await batch.commit();
}

export function getNextOrder(items) {
    return items.length > 0
        ? Math.max(...items.map((item) => item.order || 0)) + 1
        : 0;
}
