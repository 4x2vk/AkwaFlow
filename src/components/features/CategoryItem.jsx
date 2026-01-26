import React from 'react';
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Card } from '../ui/Card';

export function CategoryItem({ 
    id, 
    name, 
    color, 
    subsCount, 
    expensesCount, 
    incomesCount, 
    spendByCurrency, 
    incomeByCurrency, 
    isDefault, 
    onDelete, 
    onClick,
    onMoveUp,
    onMoveDown,
    index,
    totalItems
}) {
    
    return (
        <Card
            onClick={onClick}
            className={`relative overflow-hidden flex items-center justify-between p-4 border-white/10 bg-black/40 hover:bg-black/50 backdrop-blur-sm transition-all rounded-2xl group ${!isDefault ? 'cursor-pointer' : ''}`}
        >
            {/* Декоративные элементы */}
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/6"></div>
            <div className="absolute top-1/3 right-0 w-16 h-16 rounded-full bg-white/4"></div>
            
            {/* Move buttons */}
            {!isDefault && (
                <div className="flex flex-col gap-1 p-1 -ml-2 mr-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                    <button
                        className="text-white/30 hover:text-white/80 transition-colors disabled:text-white/10 disabled:cursor-not-allowed"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onMoveUp) onMoveUp();
                        }}
                        disabled={index === 0}
                        title="Переместить вверх"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                        className="text-white/30 hover:text-white/80 transition-colors disabled:text-white/10 disabled:cursor-not-allowed"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onMoveDown) onMoveDown();
                        }}
                        disabled={index === totalItems - 1}
                        title="Переместить вниз"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            )}
            
            <div className="flex items-center gap-4 relative z-10 flex-1">
                <div
                    className="w-12 h-12 rounded-2xl shadow-lg transition-transform group-hover:scale-105"
                    style={{ backgroundColor: color }}
                />
                <div>
                    <h3 className="font-bold text-white text-base">{name}</h3>
                    <p className="text-xs text-white/60">
                        {subsCount} подписок
                        {expensesCount > 0 && ` · ${expensesCount} расходов`}
                        {incomesCount > 0 && ` · ${incomesCount} доходов`}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
                <div className="text-right flex flex-col items-end min-w-0">
                    {/* spending (subs+expenses) */}
                    {Object.entries(spendByCurrency || {}).length > 0 ? (
                        Object.entries(spendByCurrency).map(([sym, cost]) => (
                            <div key={`spend-${sym}`} className="font-bold text-white text-base whitespace-nowrap truncate max-w-[9rem]">
                                {sym}{Number(cost || 0).toLocaleString()}
                            </div>
                        ))
                    ) : (
                        <div className="font-bold text-white text-base">₩0</div>
                    )}
                    {/* incomes */}
                    {Object.entries(incomeByCurrency || {}).length > 0 && (
                        <div className="mt-1 flex flex-col items-end min-w-0">
                            {Object.entries(incomeByCurrency).map(([sym, inc]) => (
                                <div key={`inc-${sym}`} className="font-semibold text-green-400 text-xs whitespace-nowrap truncate max-w-[9rem]">
                                    +{sym}{Number(inc || 0).toLocaleString()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {!isDefault && (
                    <button
                        className="text-white/40 hover:text-red-500 transition-all p-2 hover:scale-110"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(e);
                        }}
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>
        </Card>
    );
}
