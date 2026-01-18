import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSubscriptions } from '../../context/SubscriptionContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { getIcon } from '../../services/iconService';
import { validateAndSanitizeSubscription } from '../../lib/validation';

export function AddSubscriptionModal({ isOpen, onClose, initialData = null }) {
    const { addSubscription, updateSubscription, categories } = useSubscriptions();
    const [formData, setFormData] = useState({
        name: '',
        cost: '',
        currency: 'WON',
        date: '',
        category: 'Общие',
        color: '#a78bfa',
        billingPeriod: 'monthly' // 'monthly' or 'yearly'
    });

    const currencies = [
        { code: 'WON', symbol: '₩' },
        { code: 'RUB', symbol: '₽' },
        { code: 'USD', symbol: '$' },
        { code: 'KZT', symbol: '₸' }
    ];

    // Combine user categories with "Общие" if not present
    const hasGeneral = categories.some(c => c.name === 'Общие');
    const displayCategories = hasGeneral
        ? categories
        : [{ name: 'Общие', color: '#6B7280' }, ...categories];

    // Deduplicate just in case
    const uniqueCategories = displayCategories.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);

    useEffect(() => {
        if (initialData) {
            // Determine billing period from cycle
            let billingPeriod = 'monthly';
            if (initialData.cycle && initialData.cycle.includes('год')) {
                billingPeriod = 'yearly';
            }
            
            setFormData({
                name: initialData.name,
                cost: initialData.cost,
                currency: initialData.currency || 'WON',
                date: initialData.nextPaymentDate || '',
                category: initialData.category || 'Общие',
                color: initialData.color || '#a78bfa',
                billingPeriod: billingPeriod
            });
        } else {
            setFormData({
                name: '',
                cost: '',
                currency: 'WON',
                date: '',
                category: 'Общие',
                color: '#a78bfa',
                billingPeriod: 'monthly'
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const selectedCat = uniqueCategories.find(c => c.name === formData.category);
        const currencySymbol = currencies.find(c => c.code === formData.currency)?.symbol || '₩';

        // Determine cycle text based on billing period
        let cycleText = 'Ежемесячно';
        if (formData.billingPeriod === 'yearly') {
            if (formData.date) {
                const paymentDate = new Date(formData.date);
                cycleText = `Ежегодно, ${paymentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
            } else {
                cycleText = 'Ежегодно';
            }
        } else {
            if (formData.date) {
                cycleText = `Каждый ${new Date(formData.date).getDate()} числа`;
            }
        }

        // Получаем иконку из API
        let iconUrl = null;
        let iconText = formData.name[0].toUpperCase();
        
        try {
            iconUrl = await getIcon(formData.name, 'subscription');
            console.log('[MODAL] Icon fetched:', iconUrl);
        } catch (error) {
            console.warn('[MODAL] Failed to fetch icon:', error);
            // Продолжаем без иконки, используем первую букву
        }

        // Валидация и санитизация данных
        const rawData = {
            name: formData.name,
            cost: formData.cost,
            currency: formData.currency,
            currencySymbol: currencySymbol,
            cycle: cycleText,
            billingPeriod: formData.billingPeriod,
            nextPaymentDate: formData.date,
            category: formData.category,
            color: selectedCat?.color || formData.color,
            icon: iconText,
            iconUrl: iconUrl
        };

        const validation = validateAndSanitizeSubscription(rawData);
        if (!validation.valid) {
            alert('Ошибка валидации: ' + validation.errors.join(', '));
            return;
        }

        const subData = validation.data;

        try {
            // Не логируем полные данные для безопасности
            console.log('[MODAL] Submitting subscription (name:', subData.name, 'cost:', subData.cost + ')');
            if (initialData) {
                await updateSubscription(initialData.id, subData);
                console.log('[MODAL] Subscription updated successfully');
            } else {
                await addSubscription(subData);
                console.log('[MODAL] Subscription added successfully');
            }
            onClose();
        } catch (error) {
            console.error('[MODAL] Error saving subscription:', error.code || 'UNKNOWN');
            // Не показываем детали ошибки пользователю (безопасность)
            alert('Ошибка при сохранении подписки. Пожалуйста, попробуйте еще раз.');
            // Modal stays open so user can retry
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <Card className="w-full max-w-sm bg-surface ring-1 ring-white/10">
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white">
                        {initialData ? 'Редактировать подписку' : 'Новая подписка'}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Название сервиса</label>
                        <Input
                            required
                            placeholder="Netflix, Spotify..."
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Категория</label>
                        <select
                            className="flex h-12 w-full rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-text ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            {uniqueCategories.map(cat => (
                                <option key={cat.name} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Стоимость</label>
                            <Input
                                type="number"
                                required
                                placeholder="10000"
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Валюта</label>
                            <select
                                className="flex h-12 w-full rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-text ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                            >
                                {currencies.map(c => (
                                    <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Период списания</label>
                        <select
                            className="flex h-12 w-full rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-text ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            value={formData.billingPeriod}
                            onChange={e => setFormData({ ...formData, billingPeriod: e.target.value })}
                        >
                            <option value="monthly">Ежемесячно</option>
                            <option value="yearly">Ежегодно</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Дата первого платежа</label>
                        <Input
                            type="date"
                            required
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className="leading-normal"
                            style={{ 
                                colorScheme: 'dark',
                                paddingTop: '0.75rem',
                                paddingBottom: '0.75rem'
                            }}
                        />
                    </div>

                    <div className="pt-2">
                        <Button type="submit" className="w-full font-bold">
                            {initialData ? 'Сохранить' : 'Добавить'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
