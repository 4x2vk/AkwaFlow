import React, { useMemo, useState } from 'react';
import { Plus, Calendar, TrendingUp, Coins } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AddIncomeModal } from '../components/features/AddIncomeModal';
import { IncomeItem } from '../components/features/IncomeItem';
import { useIncomes } from '../context/IncomeContext';

export default function Incomes() {
    const { incomes, loading, removeIncome, reorderIncomes } = useIncomes();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState(null);
    
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
    
    const handleMoveUp = (index) => {
        if (index === 0) return;
        // Move to top (index 0)
        reorderIncomes(index, 0);
    };
    
    const handleMoveDown = (index) => {
        if (index >= sortedIncomes.length - 1) return;
        // Move down one position
        reorderIncomes(index, index + 1);
    };

    const now = useMemo(() => new Date(), []);
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = useMemo(() => new Date(now.getFullYear(), now.getMonth() - 1, 1), [now]);
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
                        <div className="font-bold text-xl text-white relative z-10 mt-1">{incomes.length}</div>
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

                <div className="flex items-center justify-between mb-4">
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

                <div className="space-y-3 pb-8">
                    {loading ? (
                        <div className="text-center text-text-secondary py-8">
                            Загрузка...
                        </div>
                    ) : (
                        <>
                            {sortedIncomes.map((e, index) => (
                                <IncomeItem
                                    key={e.id}
                                    id={e.id}
                                    {...e}
                                    index={index}
                                    totalItems={sortedIncomes.length}
                                    onDelete={() => removeIncome(e.id)}
                                    onClick={() => handleEdit(e)}
                                    onMoveUp={() => handleMoveUp(index)}
                                    onMoveDown={() => handleMoveDown(index)}
                                />
                            ))}
                            {sortedIncomes.length === 0 && (
                                <Card className="bg-surface border-white/5 p-6 text-center">
                                    <div className="text-text-secondary">
                                        Пока нет доходов. Добавьте первый доход, чтобы видеть баланс в аналитике.
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

