import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';

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

export function ExpenseItem({ icon, iconUrl, title, amount, currencySymbol, spentAt, category, color, note, onDelete, onClick }) {
    const [failedIconUrl, setFailedIconUrl] = useState(null);
    const displayCurrency = currencySymbol || '₩';
    const displayDate = spentAt ? new Date(spentAt).toLocaleDateString('ru-RU') : '';
    const bgColor = color || '#6B7280';
    const isLight = isLightColor(bgColor);
    const textColorClass = isLight ? 'text-black' : 'text-white';
    const displayIcon = icon || String(title || '?')[0]?.toUpperCase() || '?';

    return (
        <Card
            onClick={onClick}
            className="flex items-center justify-between p-4 mb-3 border-white/5 bg-surface hover:bg-surface-hover transition-colors cursor-pointer"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${textColorClass} shadow-lg overflow-hidden flex-shrink-0`}
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

