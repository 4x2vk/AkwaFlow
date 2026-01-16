import React, { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSubscriptions } from '../context/SubscriptionContext';
import { CategoryModal } from '../components/features/CategoryModal';

export default function Categories() {
    const { subscriptions, categories: userCategories, removeSubscription, removeCategory } = useSubscriptions();
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

        // Calculate totals per currency for this category
        const costByCurrency = subsInCat.reduce((acc, s) => {
            const sym = s.currencySymbol || '₩';
            acc[sym] = (acc[sym] || 0) + (s.cost || 0);
            return acc;
        }, {});

        return {
            ...cat,
            count: subsInCat.length,
            costByCurrency,
            subs: subsInCat,
            isDefault: cat.name === 'Общие' && cat.id === 'general_default'
        };
    }).filter(c => c.count > 0 || !c.isDefault); // Show empty user categories, but maybe hide empty default "General" if completely unused? 
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
                            className={`flex items-center justify-between p-4 border-white/5 bg-surface hover:bg-surface-hover transition-colors ${!cat.isDefault ? 'cursor-pointer' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-10 h-10 rounded-xl shadow-lg"
                                    style={{ backgroundColor: cat.color }}
                                />
                                <div>
                                    <h3 className="font-bold text-white text-base">{cat.name}</h3>
                                    <p className="text-xs text-text-secondary">{cat.count} подписок</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right flex flex-col items-end">
                                    {Object.entries(cat.costByCurrency).length > 0 ? (
                                        Object.entries(cat.costByCurrency).map(([sym, cost]) => (
                                            <div key={sym} className="font-bold text-white text-base">
                                                {sym}{cost.toLocaleString()}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="font-bold text-white text-base">0</div>
                                    )}
                                </div>
                                {!cat.isDefault && (
                                    <button
                                        className="text-text-secondary hover:text-red-500 transition-colors p-2"
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
