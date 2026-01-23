import React, { useState } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { Card } from '../ui/Card';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Function to determine if a color is light (needs dark text)
function isLightColor(hexColor) {
    if (!hexColor) return false;
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

export function IncomeItem({ id, icon, iconUrl, title, amount, currencySymbol, receivedAt, category, color, note, onDelete, onClick }) {
    const [failedIconUrl, setFailedIconUrl] = useState(null);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition || 'transform 200ms ease',
        opacity: isDragging ? 0.6 : 1,
        scale: isDragging ? 1.02 : 1
    };
    
    const displayCurrency = currencySymbol || '₩';
    const displayDate = receivedAt ? new Date(receivedAt).toLocaleDateString('ru-RU') : '';
    const bgColor = color || '#22C55E';
    const isLight = isLightColor(bgColor);
    const textColorClass = isLight ? 'text-black' : 'text-white';
    const displayIcon = icon || String(title || '?')[0]?.toUpperCase() || '?';

    return (
        <Card
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className="relative overflow-hidden flex items-center justify-between p-4 mb-3 border-white/10 bg-black/40 hover:bg-black/50 backdrop-blur-sm transition-all cursor-pointer rounded-2xl group"
        >
            {/* Декоративные элементы */}
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/6"></div>
            <div className="absolute top-1/3 right-0 w-16 h-16 rounded-full bg-white/4"></div>

            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-2 -ml-2 mr-2 text-white/30 hover:text-white/60 transition-colors relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-4 min-w-0 relative z-10 flex-1">
                <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${textColorClass} shadow-lg overflow-hidden flex-shrink-0 transition-transform group-hover:scale-105`}
                    style={{ backgroundColor: bgColor }}
                >
                    {iconUrl && failedIconUrl !== iconUrl ? (
                        <img
                            src={iconUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                            onError={() => setFailedIconUrl(iconUrl)}
                        />
                    ) : (
                        displayIcon
                    )}
                </div>
                <div className="min-w-0">
                    <h3 className="font-bold text-white text-base truncate">{title}</h3>
                    <p className="text-xs text-white/60 truncate">
                        {displayDate}{category ? ` • ${category}` : ''}{note ? ` • ${note}` : ''}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 relative z-10">
                <div className="text-right">
                    <div className="font-bold text-white text-base">{displayCurrency}{Number(amount || 0).toLocaleString()}</div>
                </div>
                <button
                    className="text-white/40 hover:text-red-500 transition-all p-2 hover:scale-110"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    aria-label="Удалить доход"
                    title="Удалить"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </Card>
    );
}

