import React, { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSubscriptions } from '../context/SubscriptionContext';
import { CategoryModal } from '../components/features/CategoryModal';
import { useExpenses } from '../context/ExpenseContext';

export default function Categories() {
    const { subscriptions, categories: userCategories, removeSubscription, removeCategory } = useSubscriptions();
    const { expenses } = useExpenses();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

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

        // Calculate totals per currency for this category:
        // subscriptions use `cost`, expenses use `amount`
        const costByCurrency = [...subsInCat, ...expensesInCat].reduce((acc, item) => {
            const sym = item.currencySymbol || '₩';
            const value = (item.cost != null ? item.cost : item.amount) || 0;
            acc[sym] = (acc[sym] || 0) + value;
            return acc;
        }, {});

        return {
            ...cat,
            subsCount: subsInCat.length,
            expensesCount: expensesInCat.length,
            costByCurrency,
            subs: subsInCat,
            isDefault: cat.name === 'Общие' && cat.id === 'general_default'
        };
    }).filter(c => (c.subsCount > 0 || c.expensesCount > 0) || !c.isDefault); // hide default if вообще не используется
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

                <div className="space-y-3">
                    {categoriesList.length === 0 && (
                        <div className="text-center text-text-secondary py-10">
                            Нет категорий. Добавьте свою первую категорию!
                        </div>
                    )}

                    {categoriesList.map((cat) => (
                        <Card
                            key={cat.id || cat.name}
                            onClick={() => handleEditCategory(cat)}
                            className={`relative overflow-hidden flex items-center justify-between p-4 border-white/10 bg-black/40 hover:bg-black/50 backdrop-blur-sm transition-all rounded-2xl group ${!cat.isDefault ? 'cursor-pointer' : ''}`}
                        >
                            {/* Декоративные элементы */}
                            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/6"></div>
                            <div className="absolute top-1/3 right-0 w-16 h-16 rounded-full bg-white/4"></div>
                            
                            <div className="flex items-center gap-4 relative z-10">
                                <div
                                    className="w-12 h-12 rounded-2xl shadow-lg transition-transform group-hover:scale-105"
                                    style={{ backgroundColor: cat.color }}
                                />
                                <div>
                                    <h3 className="font-bold text-white text-base">{cat.name}</h3>
                                    <p className="text-xs text-white/60">
                                        {cat.subsCount} подписок
                                        {cat.expensesCount > 0 && ` · ${cat.expensesCount} расходов`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 relative z-10">
                                <div className="text-right flex flex-col items-end">
                                    {Object.entries(cat.costByCurrency).length > 0 ? (
                                        Object.entries(cat.costByCurrency).map(([sym, cost]) => (
                                            <div key={sym} className="font-bold text-white text-base">
                                                {sym}{cost.toLocaleString()}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="font-bold text-white text-base">₩0</div>
                                    )}
                                </div>
                                {!cat.isDefault && (
                                    <button
                                        className="text-white/40 hover:text-red-500 transition-all p-2 hover:scale-110"
                                        onClick={(e) => handleDeleteCategory(e, cat)}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </Card>
                    ))}
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
