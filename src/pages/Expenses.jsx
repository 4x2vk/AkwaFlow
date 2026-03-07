import React, { useMemo, useState } from 'react';
import { Plus, Wallet, TrendingUp, Calendar } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MonthPicker } from '../components/ui/MonthPicker';
import { AddExpenseModal } from '../components/features/AddExpenseModal';
import { ExpenseItem } from '../components/features/ExpenseItem';
import { useExpenses } from '../context/ExpenseContext';
import { sortByOrderThenDate } from '../lib/orderedCollections';
import {
    buildMonthCurrencyTotals,
    filterItemsByMonth,
    getDefaultMonthKey,
    getPreviousMonthKey,
    resolveReorderMove
} from '../lib/transactionPageUtils';

export default function Expenses() {
    const { expenses, loading, removeExpense, reorderExpenses } = useExpenses();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    const now = useMemo(() => new Date(), []);
    const defaultMonth = getDefaultMonthKey(now);
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth); // null = все месяцы
    
    const sortedExpenses = useMemo(
        () => sortByOrderThenDate(expenses, ['spentAt', 'createdAt']),
        [expenses]
    );

    const filteredExpenses = useMemo(
        () => filterItemsByMonth(sortedExpenses, selectedMonth, ['spentAt', 'createdAt']),
        [selectedMonth, sortedExpenses]
    );
    
    const handleMoveUp = (index) => {
        const move = resolveReorderMove(filteredExpenses, sortedExpenses, index, 'up');
        if (!move) return;
        reorderExpenses(move.fromIndex, move.toIndex);
    };

    const handleMoveDown = (index) => {
        const move = resolveReorderMove(filteredExpenses, sortedExpenses, index, 'down');
        if (!move) return;
        reorderExpenses(move.fromIndex, move.toIndex);
    };

    const thisMonthKey = selectedMonth || defaultMonth;
    const prevMonthKey = useMemo(
        () => getPreviousMonthKey(thisMonthKey),
        [thisMonthKey]
    );

    const { totalsThisMonth, totalsPrevMonth } = useMemo(
        () => buildMonthCurrencyTotals(expenses, {
            dateFields: ['spentAt', 'createdAt'],
            currentMonthKey: thisMonthKey,
            previousMonthKey: prevMonthKey
        }),
        [expenses, prevMonthKey, thisMonthKey]
    );

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

