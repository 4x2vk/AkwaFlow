import React, { useMemo, useState } from 'react';
import { Plus, Calendar, TrendingUp, Coins } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AddIncomeModal } from '../components/features/AddIncomeModal';
import { IncomeItem } from '../components/features/IncomeItem';
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

export default function Incomes() {
    const { incomes, loading, removeIncome, reorderIncomes } = useIncomes();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState(null);
    
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
            const oldIndex = incomes.findIndex((income) => income.id === active.id);
            const newIndex = incomes.findIndex((income) => income.id === over.id);
            
            reorderIncomes(oldIndex, newIndex);
        }
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
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                        >
                            <SortableContext
                                items={incomes.map(e => e.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {incomes.map((e) => (
                                    <IncomeItem
                                        key={e.id}
                                        id={e.id}
                                        {...e}
                                        onDelete={() => removeIncome(e.id)}
                                        onClick={() => handleEdit(e)}
                                    />
                                ))}
                            </SortableContext>
                            {incomes.length === 0 && (
                                <Card className="bg-surface border-white/5 p-6 text-center">
                                    <div className="text-text-secondary">
                                        Пока нет доходов. Добавьте первый доход, чтобы видеть баланс в аналитике.
                                    </div>
                                </Card>
                            )}
                        </DndContext>
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

