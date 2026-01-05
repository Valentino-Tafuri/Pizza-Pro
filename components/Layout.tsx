
import React, { useState } from 'react';
import { 
  LayoutDashboard, Utensils, Beaker, Package, Settings, 
  Truck, Users, BarChart3, ChevronRight, Menu as MenuIcon, X, User, Calculator
} from 'lucide-react';
import { ViewType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setActiveView, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navGroups = [
    {
      label: 'Gestione Quotidiana',
      items: [
        { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'economato' as ViewType, label: 'Economato', icon: Package },
        { id: 'lab' as ViewType, label: 'Topping', icon: Beaker },
        { id: 'menu' as ViewType, label: 'Menu', icon: Utensils },
        { id: 'laboratorio' as ViewType, label: 'Laboratorio', icon: Calculator },
      ]
    },
    {
      label: 'Gestione Manageriale',
      items: [
        { id: 'suppliers' as ViewType, label: 'Fornitori', icon: Truck },
        { id: 'staff' as ViewType, label: 'Staff', icon: Users },
        { id: 'assets' as ViewType, label: 'Costi e Asset', icon: BarChart3 },
      ]
    }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-8 pb-4">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
            <Utensils className="text-white" size={20} />
          </div>
          <span className="text-xl font-black tracking-tighter">Pizza Pro</span>
        </div>

        <nav className="space-y-8">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h3 className="px-4 text-[10px] font-black uppercase tracking-widest text-gray-300">
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${
                        isActive 
                          ? 'bg-black text-white shadow-xl shadow-black/10' 
                          : 'text-gray-400 hover:bg-gray-50 hover:text-black'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-sm font-black tracking-tight">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight size={14} className="opacity-40" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-gray-50">
        <button 
          onClick={() => {
            setActiveView('profile');
            setIsSidebarOpen(false);
          }}
          className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all ${
            activeView === 'profile' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          <User size={20} />
          <span className="text-sm font-black">Profilo Utente</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between p-6 bg-white border-b border-gray-50 sticky top-0 z-40">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2">
            <MenuIcon size={24} />
          </button>
          <h1 className="text-lg font-black tracking-tighter">Pizza Pro</h1>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {isSidebarOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-white animate-in slide-in-from-left duration-300 shadow-2xl">
              <button onClick={() => setIsSidebarOpen(false)} className="absolute top-6 right-4 p-2">
                <X size={24} />
              </button>
              <SidebarContent />
            </div>
          </div>
        )}

        <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
          <header className="mb-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 mb-1">Sezione Attiva</p>
              <h2 className="text-4xl lg:text-5xl font-black text-black tracking-tighter">{title}</h2>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
