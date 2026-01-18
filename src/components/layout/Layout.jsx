import { useState } from 'react';
import { Banknote, Shield } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAppUpdate } from '../../lib/appUpdate';
import { isDevMode } from '../../lib/devMode';

export function Layout({ children }) {
    const { user } = useAuth();
    const { isAdmin } = useAdmin();
    const [logoError, setLogoError] = useState(false);
    const { updateAvailable, infoText, applyUpdate } = useAppUpdate();
    const devMode = isDevMode();
    return (
        <div className="min-h-screen bg-background text-text flex flex-col">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-white/10">
                            {logoError ? (
                                <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-500 to-amber-400 rounded-full"></div>
                            ) : (
                                <img 
                                    src="/akwaflow-logo.png" 
                                    alt="AkwaFlow" 
                                    className="w-full h-full object-cover rounded-full"
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
                    <div className="flex items-center gap-2">
                        {devMode && (
                            <div className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                                DEV
                            </div>
                        )}
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

            {user && updateAvailable && (
                <div className="fixed left-0 right-0 bottom-20 z-50 px-4">
                    <div className="max-w-md mx-auto">
                        <Card className="relative overflow-hidden bg-purple-500/10 border border-purple-500/30 backdrop-blur-md p-4 flex items-center justify-between gap-3 rounded-2xl">
                            <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-purple-500/15"></div>
                            <div className="min-w-0 relative z-10">
                                <div className="text-sm font-bold text-purple-400">Доступно обновление</div>
                                <div className="text-xs text-white/60 truncate">
                                    {infoText || 'Нажмите «Обновить», чтобы применить новую версию.'}
                                </div>
                            </div>
                            <Button size="sm" className="font-bold relative z-10" onClick={applyUpdate}>
                                Обновить
                            </Button>
                        </Card>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
