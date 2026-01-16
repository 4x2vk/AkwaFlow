import React, { useState } from 'react';
import { Plus, Calendar, CreditCard, TrendingUp } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SubscriptionItem } from '../components/features/SubscriptionItem';
import { useSubscriptions } from '../context/SubscriptionContext';
import { AddSubscriptionModal } from '../components/features/AddSubscriptionModal';

export default function Dashboard() {
    const { subscriptions, removeSubscription, loading } = useSubscriptions();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState(null);
    
    console.log('[DASHBOARD] Render - subscriptions:', subscriptions.length, 'loading:', loading);

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
                    <Card className="bg-surface border-white/5 p-3 flex flex-col justify-between h-auto min-h-[6rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CreditCard size={40} />
                        </div>
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider">В месяц</span>
                        <div className="flex flex-col gap-1">
                            {Object.entries(totalsByCurrency).length > 0 ? (
                                Object.entries(totalsByCurrency).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-sm text-white whitespace-nowrap">
                                        {curr}{amount.toLocaleString()}
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
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider">Подписок</span>
                        <div className="font-bold text-lg text-white">{subscriptions.length}</div>
                    </Card>

                    <Card className="bg-surface border-white/5 p-3 flex flex-col justify-between h-auto min-h-[6rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Calendar size={40} />
                        </div>
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider">До оплаты</span>
                        <div className="font-bold text-lg text-primary">{daysUntil}</div>
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
                                {subscriptions.map(sub => (
                                    <SubscriptionItem
                                        key={sub.id}
                                        {...sub}
                                        onDelete={() => removeSubscription(sub.id)}
                                        onClick={() => handleEdit(sub)}
                                    />
                                ))}
                                {subscriptions.length === 0 && (
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
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={editingSubscription}
            />
        </Layout>
    );
}
