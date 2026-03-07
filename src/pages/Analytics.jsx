import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { CreditCard, Wallet, TrendingUp, Coins } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useExpenses } from '../context/ExpenseContext';
import { useIncomes } from '../context/IncomeContext';
import {
    buildMonthlyCompareData,
    getItemsByCategoryForMonth,
    getMonthlyAmountSeries,
    getPrimaryCurrency,
    getSubscriptionByCategory,
    getSubscriptionMonthlyByCurrency,
    getSubscriptionMonthlyTotal,
    getTotalsByCurrencyForMonth,
    getTotalsByCurrencyForYear,
    mergeCurrencyTotals,
    subtractCurrencyTotals,
    toYearlyByCurrency
} from '../lib/analyticsSelectors';

export default function Analytics() {
    const { subscriptions } = useSubscriptions();
    const { expenses } = useExpenses();
    const { incomes } = useIncomes();

    const now = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // "Stable subscriptions" = monthly equivalent
    const subscriptionMonthlyByCurrency = useMemo(
        () => getSubscriptionMonthlyByCurrency(subscriptions),
        [subscriptions]
    );

    const expenseThisMonthByCurrency = useMemo(
        () => getTotalsByCurrencyForMonth(expenses, {
            dateField: 'spentAt',
            year: currentYear,
            month: currentMonth
        }),
        [currentMonth, currentYear, expenses]
    );

    const incomeThisMonthByCurrency = useMemo(
        () => getTotalsByCurrencyForMonth(incomes, {
            dateField: 'receivedAt',
            year: currentYear,
            month: currentMonth
        }),
        [currentMonth, currentYear, incomes]
    );

    const expensePlusSubsThisMonthByCurrency = useMemo(
        () => mergeCurrencyTotals(expenseThisMonthByCurrency, subscriptionMonthlyByCurrency),
        [expenseThisMonthByCurrency, subscriptionMonthlyByCurrency]
    );

    const netThisMonthByCurrency = useMemo(
        () => subtractCurrencyTotals(incomeThisMonthByCurrency, expensePlusSubsThisMonthByCurrency),
        [expensePlusSubsThisMonthByCurrency, incomeThisMonthByCurrency]
    );

    const expenseThisYearByCurrency = useMemo(
        () => getTotalsByCurrencyForYear(expenses, {
            dateField: 'spentAt',
            year: currentYear,
            maxMonth: currentMonth
        }),
        [currentMonth, currentYear, expenses]
    );

    const incomeThisYearByCurrency = useMemo(
        () => getTotalsByCurrencyForYear(incomes, {
            dateField: 'receivedAt',
            year: currentYear,
            maxMonth: currentMonth
        }),
        [currentMonth, currentYear, incomes]
    );

    const subscriptionYearlyByCurrency = useMemo(() => {
        return toYearlyByCurrency(subscriptionMonthlyByCurrency);
    }, [subscriptionMonthlyByCurrency]);

    const expensePlusSubsThisYearByCurrency = useMemo(
        () => mergeCurrencyTotals(expenseThisYearByCurrency, subscriptionYearlyByCurrency),
        [expenseThisYearByCurrency, subscriptionYearlyByCurrency]
    );

    const netThisYearByCurrency = useMemo(
        () => subtractCurrencyTotals(incomeThisYearByCurrency, expensePlusSubsThisYearByCurrency),
        [expensePlusSubsThisYearByCurrency, incomeThisYearByCurrency]
    );

    const primaryCurrency = useMemo(
        () => getPrimaryCurrency(
            subscriptionMonthlyByCurrency,
            expenseThisMonthByCurrency,
            incomeThisMonthByCurrency
        ),
        [expenseThisMonthByCurrency, incomeThisMonthByCurrency, subscriptionMonthlyByCurrency]
    );

    const subscriptionMonthlyTotal = useMemo(
        () => getSubscriptionMonthlyTotal(subscriptions),
        [subscriptions]
    );

    const expenseMonthlyTotals = useMemo(
        () => getMonthlyAmountSeries(expenses, {
            dateField: 'spentAt',
            valueKey: 'expenses',
            year: currentYear
        }),
        [currentYear, expenses]
    );

    const incomeMonthlyTotals = useMemo(
        () => getMonthlyAmountSeries(incomes, {
            dateField: 'receivedAt',
            valueKey: 'income',
            year: currentYear
        }),
        [currentYear, incomes]
    );

    const monthlyCompareData = useMemo(
        () => buildMonthlyCompareData({
            currentMonth,
            expenseMonthlyTotals,
            incomeMonthlyTotals,
            subscriptionMonthlyTotal
        }),
        [currentMonth, expenseMonthlyTotals, incomeMonthlyTotals, subscriptionMonthlyTotal]
    );

    const subscriptionByCategory = useMemo(
        () => getSubscriptionByCategory(subscriptions),
        [subscriptions]
    );

    const expenseByCategoryThisMonth = useMemo(
        () => getItemsByCategoryForMonth(expenses, {
            dateField: 'spentAt',
            year: currentYear,
            month: currentMonth,
            fallbackColor: '#6B7280'
        }),
        [currentMonth, currentYear, expenses]
    );

    const incomeByCategoryThisMonth = useMemo(
        () => getItemsByCategoryForMonth(incomes, {
            dateField: 'receivedAt',
            year: currentYear,
            month: currentMonth,
            fallbackColor: '#22C55E'
        }),
        [currentMonth, currentYear, incomes]
    );

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
                <div className="grid grid-cols-2 gap-3">
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

                    {/* Доходы/МЕС - зелёная карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-green-500/10 border border-green-500/30 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-green-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-green-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <Coins size={28} className="text-green-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">доходы/мес</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(incomeThisMonthByCurrency).length > 0 ? (
                                Object.entries(incomeThisMonthByCurrency).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-lg text-green-400 whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-green-400">₩0</div>
                            )}
                        </div>
                    </Card>

                    {/* Баланс/МЕС - фиолетовая карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-purple-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <TrendingUp size={28} className="text-purple-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">баланс/мес</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(netThisMonthByCurrency).length > 0 ? (
                                Object.entries(netThisMonthByCurrency).map(([curr, amount]) => (
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
                <div className="grid grid-cols-2 gap-3">
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

                    {/* Доходы/ГОД - темная карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-black/50 border border-white/10 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-white/5"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <TrendingUp size={28} className="text-white" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">доходы/год</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(incomeThisYearByCurrency).length > 0 ? (
                                Object.entries(incomeThisYearByCurrency).map(([curr, amount]) => (
                                    <div key={curr} className="font-bold text-lg text-white whitespace-nowrap">
                                        {curr}{Number(amount || 0).toLocaleString()}
                                    </div>
                                ))
                            ) : (
                                <div className="font-bold text-xl text-white">₩0</div>
                            )}
                        </div>
                    </Card>

                    {/* Баланс/ГОД - фиолетовая карточка */}
                    <Card className="relative overflow-hidden p-4 flex flex-col justify-between min-h-[7rem] bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm rounded-2xl">
                        {/* Декоративные круглые элементы */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-500/15"></div>
                        <div className="absolute top-1/3 right-0 w-20 h-20 rounded-full bg-purple-500/10"></div>
                        <div className="absolute top-2 right-2 opacity-20">
                            <TrendingUp size={28} className="text-purple-400" />
                        </div>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold relative z-10">баланс/год</span>
                        <div className="flex flex-col gap-1 relative z-10 mt-1">
                            {Object.entries(netThisYearByCurrency).length > 0 ? (
                                Object.entries(netThisYearByCurrency).map(([curr, amount]) => (
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
                    <h3 className="text-sm font-bold text-white mb-4">Подписки по категориям (в месяц)</h3>
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
                    <h3 className="text-sm font-bold text-white mb-4">Доходы по категориям (этот месяц)</h3>
                    <div className="h-64 w-full flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={incomeByCategoryThisMonth}
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    label={renderCustomizedLabel}
                                    labelLine={false}
                                >
                                    {incomeByCategoryThisMonth.map((entry, index) => (
                                        <Cell key={`cell-inc-${index}`} fill={entry.color} />
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
                                {incomeByCategoryThisMonth.map(item => (
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
                    <h3 className="text-sm font-bold text-white mb-4">Доходы и расходы по месяцам (баланс)</h3>
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
                                            income: 'Доходы',
                                            subscriptions: 'Подписки',
                                            expenses: 'Расходы',
                                            net: 'Баланс'
                                        };
                                        return [`${primaryCurrency}${Number(value || 0).toLocaleString()}`, labelMap[name] || name];
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="income" fill="#22C55E" radius={[4, 4, 0, 0]} />
                                {/* расходы как стек: подписки + расходы */}
                                <Bar dataKey="subscriptions" stackId="spend" fill="#3B82F6" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="expenses" stackId="spend" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </Layout>
    );
}
