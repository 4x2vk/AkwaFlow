import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * MonthPicker — выбор месяца (год + месяц).
 * value: string | null — YYYY-MM или null для «Все месяцы»
 * onChange: (value: string | null) => void
 */
export function MonthPicker({ value, onChange, placeholder = 'Все месяцы', className }) {
    const rootRef = useRef(null);
    const today = useMemo(() => new Date(), []);
    const [isOpen, setIsOpen] = useState(false);
    const [viewYear, setViewYear] = useState(() => {
        if (!value) return today.getFullYear();
        return Number(value.split('-')[0]) || today.getFullYear();
    });

    const months = useMemo(() => (
        Array.from({ length: 12 }, (_, index) => {
            const date = new Date(viewYear, index, 1);
            return {
                value: `${viewYear}-${String(index + 1).padStart(2, '0')}`,
                shortLabel: date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''),
                fullLabel: date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
                isCurrentMonth: viewYear === today.getFullYear() && index === today.getMonth(),
            };
        })
    ), [today, viewYear]);

    const selectedLabel = useMemo(() => {
        if (!value) return placeholder;
        const [year, month] = value.split('-').map(Number);
        if (!year || !month) return placeholder;
        return new Date(year, month - 1, 1).toLocaleDateString('ru-RU', {
            month: 'long',
            year: 'numeric',
        });
    }, [placeholder, value]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [isOpen]);

    const handleSelect = (nextValue) => {
        onChange(nextValue);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange(null);
        setViewYear(today.getFullYear());
        setIsOpen(false);
    };

    const handleToggle = () => {
        if (!isOpen && value) {
            const nextYear = Number(value.split('-')[0]);
            if (nextYear) {
                setViewYear(nextYear);
            }
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={handleToggle}
                className={cn(
                    'group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10',
                    'bg-gradient-to-br from-white/8 to-white/[0.03] px-4 py-3 text-left text-white',
                    'backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-white/[0.08]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                )}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                        <Calendar size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-text-secondary">
                            Период
                        </div>
                        <div className="truncate text-sm font-semibold capitalize text-white">
                            {selectedLabel}
                        </div>
                    </div>
                </div>
                <div className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs text-text-secondary transition-colors group-hover:text-white">
                    {value ? 'Месяц' : 'Все'}
                </div>
            </button>

            {isOpen && (
                <div
                    className={cn(
                        'absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 overflow-hidden rounded-3xl',
                        'border border-white/10 bg-[#0f1117]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl'
                    )}
                >
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setViewYear((prev) => prev - 1)}
                            className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-text-secondary transition-colors hover:bg-white/10 hover:text-white"
                            aria-label="Предыдущий год"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
                            {viewYear}
                        </div>
                        <button
                            type="button"
                            onClick={() => setViewYear((prev) => prev + 1)}
                            className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-text-secondary transition-colors hover:bg-white/10 hover:text-white"
                            aria-label="Следующий год"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="mb-4 grid grid-cols-3 gap-2">
                        {months.map((month) => {
                            const isSelected = value === month.value;
                            return (
                                <button
                                    key={month.value}
                                    type="button"
                                    onClick={() => handleSelect(month.value)}
                                    className={cn(
                                        'rounded-2xl border px-3 py-3 text-left transition-all duration-200',
                                        isSelected
                                            ? 'border-primary/40 bg-primary text-black shadow-lg shadow-primary/20'
                                            : 'border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.08]'
                                    )}
                                >
                                    <div className="text-sm font-semibold capitalize">{month.shortLabel}</div>
                                    <div
                                        className={cn(
                                            'mt-1 text-[11px]',
                                            isSelected ? 'text-black/70' : month.isCurrentMonth ? 'text-primary' : 'text-text-secondary'
                                        )}
                                    >
                                        {month.isCurrentMonth ? 'Текущий' : month.fullLabel}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleSelect(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)}
                            className="flex-1 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                        >
                            Текущий месяц
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-white"
                        >
                            <X size={16} />
                            Все
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
