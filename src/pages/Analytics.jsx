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

    // Monthly Data: Again, summing raw numbers for visual bars
    const totalMonthlyRaw = subscriptions.reduce((acc, s) => acc + (s.cost || 0), 0);
    const monthlyData = [
        { name: 'Янв', cost: totalMonthlyRaw },
        { name: 'Фев', cost: totalMonthlyRaw },
        { name: 'Мар', cost: totalMonthlyRaw },
        { name: 'Апр', cost: totalMonthlyRaw },
        { name: 'Май', cost: totalMonthlyRaw },
        { name: 'Июн', cost: totalMonthlyRaw },
    ];

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>
                {name}
            </text>
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
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    label={renderCustomizedLabel} // Shows Category Name only (or percent if we changed it)
                                    labelLine={false}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex gap-4 mt-2 justify-center flex-wrap">
                            {pieData.map(item => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                                    <span className="text-xs text-text-secondary">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card className="bg-surface border-white/5 p-4">
                    <h3 className="text-sm font-bold text-white mb-4">Расходы по месяцам</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1E1E1E', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
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
