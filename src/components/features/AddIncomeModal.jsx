import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useIncomes } from '../../context/IncomeContext';
import { useSubscriptions } from '../../context/SubscriptionContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { validateAndSanitizeIncome } from '../../lib/validation';
import { getIcon } from '../../services/iconService';

export function AddIncomeModal({ isOpen, onClose, initialData = null }) {
    const { addIncome, updateIncome } = useIncomes();
    const { categories } = useSubscriptions();

    const currencies = useMemo(() => ([
        { code: 'WON', symbol: '₩' },
        { code: 'RUB', symbol: '₽' },
        { code: 'USD', symbol: '$' },
        { code: 'KZT', symbol: '₸' }
    ]), []);

    // Combine user categories with "Общие" if not present
    const hasGeneral = categories.some(c => c.name === 'Общие');
    const displayCategories = hasGeneral
        ? categories
        : [{ name: 'Общие', color: '#6B7280' }, ...categories];

    const uniqueCategories = displayCategories.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);

    const initialFormData = useMemo(() => {
        if (initialData) {
            return {
                title: initialData.title || '',
                amount: initialData.amount ?? '',
                currency: initialData.currency || 'WON',
                receivedAt: (initialData.receivedAt || '').slice(0, 10),
                category: initialData.category || 'Общие',
                color: initialData.color || '#22C55E',
                note: initialData.note || ''
            };
        }
        const today = new Date().toISOString().slice(0, 10);
        return {
            title: '',
            amount: '',
            currency: 'WON',
            receivedAt: today,
            category: 'Общие',
            color: '#22C55E',
            note: ''
        };
    }, [initialData]);

    const [formData, setFormData] = useState(() => initialFormData);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        const selectedCat = uniqueCategories.find(c => c.name === formData.category);
        const currencySymbol = currencies.find(c => c.code === formData.currency)?.symbol || '₩';

        // Auto icon (same logic as expenses/subscriptions)
        let iconUrl = null;
        const iconText = String(formData.title || '?')[0]?.toUpperCase() || '?';
        try {
            iconUrl = await getIcon(formData.title, 'subscription');
        } catch (error) {
            console.warn('[INCOME_MODAL] Failed to fetch icon:', error);
        }

        const rawData = {
            title: formData.title,
            amount: formData.amount,
            currency: formData.currency,
            currencySymbol,
            receivedAt: formData.receivedAt,
            category: formData.category,
            color: selectedCat?.color || formData.color,
            note: formData.note,
            icon: iconText,
            iconUrl
        };

        const validation = validateAndSanitizeIncome(rawData);
        if (!validation.valid) {
            alert('Ошибка валидации: ' + validation.errors.join(', '));
            return;
        }

        try {
            if (initialData) {
                await updateIncome(initialData.id, validation.data);
            } else {
                await addIncome(validation.data);
            }
            onClose();
        } catch (error) {
            const code = error?.code || 'UNKNOWN';
            console.error('[INCOME_MODAL] Error saving income:', { code, message: error?.message });
            if (code === 'permission-denied') {
                alert('Нет прав на запись (permission-denied). Скорее всего, на Firebase еще не задеплоены правила для incomes.');
            } else {
                alert(`Ошибка при сохранении дохода (${code}). Пожалуйста, попробуйте еще раз.`);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <Card className="relative w-full max-w-sm bg-black/60 border border-white/10 backdrop-blur-md overflow-hidden rounded-3xl">
                {/* Декоративные круглые элементы */}
                <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-green-500/12"></div>
                <div className="absolute top-1/4 right-0 w-28 h-28 rounded-full bg-white/6"></div>
                <div className="flex items-center justify-between p-4 border-b border-white/5 relative z-10">
                    <h2 className="text-lg font-bold text-white">
                        {initialData ? 'Редактировать доход' : 'Новый доход'}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 relative z-10">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Название</label>
                        <Input
                            required
                            placeholder="Например: Зарплата, Подработка..."
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
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
                            <label className="text-sm font-medium text-text-secondary">Сумма</label>
                            <Input
                                type="number"
                                required
                                placeholder="1000"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
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
                        <label className="text-sm font-medium text-text-secondary">Дата</label>
                        <Input
                            type="date"
                            required
                            value={formData.receivedAt}
                            onChange={e => setFormData({ ...formData, receivedAt: e.target.value })}
                            className="leading-normal"
                            style={{
                                colorScheme: 'dark',
                                paddingTop: '0.75rem',
                                paddingBottom: '0.75rem'
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Заметка (необязательно)</label>
                        <Input
                            placeholder="Например: премия"
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
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

