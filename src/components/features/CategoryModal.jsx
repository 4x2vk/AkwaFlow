import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSubscriptions } from '../../context/SubscriptionContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

export function CategoryModal({ isOpen, onClose, initialData = null }) {
    const { addCategory, updateCategory } = useSubscriptions();
    const [formData, setFormData] = useState({
        name: '',
        color: '#00D68F'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                color: initialData.color || '#00D68F'
            });
        } else {
            setFormData({ name: '', color: '#00D68F' });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (initialData) {
            updateCategory(initialData.id, formData);
        } else {
            addCategory(formData);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <Card className="w-full max-w-sm bg-surface ring-1 ring-white/10">
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white">
                        {initialData ? 'Редактировать категорию' : 'Новая категория'}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Название</label>
                        <Input
                            required
                            placeholder="Например: Развлечения"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Цвет</label>
                        <div className="grid grid-cols-5 gap-2">
                            {[
                                '#00D68F', // Зеленый
                                '#3B82F6', // Синий
                                '#8B5CF6', // Фиолетовый
                                '#F59E0B', // Оранжевый
                                '#EF4444', // Красный
                                '#EC4899', // Розовый
                                '#06B6D4', // Голубой
                                '#FBBF24', // Желтый
                                '#6366F1', // Индиго
                                '#10B981'  // Изумрудный
                            ].map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color })}
                                    className={`w-full h-12 rounded-lg transition-all ${
                                        formData.color === color
                                            ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-105'
                                            : 'hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
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
