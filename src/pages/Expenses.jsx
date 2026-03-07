import React, { useMemo, useState } from 'react';
import { Plus, Wallet, TrendingUp, Calendar } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MonthPicker } from '../components/ui/MonthPicker';
import { AddExpenseModal } from '../components/features/AddExpenseModal';
import { ExpenseItem } from '../components/features/ExpenseItem';
import { useExpenses } from '../context/ExpenseContext';

const getMonthKey = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function Expenses() {
    const { expenses, loading, removeExpense, reorderExpenses } = useExpenses();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    const now = useMemo(() => new Date(), []);
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth); // null = все месяцы
    
    // Sort expenses by order
    const sortedExpenses = useMemo(() => {
        return [...expenses].sort((a, b) => {
            const aOrder = a.order !== undefined ? a.order : Infinity;
            const bOrder = b.order !== undefined ? b.order : Infinity;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            const aTime = new Date(a.spentAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.spentAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        });
    }, [expenses]);

    const filteredExpenses = useMemo(() => {
        if (!selectedMonth) return sortedExpenses;
        return sortedExpenses.filter((e) => {
            const key = getMonthKey(e.spentAt || e.createdAt);
            return key === selectedMonth;
        });
    }, [sortedExpenses, selectedMonth]);
    
    const handleMoveUp = (index) => {
        if (index === 0) return;
        const item = filteredExpenses[index];
        const prevItem = filteredExpenses[index - 1];
        const globalIndex = sortedExpenses.findIndex((e) => e.id === item.id);
        const prevGlobalIndex = sortedExpenses.findIndex((e) => e.id === prevItem?.id);
        if (globalIndex < 0 || prevGlobalIndex < 0) return;
        reorderExpenses(globalIndex, prevGlobalIndex);
    };

    const handleMoveDown = (index) => {
        if (index >= filteredExpenses.length - 1) return;
        const item = filteredExpenses[index];
        const nextItem = filteredExpenses[index + 1];
        const globalIndex = sortedExpenses.findIndex((e) => e.id === item.id);
        const nextGlobalIndex = sortedExpenses.findIndex((e) => e.id === nextItem.id);
        if (globalIndex < 0 || nextGlobalIndex < 0) return;
        reorderExpenses(globalIndex, nextGlobalIndex);
    };

    const thisMonthKey = selectedMonth || defaultMonth;
    const prevMonthDate = useMemo(() => {
        const [y, m] = (selectedMonth || defaultMonth).split('-').map(Number);
        return new Date(y, m - 2, 1);
    }, [selectedMonth, defaultMonth]);
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
                    {/* Этот месяц - оранжевая карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-orange-500/10 border border-orange-500/30 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-orange-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-orange-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <Wallet size={28} className="text-orange-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">этот месяц</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(totalsThisMonth).length > 0 ? (
                                Object.entries(totalsThisMonth).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-lg text-orange-400 whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-orange-400">₩0</div>
                            )}
                        </div>
                    </Card>

                    {/* Расходов - темная карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-black/50 border border-white/10 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-white/5"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <TrendingUp size={28} className="text-white" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">расходов</span>
                        <div className="font-bold text-xl text-white relative z-10 mt-1">{selectedMonth ? filteredExpenses.length : expenses.length}</div>
                    </Card>

                    {/* Прошлый - темная карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-black/50 border border-white/10 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-white/5"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <Calendar size={28} className="text-white" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">прошлый</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(totalsPrevMonth).length > 0 ? (
                                Object.entries(totalsPrevMonth).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-lg text-white whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-white">₩0</div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center justify-between">
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
                    <MonthPicker
                        value={selectedMonth}
                        onChange={setSelectedMonth}
                        placeholder="Все месяцы"
                    />
                </div>

                <div className="space-y-3 pb-8">
                    {loading ? (
                        <div className="text-center text-text-secondary py-8">
                            Загрузка...
                        </div>
                    ) : (
                        <>
                            {filteredExpenses.map((e, index) => (
                                <ExpenseItem
                                    key={e.id}
                                    id={e.id}
                                    {...e}
                                    index={index}
                                    totalItems={filteredExpenses.length}
                                    onDelete={() => removeExpense(e.id)}
                                    onClick={() => handleEdit(e)}
                                    onMoveUp={() => handleMoveUp(index)}
                                    onMoveDown={() => handleMoveDown(index)}
                                />
                            ))}
                            {filteredExpenses.length === 0 && (
                                <Card className="bg-surface border-white/5 p-6 text-center">
                                    <div className="text-text-secondary">
                                        {selectedMonth
                                            ? `Нет расходов за ${new Date(selectedMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}.`
                                            : 'Пока нет расходов. Добавьте первый расход, чтобы сравнивать траты по месяцам.'}
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

