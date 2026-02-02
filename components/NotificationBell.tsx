import React, { useState } from 'react';
import { Bell, Check, Trash2, X, TrendingUp, TrendingDown, Wallet, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    date: string;
    read: boolean;
    type: 'ALERT' | 'INFO' | 'SUCCESS' | 'MARKET';
}

interface NotificationBellProps {
    notifications: AppNotification[];
    onMarkAsRead: (id: string) => void;
    onClearAll: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onMarkAsRead, onClearAll }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'ALERT': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'SUCCESS': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
            case 'MARKET': return <Wallet className="w-5 h-5 text-blue-500" />;
            default: return <Bell className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <>
            {/* --- FLOATING BUTTON POSITIONING --- */}
            {/* Mobile: bottom-36 right-4 (Tetap di atas tombol FAB)
                Desktop (md): top-4 right-4 (Pojok Kanan Atas Layar)
            */}
            <div className="fixed z-[60] bottom-36 right-4 md:top-4 md:right-4 md:bottom-auto">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative p-3 bg-surface border border-white/10 rounded-full shadow-xl hover:bg-white/10 transition-all group"
                >
                    <Bell className={`w-6 h-6 text-gray-300 group-hover:text-white ${unreadCount > 0 ? 'animate-swing' : ''}`} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#18181b]">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* --- DROPDOWN PANEL --- */}
                {isOpen && (
                    <div className="absolute bottom-16 right-0 md:top-14 md:bottom-auto w-[320px] bg-[#202025] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 origin-bottom-right md:origin-top-right">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#27272a]">
                            <h3 className="font-bold text-white text-sm">Notifications</h3>
                            {notifications.length > 0 && (
                                <button onClick={onClearAll} className="text-[10px] text-gray-400 hover:text-red-400 flex items-center gap-1">
                                    <Trash2 className="w-3 h-3" /> Clear All
                                </button>
                            )}
                        </div>
                        
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-xs">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    No new notifications
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div 
                                        key={n.id} 
                                        onClick={() => onMarkAsRead(n.id)}
                                        className={`p-4 border-b border-white/5 flex gap-3 cursor-pointer transition-colors ${n.read ? 'bg-transparent opacity-60 hover:opacity-100' : 'bg-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-xs font-bold truncate ${n.read ? 'text-gray-400' : 'text-white'}`}>{n.title}</h4>
                                                <span className="text-[10px] text-gray-600 whitespace-nowrap ml-2">{format(new Date(n.date), 'dd MMM')}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 leading-snug">{n.message}</p>
                                        </div>
                                        {!n.read && <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Backdrop */}
            {isOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsOpen(false)}></div>}
            
            <style>{`
                @keyframes swing { 0%, 100% { transform: rotate(0deg); } 20% { transform: rotate(15deg); } 40% { transform: rotate(-10deg); } 60% { transform: rotate(5deg); } 80% { transform: rotate(-5deg); } }
                .animate-swing { animation: swing 1s ease-in-out infinite; }
            `}</style>
        </>
    );
};

export default NotificationBell;