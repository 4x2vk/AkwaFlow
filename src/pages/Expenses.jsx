import React, { useMemo, useState } from 'react';
import { Plus, Receipt, TrendingUp, Calendar } from 'lucide-react';
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

    const now = useMemo(() => new Date(), []);
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = useMemo(() => new Date(now.getFullYear(), now.getMonth() - 1, 1), [now]);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const { totalsThisMonth, totalsPrevMonth } = useMemo(() => {
        const tThis = {};
        const tPrev = {};
        expenses.forEach((e) => {
            if (!e?.spentAt) return;
            const d = new Date(e.spentAt);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const sym = e.currencySymbol || '₩';
            const amt = Number(e.amount || 0);
            if (key === thisMonthKey) tThis[sym] = (tThis[sym] || 0) + amt;
            if (key === prevMonthKey) tPrev[sym] = (tPrev[sym] || 0) + amt;
        });
        return { totalsThisMonth: tThis, totalsPrevMonth: tPrev };
    }, [expenses, thisMonthKey, prevMonthKey]);

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
                <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-surface border-white/5 p-3 flex flex-col justify-between h-auto min-h-[6rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Receipt size={40} />
                        </div>
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider">Этот месяц</span>
                        <div className="flex flex-col gap-1">
                            {Object.entries(totalsThisMonth).length > 0 ? (
                                Object.entries(totalsThisMonth).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-sm text-white whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-lg text-white">0</div>
                            )}
                        </div>
                    </Card>

                    <Card className="bg-surface border-white/5 p-3 flex flex-col justify-between h-auto min-h-[6rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp size={40} />
                        </div>
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider">Расходов</span>
                        <div className="font-bold text-lg text-white">{expenses.length}</div>
                    </Card>

                    <Card className="bg-surface border-white/5 p-3 flex flex-col justify-between h-auto min-h-[6rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Calendar size={40} />
                        </div>
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider">Прошлый</span>
                        <div className="flex flex-col gap-1">
                            {Object.entries(totalsPrevMonth).length > 0 ? (
                                Object.entries(totalsPrevMonth).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-sm text-primary whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-lg text-primary">0</div>
                            )}
                        </div>
                    </Card>
                </div>

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

