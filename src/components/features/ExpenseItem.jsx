import React from 'react';
import { Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';

export function ExpenseItem({ title, amount, currencySymbol, spentAt, category, color, note, onDelete, onClick }) {
    const displayCurrency = currencySymbol || '₽';
    const displayDate = spentAt ? new Date(spentAt).toLocaleDateString('ru-RU') : '';
    const bgColor = color || '#6B7280';

    return (
        <Card
            onClick={onClick}
            className="flex items-center justify-between p-4 mb-3 border-white/5 bg-surface hover:bg-surface-hover transition-colors cursor-pointer"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div
                    className="w-10 h-10 rounded-xl shadow-lg flex-shrink-0"
                    style={{ backgroundColor: bgColor }}
                />
                <div className="min-w-0">
                    <h3 className="font-bold text-white text-base truncate">{title}</h3>
                    <p className="text-xs text-text-secondary truncate">
                        {displayDate}{category ? ` • ${category}` : ''}{note ? ` • ${note}` : ''}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                    <div className="font-bold text-white text-base">{displayCurrency}{Number(amount || 0).toLocaleString()}</div>
                </div>
                <button
                    className="text-text-secondary hover:text-red-500 transition-colors p-2"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    aria-label="Удалить расход"
                    title="Удалить"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </Card>
    );
}

