import React from 'react';
import { Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export function SubscriptionItem({ icon, name, cycle, cost, color, currency = '₩', currencySymbol, onDelete, onClick }) {
    const displayCurrency = currencySymbol || currency;
    return (
        <Card
            onClick={onClick}
            className="flex items-center justify-between p-4 mb-3 border-white/5 bg-surface hover:bg-surface-hover transition-colors cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-lg"
                    style={{ backgroundColor: color || '#333' }}
                >
                    {icon || name[0]}
                </div>
                <div>
                    <h3 className="font-bold text-white text-base">{name}</h3>
                    <p className="text-xs text-text-secondary">{cycle}</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <div className="font-bold text-white text-base">{displayCurrency}{cost.toLocaleString()}</div>
                    <div className="text-xs text-text-secondary">/мес</div>
                </div>
                <button
                    className="text-text-secondary hover:text-red-500 transition-colors p-2"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </Card>
    );
}
