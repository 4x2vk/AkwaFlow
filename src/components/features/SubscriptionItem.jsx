import React, { useState } from 'react';
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

// Function to determine if a color is light (needs dark text)
function isLightColor(hexColor) {
    if (!hexColor) return false;
    
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate luminance using relative luminance formula
    // https://www.w3.org/WAI/GL/wiki/Relative_luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If luminance is greater than 0.5, it's a light color
    return luminance > 0.5;
}

export function SubscriptionItem({ id, icon, iconUrl, name, cycle, cost, color, currency = '₩', currencySymbol, billingPeriod, onDelete, onClick, onMoveUp, onMoveDown, index, totalItems }) {
    const [failedIconUrl, setFailedIconUrl] = useState(null);
    
    const displayCurrency = currencySymbol || currency;
    const bgColor = color || '#333';
    const isLight = isLightColor(bgColor);
    const textColorClass = isLight ? 'text-black' : 'text-white';
    const displayIcon = icon || name[0];
    const periodLabel = billingPeriod === 'yearly' ? '/год' : '/мес';
    
    return (
        <Card
            onClick={onClick}
            className="relative overflow-hidden flex items-center justify-between p-4 mb-3 border-white/10 bg-black/40 hover:bg-black/50 backdrop-blur-sm transition-all cursor-pointer rounded-2xl group"
        >
            {/* Декоративные элементы */}
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/6"></div>
            <div className="absolute top-1/3 right-0 w-16 h-16 rounded-full bg-white/4"></div>
            
            {/* Move buttons */}
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
            
            <div className="flex items-center gap-4 relative z-10 flex-1">
                <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${textColorClass} shadow-lg overflow-hidden transition-transform group-hover:scale-105`}
                    style={{ backgroundColor: bgColor }}
                >
                    {iconUrl && failedIconUrl !== iconUrl ? (
                        <img 
                            src={iconUrl} 
                            alt={name}
                            className="w-full h-full object-cover"
                            onError={() => setFailedIconUrl(iconUrl)}
                        />
                    ) : (
                        displayIcon
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-white text-base">{name}</h3>
                    <p className="text-xs text-white/60">{cycle}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
                <div className="text-right">
                    <div className="font-bold text-white text-base">{displayCurrency}{cost.toLocaleString()}</div>
                    <div className="text-xs text-white/50">{periodLabel}</div>
                </div>
                <button
                    className="text-white/40 hover:text-red-500 transition-all p-2 hover:scale-110"
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
