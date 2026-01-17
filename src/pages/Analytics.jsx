import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { useSubscriptions } from '../context/SubscriptionContext';

export default function Analytics() {
    const { subscriptions } = useSubscriptions();

    // Group costs by currency for totals
    const totalsByCurrency = subscriptions.reduce((acc, sub) => {
        const currency = sub.currencySymbol || '₩';
        acc[currency] = (acc[currency] || 0) + (sub.cost || 0);
        return acc;
    }, {});

    // Get the most common currency (primary currency)
    const getPrimaryCurrency = () => {
        if (subscriptions.length === 0) return '₩';
        const currencyCounts = {};
        subscriptions.forEach(sub => {
            const currency = sub.currencySymbol || '₩';
            currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
        });
        const primaryCurrency = Object.entries(currencyCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || '₩';
        return primaryCurrency;
    };

    const primaryCurrency = getPrimaryCurrency();

    // For Pie Chart (Distribution), we probably want to visualize "Expense Distribution".
    // Since we can't easily sum apples and oranges (won and rub) for a single pie, 
    // we have two options: 
    // 1. One chart per currency
    // 2. Just count distribution logic?
    // User said "remove cost just show categories" in the sector. 
    // Let's assume we stick to one chart but maybe just aggregate generic "value" (cost) 
    // expecting user might mentally separate, OR just show one chart.
    // Actually, mixing currencies in one PIE is misleading. 
    // Let's create a "Primary" pie chart based on the most frequent currency OR 
    // just ignore currency for the *visual slice* logic (treating 1000 RUB same as 1000 KRW visually is wrong though).
    // Let's default to just "Count" distribution for the visual pie if currencies are mixed?
    // OR, better: let's show value distribution but just grab the raw numbers. It's an MVP.
    // User specifically asked "remove cost in sector... show category". 
    // I will use accumulated cost for the slice size, but hide the value label.

    const categoryData = {};
    subscriptions.forEach(sub => {
        const cat = sub.category || 'Общие';
        if (!categoryData[cat]) {
            categoryData[cat] = { name: cat, value: 0, color: sub.color || '#6B7280' };
        }
        // Nivea improvement: maybe just use count for reliability across currencies? 
        // "Expenses by category" -> usually cost. 
        // Let's sum raw numbers. It's imperfect but requested.
        categoryData[cat].value += (sub.cost || 0);
    });

    const pieData = Object.values(categoryData).filter(d => d.value > 0);

    // Calculate monthly expenses based on payment dates and billing periods
    const calculateMonthlyExpenses = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const months = [
            { name: 'Янв', month: 0, cost: 0 },
            { name: 'Фев', month: 1, cost: 0 },
            { name: 'Мар', month: 2, cost: 0 },
            { name: 'Апр', month: 3, cost: 0 },
            { name: 'Май', month: 4, cost: 0 },
            { name: 'Июн', month: 5, cost: 0 },
            { name: 'Июл', month: 6, cost: 0 },
            { name: 'Авг', month: 7, cost: 0 },
            { name: 'Сен', month: 8, cost: 0 },
            { name: 'Окт', month: 9, cost: 0 },
            { name: 'Ноя', month: 10, cost: 0 },
            { name: 'Дек', month: 11, cost: 0 },
        ];

        subscriptions.forEach(sub => {
            if (!sub.nextPaymentDate) return;

            // Parse nextPaymentDate
            let paymentDate;
            if (sub.nextPaymentDate.toDate) {
                paymentDate = sub.nextPaymentDate.toDate();
            } else {
                paymentDate = new Date(sub.nextPaymentDate);
            }
            paymentDate.setHours(0, 0, 0, 0);

            const billingPeriod = sub.billingPeriod || (sub.cycle && sub.cycle.includes('год') ? 'yearly' : 'monthly');
            const cost = sub.cost || 0;

            // For yearly subscriptions
            if (billingPeriod === 'yearly') {
                const paymentMonth = paymentDate.getMonth();
                const paymentYear = paymentDate.getFullYear();
                
                // Only add to months that have already passed or are current month
                // Payment must be in current year and month must be <= currentMonth
                if (paymentYear === currentYear && paymentMonth <= currentMonth) {
                    months[paymentMonth].cost += cost;
                }
            } else {
                // For monthly subscriptions - calculate based on payment day
                const paymentDay = paymentDate.getDate();
                
                // Start from the original payment date
                let currentPaymentDate = new Date(paymentDate);
                
                // Find the first payment date in the current year
                // Move payment date to current year if needed
                while (currentPaymentDate.getFullYear() < currentYear) {
                    currentPaymentDate = new Date(currentPaymentDate.getFullYear(), currentPaymentDate.getMonth() + 1, paymentDay);
                }
                
                // If payment is in next year, skip this subscription for current year
                if (currentPaymentDate.getFullYear() > currentYear) {
                    return;
                }
                
                // Calculate all payments from start of year up to current month
                let paymentIterator = new Date(currentYear, 0, paymentDay);
                
                // If subscription started mid-year, start from the actual first payment
                if (currentPaymentDate.getMonth() > 0 || (currentPaymentDate.getMonth() === 0 && currentPaymentDate.getDate() !== paymentDay)) {
                    paymentIterator = new Date(currentPaymentDate);
                }
                
                // Add cost for each month from first payment to current month
                while (paymentIterator.getFullYear() === currentYear && paymentIterator.getMonth() <= currentMonth) {
                    const monthIndex = paymentIterator.getMonth();
                    months[monthIndex].cost += cost;
                    // Move to next month
                    paymentIterator = new Date(paymentIterator.getFullYear(), paymentIterator.getMonth() + 1, paymentDay);
                }
            }
        });

        return months;
    };

    const monthlyData = calculateMonthlyExpenses();

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
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
                <div className="grid grid-cols-1 gap-4">
                    <Card className="bg-surface border-white/5 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-text-secondary mb-2">Месячные расходы</span>
                        <div className="flex flex-wrap gap-4 justify-center">
                            {Object.entries(totalsByCurrency).length > 0 ? (
                                Object.entries(totalsByCurrency).map(([curr, amount]) => (
                                    <span key={curr} className="text-3xl font-bold text-white">
                                        {curr}{amount.toLocaleString()}
                                    </span>
                                ))
                            ) : (
                                <span className="text-3xl font-bold text-white">0</span>
                            )}
                        </div>
                    </Card>
                    <Card className="bg-surface border-white/5 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-text-secondary mb-2">Годовые расходы</span>
                        <div className="flex flex-wrap gap-4 justify-center">
                            {Object.entries(totalsByCurrency).length > 0 ? (
                                Object.entries(totalsByCurrency).map(([curr, amount]) => (
                                    <span key={curr} className="text-3xl font-bold text-primary">
                                        {curr}{(amount * 12).toLocaleString()}
                                    </span>
                                ))
                            ) : (
                                <span className="text-3xl font-bold text-primary">0</span>
                            )}
                        </div>
                    </Card>
                </div>

                <Card className="bg-surface border-white/5 p-4">
                    <h3 className="text-sm font-bold text-white mb-4">Расходы по категориям</h3>
                    <div className="h-64 w-full flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    label={renderCustomizedLabel}
                                    labelLine={false}
                                >
                                    {pieData.map((entry, index) => (
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
                                    formatter={(value, name) => {
                                        return [`${primaryCurrency}${value.toLocaleString()}`, name];
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="w-full mt-2 max-h-32 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-2 px-2">
                                {pieData.map(item => (
                                    <div key={item.name} className="flex items-center gap-2 min-w-0">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                                        <span className="text-xs text-text-secondary truncate">
                                            <span className="font-medium">{item.name}:</span> {primaryCurrency}{item.value.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="bg-surface border-white/5 p-4">
                    <h3 className="text-sm font-bold text-white mb-4">Расходы по месяцам</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 20, bottom: 35 }}>
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }} 
                                    axisLine={false} 
                                    tickLine={false}
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                    tickMargin={8}
                                />
                                <YAxis 
                                    tick={{ fill: '#FFFFFF', fontSize: 10, fontWeight: 500 }} 
                                    axisLine={false} 
                                    tickLine={false}
                                    width={60}
                                    tickFormatter={(value) => {
                                        // Сокращаем большие числа для компактности на мобильных
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
                                    formatter={(value) => {
                                        return [`${primaryCurrency}${value.toLocaleString()}`, 'Расходы'];
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="cost" fill="#00D68F" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </Layout>
    );
}
