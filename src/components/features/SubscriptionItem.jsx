import React from 'react';
import { Trash2 } from 'lucide-react';
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

export function SubscriptionItem({ icon, name, cycle, cost, color, currency = '₩', currencySymbol, onDelete, onClick }) {
    const displayCurrency = currencySymbol || currency;
    const bgColor = color || '#333';
    const isLight = isLightColor(bgColor);
    const textColorClass = isLight ? 'text-black' : 'text-white';
    
    return (
        <Card
            onClick={onClick}
            className="flex items-center justify-between p-4 mb-3 border-white/5 bg-surface hover:bg-surface-hover transition-colors cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${textColorClass} shadow-lg`}
                    style={{ backgroundColor: bgColor }}
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
