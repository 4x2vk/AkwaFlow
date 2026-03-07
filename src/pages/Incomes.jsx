import React, { useMemo, useState } from 'react';
import { Plus, Calendar, TrendingUp, Coins } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MonthPicker } from '../components/ui/MonthPicker';
import { AddIncomeModal } from '../components/features/AddIncomeModal';
import { IncomeItem } from '../components/features/IncomeItem';
import { useIncomes } from '../context/IncomeContext';

const getMonthKey = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function Incomes() {
    const { incomes, loading, removeIncome, reorderIncomes } = useIncomes();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState(null);

    const now = useMemo(() => new Date(), []);
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

    // Sort incomes by order
    const sortedIncomes = useMemo(() => {
        return [...incomes].sort((a, b) => {
            const aOrder = a.order !== undefined ? a.order : Infinity;
            const bOrder = b.order !== undefined ? b.order : Infinity;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            const aTime = new Date(a.receivedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.receivedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        });
    }, [incomes]);

    const filteredIncomes = useMemo(() => {
        if (!selectedMonth) return sortedIncomes;
        return sortedIncomes.filter((e) => {
            const key = getMonthKey(e.receivedAt || e.createdAt);
            return key === selectedMonth;
        });
    }, [sortedIncomes, selectedMonth]);

    const handleMoveUp = (index) => {
        if (index === 0) return;
        const item = filteredIncomes[index];
        const globalIndex = sortedIncomes.findIndex((e) => e.id === item.id);
        if (globalIndex < 0) return;
        reorderIncomes(globalIndex, 0);
    };

    const handleMoveDown = (index) => {
        if (index >= filteredIncomes.length - 1) return;
        const item = filteredIncomes[index];
        const nextItem = filteredIncomes[index + 1];
        const globalIndex = sortedIncomes.findIndex((e) => e.id === item.id);
        const nextGlobalIndex = sortedIncomes.findIndex((e) => e.id === nextItem.id);
        if (globalIndex < 0 || nextGlobalIndex < 0) return;
        reorderIncomes(globalIndex, nextGlobalIndex);
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
        incomes.forEach((e) => {
            if (!e?.receivedAt) return;
            const d = new Date(e.receivedAt);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const sym = e.currencySymbol || '₩';
            const amt = Number(e.amount || 0);
            if (key === thisMonthKey) tThis[sym] = (tThis[sym] || 0) + amt;
            if (key === prevMonthKey) tPrev[sym] = (tPrev[sym] || 0) + amt;
        });
        return { totalsThisMonth: tThis, totalsPrevMonth: tPrev };
    }, [incomes, thisMonthKey, prevMonthKey]);

    const handleAdd = () => {
        setEditingIncome(null);
        setIsModalOpen(true);
    };

    const handleEdit = (income) => {
        setEditingIncome(income);
        setIsModalOpen(true);
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                    {/* Этот месяц - зелёная карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-green-500/10 border border-green-500/30 backdrop-blur-sm rounded-2xl">
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-green-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-green-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <Coins size={28} className="text-green-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">этот месяц</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(totalsThisMonth).length > 0 ? (
                                Object.entries(totalsThisMonth).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-green-400 whitespace-nowrap truncate max-w-full text-[clamp(0.9rem,2.6vw,1.125rem)]">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-green-400">₩0</div>
                            )}
                        </div>
                    </Card>

                    {/* Доходов - темная карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-black/50 border border-white/10 backdrop-blur-sm rounded-2xl">
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-white/5"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <TrendingUp size={28} className="text-white" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">доходов</span>
                        <div className="font-bold text-xl text-white relative z-10 mt-1">{selectedMonth ? filteredIncomes.length : incomes.length}</div>
                    </Card>

                    {/* Прошлый - темная карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-black/50 border border-white/10 backdrop-blur-sm rounded-2xl">
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-white/5"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <Calendar size={28} className="text-white" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">прошлый</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(totalsPrevMonth).length > 0 ? (
                                Object.entries(totalsPrevMonth).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-white whitespace-nowrap truncate max-w-full text-[clamp(0.9rem,2.6vw,1.125rem)]">
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
                        <h2 className="text-lg font-bold text-white">Доходы</h2>
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
                            {filteredIncomes.map((e, index) => (
                                <IncomeItem
                                    key={e.id}
                                    id={e.id}
                                    {...e}
                                    index={index}
                                    totalItems={filteredIncomes.length}
                                    onDelete={() => removeIncome(e.id)}
                                    onClick={() => handleEdit(e)}
                                    onMoveUp={() => handleMoveUp(index)}
                                    onMoveDown={() => handleMoveDown(index)}
                                />
                            ))}
                            {filteredIncomes.length === 0 && (
                                <Card className="bg-surface border-white/5 p-6 text-center">
                                    <div className="text-text-secondary">
                                        {selectedMonth
                                            ? `Нет доходов за ${new Date(selectedMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}.`
                                            : 'Пока нет доходов. Добавьте первый доход, чтобы видеть баланс в аналитике.'}
                                    </div>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>

            <AddIncomeModal
                key={`${isModalOpen ? 'open' : 'closed'}-${editingIncome?.id ?? 'new'}`}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={editingIncome}
            />
        </Layout>
    );
}

