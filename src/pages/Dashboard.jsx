import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, CreditCard, TrendingUp } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SubscriptionItem } from '../components/features/SubscriptionItem';
import { useSubscriptions } from '../context/SubscriptionContext';
import { AddSubscriptionModal } from '../components/features/AddSubscriptionModal';
import { getIcon } from '../services/iconService';

export default function Dashboard() {
    const { subscriptions, removeSubscription, updateSubscription, reorderSubscriptions, loading } = useSubscriptions();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState(null);
    
    console.log('[DASHBOARD] Render - subscriptions:', subscriptions.length, 'loading:', loading);
    
    // Sort subscriptions by order
    const sortedSubscriptions = useMemo(() => {
        return [...subscriptions].sort((a, b) => {
            const aOrder = a.order !== undefined ? a.order : Infinity;
            const bOrder = b.order !== undefined ? b.order : Infinity;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [subscriptions]);
    
    const handleMoveUp = (index) => {
        if (index === 0) return;
        // Move to top (index 0)
        reorderSubscriptions(index, 0);
    };
    
    const handleMoveDown = (index) => {
        if (index >= sortedSubscriptions.length - 1) return;
        // Move down one position
        reorderSubscriptions(index, index + 1);
    };

    // Автоматически обновляем иконки для подписок без иконок
    useEffect(() => {
        const updateIcons = async () => {
            const subscriptionsWithoutIcons = subscriptions.filter(sub => !sub.iconUrl && sub.name);
            
            if (subscriptionsWithoutIcons.length === 0) return;
            
            console.log('[DASHBOARD] Updating icons for', subscriptionsWithoutIcons.length, 'subscriptions');
            
            for (const sub of subscriptionsWithoutIcons) {
                try {
                    const iconUrl = await getIcon(sub.name, 'subscription');
                    if (iconUrl) {
                        console.log('[DASHBOARD] Found icon for', sub.name, ':', iconUrl);
                        await updateSubscription(sub.id, { iconUrl });
                    }
                } catch (error) {
                    console.warn('[DASHBOARD] Failed to get icon for', sub.name, ':', error);
                }
            }
        };
        
        // Обновляем иконки с небольшой задержкой, чтобы не блокировать рендер
        const timeoutId = setTimeout(updateIcons, 1000);
        return () => clearTimeout(timeoutId);
    }, [subscriptions, updateSubscription]);

    // Calculate totals per currency
    const totalsByCurrency = subscriptions.reduce((acc, sub) => {
        const currency = sub.currencySymbol || '₩';
        acc[currency] = (acc[currency] || 0) + (sub.cost || 0);
        return acc;
    }, {});

    const getDaysUntilNextPayment = () => {
        if (subscriptions.length === 0) return '-';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysList = subscriptions.map(sub => {
            if (!sub.nextPaymentDate) return Infinity;

            let nextDate = new Date(sub.nextPaymentDate);
            nextDate.setHours(0, 0, 0, 0);

            // If date is in the past, project it to the next occurrence
            while (nextDate < today) {
                // Assuming monthly cycle for simplicity as per current 'monthly' logic
                // If we have varied cycles (weekly/yearly), we'd need that data.
                // Defaulting to adding 1 month.
                nextDate.setMonth(nextDate.getMonth() + 1);
            }

            const diffTime = nextDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays;
        }).filter(d => d >= 0);

        if (daysList.length === 0) return '-';
        const minDays = Math.min(...daysList);
        return minDays === 0 ? 'Сегодня' : `${minDays} дн.`;
    };

    const daysUntil = getDaysUntilNextPayment();

    const handleAdd = () => {
        setEditingSubscription(null);
        setIsModalOpen(true);
    };

    const handleEdit = (sub) => {
        setEditingSubscription(sub);
        setIsModalOpen(true);
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Подписки/МЕС - фиолетовая карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-purple-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <CreditCard size={28} className="text-purple-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">подписки/мес</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(totalsByCurrency).length > 0 ? (
                                Object.entries(totalsByCurrency).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-purple-400 whitespace-nowrap truncate max-w-full text-[clamp(0.9rem,2.6vw,1.125rem)]">
                                        {curr}{amount.toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-purple-400">₩0</div>
                            )}
                        </div>
                    </Card>

                    {/* Подписок - темная карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-black/50 border border-white/10 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-white/5"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <TrendingUp size={28} className="text-white" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">подписок</span>
                        <div className="font-bold text-xl text-white relative z-10 mt-1">{subscriptions.length}</div>
                    </Card>

                    {/* До оплаты - оранжевая карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-orange-500/10 border border-orange-500/30 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-orange-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-orange-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <Calendar size={28} className="text-orange-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">до оплаты</span>
                        <div className="font-bold text-xl text-orange-400 relative z-10 mt-1">{daysUntil}</div>
                    </Card>
                </div>

                {/* List Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Список подписок</h2>
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
                                {sortedSubscriptions.map((sub, index) => (
                                    <SubscriptionItem
                                        key={sub.id}
                                        id={sub.id}
                                        {...sub}
                                        index={index}
                                        totalItems={sortedSubscriptions.length}
                                        onDelete={() => removeSubscription(sub.id)}
                                        onClick={() => handleEdit(sub)}
                                        onMoveUp={() => handleMoveUp(index)}
                                        onMoveDown={() => handleMoveDown(index)}
                                    />
                                ))}
                                {sortedSubscriptions.length === 0 && (
                                    <div className="text-center text-text-secondary py-8">
                                        Нет подписок
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            <AddSubscriptionModal
                key={`${isModalOpen ? 'open' : 'closed'}-${editingSubscription?.id ?? 'new'}`}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={editingSubscription}
            />
        </Layout>
    );
}
