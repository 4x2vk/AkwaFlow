import React, { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSubscriptions } from '../context/SubscriptionContext';
import { CategoryModal } from '../components/features/CategoryModal';
import { CategoryItem } from '../components/features/CategoryItem';
import { useExpenses } from '../context/ExpenseContext';
import { useIncomes } from '../context/IncomeContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// Custom modifier to restrict movement to vertical axis only
const restrictToVerticalAxis = ({ transform }) => {
    return {
        ...transform,
        x: 0,
    };
};

// Custom modifier to restrict movement within parent container
const restrictToParentElement = ({ transform, draggingNodeRect, containerNodeRect, windowRect }) => {
    if (!draggingNodeRect) {
        return transform;
    }
    
    // If we have container bounds, use them
    if (containerNodeRect) {
        const minY = 0;
        const maxY = containerNodeRect.height - draggingNodeRect.height;
        return {
            ...transform,
            y: Math.max(minY, Math.min(maxY, transform.y)),
            x: 0,
        };
    }
    
    // Otherwise just restrict horizontal movement
    return {
        ...transform,
        x: 0,
    };
};

export default function Categories() {
    const { subscriptions, categories: userCategories, removeSubscription, removeCategory, reorderCategories } = useSubscriptions();
    const { expenses } = useExpenses();
    const { incomes } = useIncomes();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    const handleDragEnd = (event) => {
        const { active, over } = event;
        
        if (over && active.id !== over.id) {
            // Only reorder user categories (filter out default ones)
            const reorderableCategories = categoriesList.filter(cat => !cat.isDefault);
            const oldIndex = reorderableCategories.findIndex((cat) => {
                const catId = cat.id || cat.name;
                return catId === active.id;
            });
            const newIndex = reorderableCategories.findIndex((cat) => {
                const catId = cat.id || cat.name;
                return catId === over.id;
            });
            
            if (oldIndex !== -1 && newIndex !== -1) {
                // Map to userCategories indices
                const userCategoriesSorted = [...userCategories].sort((a, b) => {
                    const aOrder = a.order !== undefined ? a.order : Infinity;
                    const bOrder = b.order !== undefined ? b.order : Infinity;
                    if (aOrder !== bOrder) {
                        return aOrder - bOrder;
                    }
                    return (a.name || '').localeCompare(b.name || '');
                });
                
                const userOldIndex = userCategoriesSorted.findIndex(cat => {
                    const catId = cat.id || cat.name;
                    return catId === active.id;
                });
                const userNewIndex = userCategoriesSorted.findIndex(cat => {
                    const catId = cat.id || cat.name;
                    return catId === over.id;
                });
                
                if (userOldIndex !== -1 && userNewIndex !== -1) {
                    reorderCategories(userOldIndex, userNewIndex);
                }
            }
        }
    };

    // Ensure "Общие" exists in the list for display if subscriptions use it, 
    // or if we want it as a default fallback.
    const hasGeneral = userCategories.some(c => c.name === 'Общие');
    const displayCategories = hasGeneral
        ? userCategories
        : [{ name: 'Общие', color: '#6B7280', id: 'general_default' }, ...userCategories];

    // Dedupe
    const uniqueCategories = displayCategories.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);

    const categoriesList = uniqueCategories.map(cat => {
        const subsInCat = subscriptions.filter(s => s.category === cat.name);
        const expensesInCat = expenses.filter(e => e.category === cat.name);
        const incomesInCat = incomes.filter(i => i.category === cat.name);

        // Totals per currency:
        // - subscriptions: `cost`
        // - expenses: `amount` (outgoing)
        // - incomes: `amount` (incoming)
        const spendByCurrency = [...subsInCat, ...expensesInCat].reduce((acc, item) => {
            const sym = item.currencySymbol || '₩';
            const value = (item.cost != null ? item.cost : item.amount) || 0;
            acc[sym] = (acc[sym] || 0) + value;
            return acc;
        }, {});

        const incomeByCurrency = incomesInCat.reduce((acc, item) => {
            const sym = item.currencySymbol || '₩';
            const value = Number(item.amount || 0);
            acc[sym] = (acc[sym] || 0) + value;
            return acc;
        }, {});

        return {
            ...cat,
            subsCount: subsInCat.length,
            expensesCount: expensesInCat.length,
            incomesCount: incomesInCat.length,
            spendByCurrency,
            incomeByCurrency,
            subs: subsInCat,
            isDefault: cat.name === 'Общие' && cat.id === 'general_default'
        };
    }).filter(c => (c.subsCount > 0 || c.expensesCount > 0 || c.incomesCount > 0) || !c.isDefault); // hide default if вообще не используется
    // Actually user said "when no category show General". So if user adds categories, General might stay if used. 

    const handleAddCategory = () => {
        setEditingCategory(null);
        setIsModalOpen(true);
    };

    const handleEditCategory = (cat) => {
        // Don't edit the hardcoded default "General"
        if (cat.isDefault) return;
        setEditingCategory(cat);
        setIsModalOpen(true);
    };

    const handleDeleteCategory = (e, category) => {
        e.stopPropagation();
        if (category.isDefault) return; // Can't delete default

        if (category.count > 0) {
            if (window.confirm(`В категории "${category.name}" есть ${category.count} подписок. Удалить их все?`)) {
                category.subs.forEach(sub => removeSubscription(sub.id));
            } else {
                return;
            }
        }

        if (window.confirm(`Удалить категорию "${category.name}"?`)) {
            removeCategory(category.id);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-white">Категории</h2>
                    <Button size="sm" onClick={handleAddCategory} className="bg-primary hover:bg-primary-hover text-black font-bold rounded-lg gap-1 pl-2 pr-3">
                        <Plus size={16} />
                        Добавить
                    </Button>
                </div>

                <div className="space-y-3 pb-8">
                    {categoriesList.length === 0 ? (
                        <div className="text-center text-text-secondary py-10">
                            Нет категорий. Добавьте свою первую категорию!
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                        >
                            <SortableContext
                                items={categoriesList.map(cat => cat.id || cat.name)}
                                strategy={verticalListSortingStrategy}
                            >
                                {categoriesList.map((cat) => {
                                    const catId = cat.id || cat.name;
                                    return (
                                        <CategoryItem
                                            key={catId}
                                            id={catId}
                                            name={cat.name}
                                            color={cat.color}
                                            subsCount={cat.subsCount}
                                            expensesCount={cat.expensesCount}
                                            incomesCount={cat.incomesCount}
                                            spendByCurrency={cat.spendByCurrency}
                                            incomeByCurrency={cat.incomeByCurrency}
                                            isDefault={cat.isDefault}
                                            onDelete={(e) => handleDeleteCategory(e, cat)}
                                            onClick={() => handleEditCategory(cat)}
                                        />
                                    );
                                })}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>

            <CategoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={editingCategory}
            />
        </Layout>
    );
}
