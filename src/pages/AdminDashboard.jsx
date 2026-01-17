import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';
import { Users, UserCheck, UserX, TrendingUp, CreditCard, Folder, ArrowLeft } from 'lucide-react';

export default function AdminDashboard() {
    const { isAdmin, adminStats, loading, refreshStats } = useAdmin();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Prepare chart data
    const usersChartData = useMemo(() => {
        if (!adminStats?.usersByDay) return [];
        
        const last30Days = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            // Более короткий формат даты для лучшей читаемости
            const dayName = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            
            last30Days.push({
                date: dayName,
                users: adminStats.usersByDay[dateStr] || 0,
                subscriptions: adminStats.subscriptionsByDay[dateStr] || 0
            });
        }
        return last30Days;
    }, [adminStats]);

    const pieData = adminStats ? [
        { name: 'Активные', value: adminStats.activeUsers, color: '#00D68F' },
        { name: 'Неактивные', value: adminStats.inactiveUsers, color: '#6B7280' }
    ].filter(item => item.value > 0) : []; // Фильтруем нулевые значения для лучшего отображения

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="p-6 text-center">
                    <p className="text-text-secondary">Пожалуйста, войдите в систему</p>
                </Card>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="p-6 text-center">
                    <p className="text-text-secondary">❌ У вас нет доступа к админ-панели</p>
                </Card>
            </div>
        );
    }

    if (loading && !adminStats) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="p-6 text-center">
                    <p className="text-text-secondary">Загрузка статистики...</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text flex flex-col">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <h1 className="text-xl font-bold text-white">🛡️ Админ-панель</h1>
                    </div>
                    <button
                        onClick={refreshStats}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-black font-bold rounded-lg transition-colors text-sm"
                    >
                        Обновить
                    </button>
                </div>
            </header>
            <main className="flex-1 max-w-md mx-auto w-full p-4 pb-6">
                <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-surface border-white/5 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-text-secondary mb-1">Всего пользователей</p>
                                <p className="text-2xl font-bold text-white">{adminStats?.totalUsers || 0}</p>
                            </div>
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                    </Card>

                    <Card className="bg-surface border-white/5 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-text-secondary mb-1">Активные (7 дней)</p>
                                <p className="text-2xl font-bold text-green-400">{adminStats?.activeUsers || 0}</p>
                            </div>
                            <UserCheck className="w-8 h-8 text-green-400" />
                        </div>
                    </Card>

                    <Card className="bg-surface border-white/5 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-text-secondary mb-1">Неактивные</p>
                                <p className="text-2xl font-bold text-text-secondary">{adminStats?.inactiveUsers || 0}</p>
                            </div>
                            <UserX className="w-8 h-8 text-text-secondary" />
                        </div>
                    </Card>

                    <Card className="bg-surface border-white/5 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-text-secondary mb-1">Новые (7 дней)</p>
                                <p className="text-2xl font-bold text-primary">{adminStats?.newUsersLast7Days || 0}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-primary" />
                        </div>
                    </Card>

                    <Card className="bg-surface border-white/5 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-text-secondary mb-1">Всего подписок</p>
                                <p className="text-2xl font-bold text-white">{adminStats?.totalSubscriptions || 0}</p>
                            </div>
                            <CreditCard className="w-8 h-8 text-primary" />
                        </div>
                    </Card>

                    <Card className="bg-surface border-white/5 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-text-secondary mb-1">Среднее на пользователя</p>
                                <p className="text-2xl font-bold text-white">{adminStats?.averageSubscriptionsPerUser || 0}</p>
                            </div>
                            <Folder className="w-8 h-8 text-primary" />
                        </div>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Active vs Inactive Users Pie Chart */}
                    <Card className="bg-surface border-white/5 p-4">
                        <h3 className="text-sm font-bold text-white mb-4">Активные vs Неактивные пользователи</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={50}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ percent }) => {
                                            const percentage = (percent * 100).toFixed(0);
                                            return percentage !== '0' ? `${percentage}%` : '';
                                        }}
                                        labelLine={false}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1E1E1E', 
                                            border: 'none', 
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value, name) => [value, name]}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={50}
                                        iconType="circle"
                                        wrapperStyle={{ 
                                            fontSize: '11px',
                                            color: '#fff',
                                            paddingTop: '8px',
                                            lineHeight: '1.5'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Users and Subscriptions Over Time */}
                    <Card className="bg-surface border-white/5 p-4">
                        <h3 className="text-sm font-bold text-white mb-4">Новые пользователи и подписки (30 дней)</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart 
                                    data={usersChartData}
                                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                                >
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00D68F" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#00D68F" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorSubscriptions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                        interval="preserveStartEnd"
                                        stroke="#4B5563"
                                    />
                                    <YAxis 
                                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                        width={40}
                                        stroke="#4B5563"
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
                                            const labels = {
                                                'users': '👥 Пользователи',
                                                'subscriptions': '💳 Подписки'
                                            };
                                            return [value, labels[name] || name];
                                        }}
                                        separator=": "
                                        cursor={{ stroke: '#00D68F', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="users" 
                                        stroke="#00D68F" 
                                        strokeWidth={2.5}
                                        dot={{ fill: '#00D68F', r: 3, strokeWidth: 2, stroke: '#1E1E1E' }}
                                        activeDot={{ r: 5, stroke: '#00D68F', strokeWidth: 2 }}
                                        name="users"
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="subscriptions" 
                                        stroke="#3B82F6" 
                                        strokeWidth={2.5}
                                        dot={{ fill: '#3B82F6', r: 3, strokeWidth: 2, stroke: '#1E1E1E' }}
                                        activeDot={{ r: 5, stroke: '#3B82F6', strokeWidth: 2 }}
                                        name="subscriptions"
                                    />
                                    <Legend 
                                        verticalAlign="top" 
                                        height={36}
                                        iconType="line"
                                        wrapperStyle={{ 
                                            fontSize: '11px',
                                            color: '#fff',
                                            paddingBottom: '8px'
                                        }}
                                        formatter={(value) => {
                                            const labels = {
                                                'users': '👥 Пользователи',
                                                'subscriptions': '💳 Подписки'
                                            };
                                            return labels[value] || value;
                                        }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Users List */}
                <Card className="bg-surface border-white/5 p-4">
                    <h3 className="text-sm font-bold text-white mb-4">Список пользователей</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {adminStats?.users?.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-3 bg-surface-hover rounded-lg border border-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${user.isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
                                    <div>
                                        <p className="text-sm font-medium text-white">ID: {user.telegramId || user.id}</p>
                                        <p className="text-xs text-text-secondary">
                                            {user.createdAt ? `Создан: ${user.createdAt.toLocaleDateString('ru-RU')}` : 'Дата создания неизвестна'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">{user.subscriptionCount} подписок</p>
                                    <p className="text-xs text-text-secondary">
                                        {user.lastSeen 
                                            ? `Активен: ${user.lastSeen.toLocaleDateString('ru-RU')}` 
                                            : 'Никогда не был активен'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
                </div>
            </main>
        </div>
    );
}
