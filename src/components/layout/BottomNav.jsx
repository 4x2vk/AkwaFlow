import React from 'react';
import { NavLink } from 'react-router-dom';
import { CreditCard, Folder, BarChart2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function BottomNav() {
    const navItems = [
        { to: '/', icon: CreditCard, label: 'Подписки' },
        { to: '/categories', icon: Folder, label: 'Категории' },
        { to: '/analytics', icon: BarChart2, label: 'Аналитика' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-background/80 backdrop-blur-lg pb-safe">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            cn(
                                'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors',
                                isActive ? 'text-primary' : 'text-text-secondary hover:text-text'
                            )
                        }
                    >
                        <Icon className="w-6 h-6" />
                        <span className="text-[10px] font-medium">{label}</span>
                    </NavLink>
                ))}
            </div>
        </div>
    );
}
