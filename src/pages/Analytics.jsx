import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { CreditCard, Wallet, TrendingUp } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useExpenses } from '../context/ExpenseContext';

export default function Analytics() {
    const { subscriptions } = useSubscriptions();
    const { expenses } = useExpenses();

    const now = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const toYearlyByCurrency = (monthlyByCurrency) => {
        const out = {};
        Object.entries(monthlyByCurrency).forEach(([sym, amount]) => {
            out[sym] = Number(amount || 0) * 12;
        });
        return out;
    };

    const getMonthLabels = () => ([
        { name: 'Янв', month: 0 },
        { name: 'Фев', month: 1 },
        { name: 'Мар', month: 2 },
        { name: 'Апр', month: 3 },
        { name: 'Май', month: 4 },
        { name: 'Июн', month: 5 },
        { name: 'Июл', month: 6 },
        { name: 'Авг', month: 7 },
        { name: 'Сен', month: 8 },
        { name: 'Окт', month: 9 },
        { name: 'Ноя', month: 10 },
        { name: 'Дек', month: 11 },
    ]);

    // "Stable subscriptions" = monthly equivalent
    const subscriptionMonthlyByCurrency = useMemo(() => {
        return subscriptions.reduce((acc, sub) => {
            const sym = sub.currencySymbol || '₩';
            const billingPeriod = sub.billingPeriod || (sub.cycle && sub.cycle.includes('год') ? 'yearly' : 'monthly');
            const cost = Number(sub.cost || 0);
            const monthlyEquivalent = billingPeriod === 'yearly' ? (cost / 12) : cost;
            acc[sym] = (acc[sym] || 0) + monthlyEquivalent;
            return acc;
        }, {});
    }, [subscriptions]);

    const expenseThisMonthByCurrency = useMemo(() => {
        return expenses.reduce((acc, e) => {
            if (!e?.spentAt) return acc;
            const d = new Date(e.spentAt);
            if (isNaN(d.getTime())) return acc;
            if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return acc;
            const sym = e.currencySymbol || '₩';
            acc[sym] = (acc[sym] || 0) + Number(e.amount || 0);
            return acc;
        }, {});
    }, [expenses, currentMonth, currentYear]);

    const totalThisMonthByCurrency = useMemo(() => {
        const combined = { ...expenseThisMonthByCurrency };
        Object.entries(subscriptionMonthlyByCurrency).forEach(([sym, amount]) => {
            combined[sym] = (combined[sym] || 0) + Number(amount || 0);
        });
        return combined;
    }, [expenseThisMonthByCurrency, subscriptionMonthlyByCurrency]);

    const expenseThisYearByCurrency = useMemo(() => {
        return expenses.reduce((acc, e) => {
            if (!e?.spentAt) return acc;
            const d = new Date(e.spentAt);
            if (isNaN(d.getTime())) return acc;
            if (d.getFullYear() !== currentYear) return acc;
            if (d.getMonth() > currentMonth) return acc; // don't count future months
            const sym = e.currencySymbol || '₩';
            acc[sym] = (acc[sym] || 0) + Number(e.amount || 0);
            return acc;
        }, {});
    }, [currentMonth, currentYear, expenses]);

    const subscriptionYearlyByCurrency = useMemo(() => {
        return toYearlyByCurrency(subscriptionMonthlyByCurrency);
    }, [subscriptionMonthlyByCurrency]);

    const totalThisYearByCurrency = useMemo(() => {
        const combined = { ...expenseThisYearByCurrency };
        Object.entries(subscriptionYearlyByCurrency).forEach(([sym, amount]) => {
            combined[sym] = (combined[sym] || 0) + Number(amount || 0);
        });
        return combined;
    }, [expenseThisYearByCurrency, subscriptionYearlyByCurrency]);

    const primaryCurrency = useMemo(() => {
        const allSyms = Object.keys(subscriptionMonthlyByCurrency);
        if (allSyms.length > 0) return allSyms[0];
        const expSyms = Object.keys(expenseThisMonthByCurrency);
        return expSyms[0] || '₩';
    }, [expenseThisMonthByCurrency, subscriptionMonthlyByCurrency]);

    const subscriptionMonthlyTotal = useMemo(() => {
        return subscriptions.reduce((sum, sub) => {
            const billingPeriod = sub.billingPeriod || (sub.cycle && sub.cycle.includes('год') ? 'yearly' : 'monthly');
            const cost = Number(sub.cost || 0);
            const monthlyEquivalent = billingPeriod === 'yearly' ? (cost / 12) : cost;
            return sum + monthlyEquivalent;
        }, 0);
    }, [subscriptions]);

    const expenseMonthlyTotals = useMemo(() => {
        const months = getMonthLabels().map((m) => ({ ...m, expenses: 0 }));
        expenses.forEach((e) => {
            if (!e?.spentAt) return;
            const d = new Date(e.spentAt);
            if (isNaN(d.getTime())) return;
            if (d.getFullYear() !== currentYear) return;
            months[d.getMonth()].expenses += Number(e.amount || 0);
        });
        return months;
    }, [expenses, currentYear]);

    const monthlyCompareData = useMemo(() => {
        return getMonthLabels()
            .filter((m) => m.month <= currentMonth)
            .map((m) => {
            const exp = expenseMonthlyTotals.find((x) => x.month === m.month)?.expenses || 0;
            return {
                name: m.name,
                month: m.month,
                subscriptions: subscriptionMonthlyTotal,
                expenses: exp,
                total: subscriptionMonthlyTotal + exp
            };
        });
    }, [currentMonth, expenseMonthlyTotals, subscriptionMonthlyTotal]);

    const subscriptionByCategory = useMemo(() => {
        const map = {};
        subscriptions.forEach((sub) => {
            const cat = sub.category || 'Общие';
            const billingPeriod = sub.billingPeriod || (sub.cycle && sub.cycle.includes('год') ? 'yearly' : 'monthly');
            const cost = Number(sub.cost || 0);
            const monthlyEquivalent = billingPeriod === 'yearly' ? (cost / 12) : cost;
            if (!map[cat]) map[cat] = { name: cat, value: 0, color: sub.color || '#6B7280' };
            map[cat].value += monthlyEquivalent;
        });
        return Object.values(map).filter((d) => d.value > 0);
    }, [subscriptions]);

    const expenseByCategoryThisMonth = useMemo(() => {
        const map = {};
        expenses.forEach((e) => {
            if (!e?.spentAt) return;
            const d = new Date(e.spentAt);
            if (isNaN(d.getTime())) return;
            if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return;
            const cat = e.category || 'Общие';
            if (!map[cat]) map[cat] = { name: cat, value: 0, color: e.color || '#6B7280' };
            map[cat].value += Number(e.amount || 0);
        });
        return Object.values(map).filter((d) => d.value > 0);
    }, [currentMonth, currentYear, expenses]);

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        
        // Форматируем процент
        const percentage = `${(percent * 100).toFixed(0)}%`;
        
        // Показываем только если процент больше 5%, чтобы не перегружать маленькие сегменты
        if (percent < 0.05) return null;

        return (
            <g>
                <text 
                    x={x} 
                    y={y - 8} 
                    fill="white" 
                    textAnchor={x > cx ? 'start' : 'end'} 
                    dominantBaseline="central" 
                    fontSize={11}
                    fontWeight="bold"
                >
                    {name}
                </text>
                <text 
                    x={x} 
                    y={y + 8} 
                    fill="#9CA3AF" 
                    textAnchor={x > cx ? 'start' : 'end'} 
                    dominantBaseline="central" 
                    fontSize={10}
                >
                    {percentage}
                </text>
            </g>
        );
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Monthly Cards */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Подписки/МЕС - фиолетовая карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-purple-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <CreditCard size={28} className="text-purple-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">подписки/мес</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(subscriptionMonthlyByCurrency).length > 0 ? (
                                Object.entries(subscriptionMonthlyByCurrency).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-lg text-purple-400 whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-purple-400">₩0</div>
                            )}
                        </div>
                    </Card>

                    {/* Расходы/МЕС - оранжевая карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-orange-500/10 border border-orange-500/30 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-orange-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-orange-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <Wallet size={28} className="text-orange-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">расходы/мес</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(expenseThisMonthByCurrency).length > 0 ? (
                                Object.entries(expenseThisMonthByCurrency).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-lg text-orange-400 whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-orange-400">₩0</div>
                            )}
                        </div>
                    </Card>

                    {/* Итого/МЕС - фиолетовая карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-purple-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <TrendingUp size={28} className="text-purple-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">итого/мес</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(totalThisMonthByCurrency).length > 0 ? (
                                Object.entries(totalThisMonthByCurrency).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-lg text-purple-400 whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-purple-400">₩0</div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Yearly Cards */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Подписки/ГОД - темная карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-black/50 border border-white/10 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-white/5"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <CreditCard size={28} className="text-white" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">подписки/год</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(subscriptionYearlyByCurrency).length > 0 ? (
                                Object.entries(subscriptionYearlyByCurrency).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-lg text-white whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-white">₩0</div>
                            )}
                        </div>
                    </Card>

                    {/* Расходы/ГОД - темная карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-black/50 border border-white/10 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-white/5"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <Wallet size={28} className="text-white" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">расходы/год</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(expenseThisYearByCurrency).length > 0 ? (
                                Object.entries(expenseThisYearByCurrency).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-lg text-white whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-white">₩0</div>
                            )}
                        </div>
                    </Card>

                    {/* Итого/ГОД - фиолетовая карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-purple-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <TrendingUp size={28} className="text-purple-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">итого/год</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(totalThisYearByCurrency).length > 0 ? (
                                Object.entries(totalThisYearByCurrency).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-lg text-purple-400 whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-purple-400">₩0</div>
                            )}
                        </div>
                    </Card>
                </div>

                <Card className="bg-surface border-white/5 p-4">
                    <h3 className="text-sm font-bold text-white mb-4">Стабильные расходы по категориям (в месяц)</h3>
                    <div className="h-64 w-full flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={subscriptionByCategory}
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    label={renderCustomizedLabel}
                                    labelLine={false}
                                >
                                    {subscriptionByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: '#1E1E1E', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                                        color: '#FFFFFF'
                                    }}
                                    labelStyle={{ 
                                        color: '#FFFFFF', 
                                        fontSize: '12px',
                                        marginBottom: '4px',
                                        fontWeight: 'bold'
                                    }}
                                    itemStyle={{ 
                                        color: '#FFFFFF', 
                                        fontSize: '12px',
                                        padding: '2px 0'
                                    }}
                                    formatter={(value, name) => [`${primaryCurrency}${Number(value || 0).toLocaleString()}`, name]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="w-full mt-2 max-h-32 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-2 px-2">
                                {subscriptionByCategory.map(item => (
                                    <div key={item.name} className="flex items-center gap-2 min-w-0">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                                        <span className="text-xs text-text-secondary truncate">
                                            <span className="font-medium">{item.name}:</span> {primaryCurrency}{Number(item.value || 0).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="bg-surface border-white/5 p-4">
                    <h3 className="text-sm font-bold text-white mb-4">Расходы по категориям (этот месяц)</h3>
                    <div className="h-64 w-full flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={expenseByCategoryThisMonth}
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    label={renderCustomizedLabel}
                                    labelLine={false}
                                >
                                    {expenseByCategoryThisMonth.map((entry, index) => (
                                        <Cell key={`cell-exp-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: '#1E1E1E', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                                        color: '#FFFFFF'
                                    }}
                                    labelStyle={{ 
                                        color: '#FFFFFF', 
                                        fontSize: '12px',
                                        marginBottom: '4px',
                                        fontWeight: 'bold'
                                    }}
                                    itemStyle={{ 
                                        color: '#FFFFFF', 
                                        fontSize: '12px',
                                        padding: '2px 0'
                                    }}
                                    formatter={(value, name) => [`${primaryCurrency}${Number(value || 0).toLocaleString()}`, name]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="w-full mt-2 max-h-32 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-2 px-2">
                                {expenseByCategoryThisMonth.map(item => (
                                    <div key={item.name} className="flex items-center gap-2 min-w-0">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                                        <span className="text-xs text-text-secondary truncate">
                                            <span className="font-medium">{item.name}:</span> {primaryCurrency}{Number(item.value || 0).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="bg-surface border-white/5 p-4">
                    <h3 className="text-sm font-bold text-white mb-4">По месяцам (до текущего): стабильные vs расходы</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyCompareData} margin={{ top: 5, right: 5, left: 1, bottom: 1 }}>
                                <CartesianGrid 
                                    strokeDasharray="3 3" 
                                    stroke="rgba(255,255,255,0.1)" 
                                    vertical={false}
                                />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }} 
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                    interval={0}
                                    angle={0}
                                    textAnchor="middle"
                                    height={40}
                                    tickMargin={8}
                                />
                                <YAxis 
                                    tick={{ fill: '#FFFFFF', fontSize: 10, fontWeight: 500 }} 
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                    width={60}
                                    tickFormatter={(value) => {
                                        if (value === 0) return '0';
                                        // Сокращаем большие числа для компактности
                                        if (value >= 1000000) {
                                            return `${primaryCurrency}${(value / 1000000).toFixed(1)}M`;
                                        } else if (value >= 1000) {
                                            return `${primaryCurrency}${(value / 1000).toFixed(0)}K`;
                                        }
                                        return `${primaryCurrency}${value.toLocaleString()}`;
                                    }}
                                />
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: '#1E1E1E', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                    }}
                                    labelStyle={{ 
                                        color: '#fff', 
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 'bold'
                                    }}
                                    itemStyle={{ 
                                        color: '#fff', 
                                        fontSize: '12px',
                                        padding: '2px 0'
                                    }}
                                    formatter={(value, name) => {
                                        const labelMap = {
                                            subscriptions: 'Стабильные',
                                            expenses: 'Расходы',
                                            total: 'Итого'
                                        };
                                        return [`${primaryCurrency}${Number(value || 0).toLocaleString()}`, labelMap[name] || name];
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                {/* Stacked: stable (bottom) + expenses (top) */}
                                <Bar dataKey="subscriptions" stackId="total" fill="#3B82F6" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="expenses" stackId="total" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </Layout>
    );
}
