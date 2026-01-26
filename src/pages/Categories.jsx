import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSubscriptions } from '../context/SubscriptionContext';
import { CategoryModal } from '../components/features/CategoryModal';
import { CategoryItem } from '../components/features/CategoryItem';
import { useExpenses } from '../context/ExpenseContext';
import { useIncomes } from '../context/IncomeContext';

export default function Categories() {
    const { subscriptions, categories: userCategories, removeSubscription, removeCategory, reorderCategories } = useSubscriptions();
    const { expenses } = useExpenses();
    const { incomes } = useIncomes();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    // Sort user categories by order
    const sortedUserCategories = useMemo(() => {
        return [...userCategories].sort((a, b) => {
            const aOrder = a.order !== undefined ? a.order : Infinity;
            const bOrder = b.order !== undefined ? b.order : Infinity;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [userCategories]);

    // Ensure "Общие" exists in the list for display if subscriptions use it, 
    // or if we want it as a default fallback.
    const hasGeneral = userCategories.some(c => c.name === 'Общие');
    const displayCategories = hasGeneral
        ? sortedUserCategories
        : [{ name: 'Общие', color: '#6B7280', id: 'general_default' }, ...sortedUserCategories];

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

    // Get only user categories (non-default) for reordering
    const userCategoriesInList = categoriesList.filter(cat => !cat.isDefault);
    
    const handleMoveUp = (index) => {
        // Find the actual index in userCategoriesInList
        const category = userCategoriesInList[index];
        if (!category || index === 0) return;
        
        // Find the index in sortedUserCategories
        const catId = category.id || category.name;
        const oldIndex = sortedUserCategories.findIndex(c => (c.id || c.name) === catId);
        if (oldIndex === -1 || oldIndex === 0) return;
        
        // Move to top (index 0)
        reorderCategories(oldIndex, 0);
    };
    
    const handleMoveDown = (index) => {
        // Find the actual index in userCategoriesInList
        const category = userCategoriesInList[index];
        if (!category || index >= userCategoriesInList.length - 1) return;
        
        // Find the index in sortedUserCategories
        const catId = category.id || category.name;
        const oldIndex = sortedUserCategories.findIndex(c => (c.id || c.name) === catId);
        if (oldIndex === -1 || oldIndex >= sortedUserCategories.length - 1) return;
        
        // Move down one position
        reorderCategories(oldIndex, oldIndex + 1);
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
                        <>
                            {categoriesList.map((cat, index) => {
                                const catId = cat.id || cat.name;
                                // Find index in userCategoriesInList for non-default categories
                                const userCategoryIndex = cat.isDefault ? -1 : userCategoriesInList.findIndex(c => (c.id || c.name) === catId);
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
                                        index={userCategoryIndex}
                                        totalItems={userCategoriesInList.length}
                                        onDelete={(e) => handleDeleteCategory(e, cat)}
                                        onClick={() => handleEditCategory(cat)}
                                        onMoveUp={() => handleMoveUp(userCategoryIndex)}
                                        onMoveDown={() => handleMoveDown(userCategoryIndex)}
                                    />
                                );
                            })}
                        </>
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
