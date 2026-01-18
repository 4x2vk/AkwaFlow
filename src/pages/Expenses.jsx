import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AddExpenseModal } from '../components/features/AddExpenseModal';
import { ExpenseItem } from '../components/features/ExpenseItem';
import { useExpenses } from '../context/ExpenseContext';

export default function Expenses() {
    const { expenses, loading, removeExpense } = useExpenses();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    const handleAdd = () => {
        setEditingExpense(null);
        setIsModalOpen(true);
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Расходы</h2>
                    <Button
                        size="sm"
                        className="bg-primary hover:bg-primary-hover text-black font-bold rounded-lg gap-1 pl-2 pr-3"
                        onClick={handleAdd}
                    >
                        <Plus size={16} />
                        Добавить
                    </Button>
                </div>

                <div className="space-y-3 pb-8">
                    {loading ? (
                        <div className="text-center text-text-secondary py-8">
                            Загрузка...
                        </div>
                    ) : (
                        <>
                            {expenses.map((e) => (
                                <ExpenseItem
                                    key={e.id}
                                    {...e}
                                    onDelete={() => removeExpense(e.id)}
                                    onClick={() => handleEdit(e)}
                                />
                            ))}
                            {expenses.length === 0 && (
                                <Card className="bg-surface border-white/5 p-6 text-center">
                                    <div className="text-text-secondary">
                                        Пока нет расходов. Добавьте первый расход, чтобы сравнивать траты по месяцам.
                                    </div>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>

            <AddExpenseModal
                key={`${isModalOpen ? 'open' : 'closed'}-${editingExpense?.id ?? 'new'}`}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={editingExpense}
            />
        </Layout>
    );
}

