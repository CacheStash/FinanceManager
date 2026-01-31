import React from 'react';
import { BookOpen, BarChart3, Wallet, MoreHorizontal, Plus, LayoutDashboard, HeartHandshake, Coins, LogIn, LogOut, User as UserIcon, Globe } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddPress: () => void;
  // Auth Props
  user: { name: string; email: string } | null;
  onAuthRequest: () => void;
  onLogout: () => void;
  // Lang Props
  lang: 'en' | 'id';
  setLang: (lang: 'en' | 'id') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onAddPress, user, onAuthRequest, onLogout, lang, setLang }) => {
  const navItems = [
    { id: 'trans', label: lang === 'en' ? 'Trans.' : 'Trans.', icon: BookOpen },
    { id: 'stats', label: lang === 'en' ? 'Stats' : 'Statistik', icon: BarChart3 },
    { id: 'accounts', label: lang === 'en' ? 'Accounts' : 'Akun', icon: Wallet },
    { id: 'non-profit', label: 'Hajj', icon: HeartHandshake },
    { id: 'zakat', label: 'Zakat', icon: Coins }, 
    { id: 'more', label: lang === 'en' ? 'More' : 'Lainnya', icon: MoreHorizontal },
  ];

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-background text-white overflow-hidden transition-colors duration-300">
      
      {/* Desktop/Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-white/10 h-full shrink-0 transition-colors duration-300">
        <div className="p-6 flex flex-col gap-4">
           {/* User / Login Section */}
           <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              {user ? (
                <div className="flex flex-col gap-3">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                      </div>
                   </div>
                   <button 
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 py-2 rounded-lg transition-colors"
                   >
                     <LogOut className="w-3 h-3" /> {lang === 'en' ? 'Log Out' : 'Keluar'}
                   </button>
                </div>
              ) : (
                <button 
                  onClick={onAuthRequest}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-3 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all"
                >
                  <LogIn className="w-4 h-4" /> {lang === 'en' ? 'Login / Sync' : 'Masuk / Sinkron'}
                </button>
              )}
           </div>

           {/* Language Switcher (Placed below Login) */}
           <button 
             onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
             className="w-full flex items-center justify-between px-3 py-2 bg-transparent hover:bg-white/5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors border border-white/5 hover:border-white/10"
           >
             <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Language' : 'Bahasa'}</span>
             </div>
             <div className="flex items-center gap-1 bg-black/20 rounded px-1.5 py-0.5">
                <span className={lang === 'en' ? 'text-primary font-bold' : 'text-gray-600'}>EN</span>
                <span className="text-gray-700">/</span>
                <span className={lang === 'id' ? 'text-primary font-bold' : 'text-gray-600'}>ID</span>
             </div>
           </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id
                  ? 'bg-white/10 text-primary font-medium shadow-sm'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 transition-colors ${activeTab === item.id ? 'text-primary' : 'text-gray-500 group-hover:text-white'}`} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logo Section (Moved to Bottom) */}
        <div className="p-6 mt-auto border-t border-white/5 bg-white/5">
           <div className="flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
               <LayoutDashboard className="w-5 h-5 text-white" />
             </div>
             <div>
                <h1 className="font-bold text-lg tracking-tight leading-none">FinancePro</h1>
                <p className="text-[10px] text-gray-500 mt-0.5">Personal Finance App</p>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full bg-background transition-colors duration-300">
        <div className="flex-1 overflow-hidden relative">
            {children}
        </div>

        {/* Floating Action Button - Visible on ALL Screens */}
        <div className="absolute bottom-4 md:bottom-8 right-4 md:right-8 z-[60]">
          <button 
            onClick={onAddPress}
            className="group flex items-center gap-2 bg-primary hover:bg-rose-600 text-white rounded-full p-4 md:px-6 md:py-4 shadow-lg shadow-primary/30 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6 md:w-5 md:h-5" />
            <span className="hidden md:block font-bold">{lang === 'en' ? 'New Transaction' : 'Transaksi Baru'}</span>
          </button>
        </div>
      </main>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <nav className="md:hidden h-16 bg-surface border-t border-white/10 flex items-center justify-around px-2 z-40 shrink-0 transition-colors duration-300 pb-safe">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              activeTab === item.id ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;