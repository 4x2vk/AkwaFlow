import { useState } from 'react';
import { Banknote, Shield } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext';
import { Link } from 'react-router-dom';

export function Layout({ children }) {
    const { user } = useAuth();
    const { isAdmin } = useAdmin();
    const [logoError, setLogoError] = useState(false);
    return (
        <div className="min-h-screen bg-background text-text flex flex-col">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                            {logoError ? (
                                <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-500 to-amber-400 rounded-lg"></div>
                            ) : (
                                <img 
                                    src="/akwaflow-logo.png" 
                                    alt="AkwaFlow" 
                                    className="w-full h-full object-cover"
                                    onError={() => setLogoError(true)}
                                />
                            )}
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]" style={{
                            backgroundImage: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 25%, #ec4899 50%, #f59e0b 75%, #8b5cf6 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            backgroundSize: '200% auto'
                        }}>
                            AkwaFlow
                        </h1>
                    </div>
                    {isAdmin && (
                        <Link
                            to="/admin"
                            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                            title="Админ-панель"
                        >
                            <Shield className="w-5 h-5 text-primary" />
                        </Link>
                    )}
                </div>
            </header>

            <main className="flex-1 max-w-md mx-auto w-full p-4 pb-24">
                {!user ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                        <Banknote className="w-16 h-16 text-gray-600 opacity-50" />
                        <h2 className="text-xl font-bold text-white">Login Required</h2>
                        <p className="text-sm text-gray-400 max-w-[250px]">
                            Please open this app from the Telegram Bot menu.
                        </p>
                    </div>
                ) : (
                    children
                )}
            </main>

            <BottomNav />
            <BottomNav />
            <div className="text-[10px] text-center pb-24 text-gray-400 break-all px-4">
                User ID: {user?.uid || 'null'} <br />
                TG: {typeof window.Telegram !== 'undefined' ? 'OK' : 'MISS'} |
                WA: {window.Telegram?.WebApp ? 'OK' : 'MISS'} |
                User: {window.Telegram?.WebApp?.initDataUnsafe?.user ? 'OK' : 'MISS'} <br />
                initData: {window.Telegram?.WebApp?.initData ? 'exists' : 'missing'} <br />
                Expected: 993211663 (from bot chatId)
            </div>
        </div>
    );
}
