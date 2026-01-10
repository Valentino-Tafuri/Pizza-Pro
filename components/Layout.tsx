
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Utensils, Beaker, Package, Settings, 
  Truck, Users, BarChart3, ChevronRight, Menu as MenuIcon, X, User, Calculator,
  Warehouse, Tag, ScanBarcode, TrendingUp, Star, MapPin, FileText
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
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [isInventarioExpanded, setIsInventarioExpanded] = useState(false);
  const [isMarketingExpanded, setIsMarketingExpanded] = useState(false);

  // Auto-expand settings menu when a sub-section is active
  useEffect(() => {
    if (activeView === 'settings-prefermenti' || activeView === 'settings-assets' || activeView === 'settings-staff' || activeView === 'settings-suppliers' || activeView === 'profile') {
      setIsSettingsExpanded(true);
    } else if (activeView !== 'settings') {
      setIsSettingsExpanded(false);
    }
  }, [activeView]);

  // Auto-expand inventario menu when a sub-section is active
  useEffect(() => {
    if (activeView === 'prep-settings' || activeView === 'warehouse' || activeView === 'fifo-labels' || activeView === 'custom-labels' || activeView === 'scan' ||
        activeView === 'inventario-magazzino' || activeView === 'inventario-etichette' || activeView === 'inventario-scan') {
      setIsInventarioExpanded(true);
    } else if (activeView !== 'prep-settings' && activeView !== 'warehouse' && activeView !== 'fifo-labels' && activeView !== 'custom-labels' && activeView !== 'scan' &&
               activeView !== 'inventario-magazzino' && activeView !== 'inventario-etichette' && activeView !== 'inventario-scan') {
      setIsInventarioExpanded(false);
    }
  }, [activeView]);

  // Auto-expand marketing menu when a sub-section is active
  useEffect(() => {
    if (activeView === 'marketing-overview' || activeView === 'marketing-google') {
      setIsMarketingExpanded(true);
    } else if (activeView !== 'marketing') {
      setIsMarketingExpanded(false);
    }
  }, [activeView]);

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
      label: 'Preventivi',
      items: [
        { id: 'create-quote' as ViewType, label: 'Nuovo Preventivo', icon: FileText },
      ]
    },
    {
      label: 'Inventario',
      items: [
        { 
          id: 'inventario' as ViewType, 
          label: 'Inventario', 
          icon: Warehouse,
          hasSubmenu: true,
          subItems: [
            { id: 'prep-settings' as ViewType, label: 'Etichette FIFO', icon: Tag },
            { id: 'warehouse' as ViewType, label: 'Magazzino', icon: Warehouse },
            { id: 'custom-labels' as ViewType, label: 'Etichette Personalizzate', icon: Tag },
            { id: 'scan' as ViewType, label: 'Scan', icon: ScanBarcode },
          ]
        },
      ]
    },
    {
      label: 'Marketing',
      items: [
        { 
          id: 'marketing' as ViewType, 
          label: 'Marketing', 
          icon: TrendingUp,
          hasSubmenu: true,
          subItems: [
            { id: 'marketing-overview' as ViewType, label: 'Panoramica', icon: TrendingUp },
            { id: 'marketing-google' as ViewType, label: 'Google', icon: Star },
          ]
        },
      ]
    },
    {
      label: 'Impostazioni',
      items: [
        { 
          id: 'settings' as ViewType, 
          label: 'Impostazioni', 
          icon: Settings,
          hasSubmenu: true,
          subItems: [
            { id: 'settings-prefermenti' as ViewType, label: 'Prefermenti', icon: Beaker },
            { id: 'settings-assets' as ViewType, label: 'Costi e Asset', icon: BarChart3 },
            { id: 'settings-staff' as ViewType, label: 'Staff', icon: Users },
            { id: 'settings-suppliers' as ViewType, label: 'Fornitori', icon: Truck },
            { id: 'profile' as ViewType, label: 'Profilo Utente', icon: User },
          ]
        },
      ]
    }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-8 pb-4">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
            <Utensils className="text-white" size={20} />
          </div>
          <span className="text-xl font-black tracking-tighter">Pizza Pro</span>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto px-8 pb-4 min-h-0">
        <div className="space-y-8">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h3 className="px-4 text-[10px] font-black uppercase tracking-widest text-gray-300">
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isSettingsSubActive = activeView === 'settings-prefermenti' || activeView === 'settings-assets' || activeView === 'settings-staff' || activeView === 'settings-suppliers' || activeView === 'profile';
                  const isInventarioSubActive = activeView === 'prep-settings' || activeView === 'warehouse' || activeView === 'fifo-labels' || activeView === 'custom-labels' || activeView === 'scan' ||
                    activeView === 'inventario-magazzino' || activeView === 'inventario-etichette' || activeView === 'inventario-scan';
                  const isMarketingSubActive = activeView === 'marketing-overview' || activeView === 'marketing-google';
                  const isActive = activeView === item.id || (item.hasSubmenu && item.id === 'settings' && isSettingsSubActive) || (item.hasSubmenu && item.id === 'inventario' && isInventarioSubActive) || (item.hasSubmenu && item.id === 'marketing' && isMarketingSubActive);
                  const isExpanded = item.hasSubmenu && (
                    (item.id === 'settings' && (isSettingsExpanded || isSettingsSubActive)) ||
                    (item.id === 'inventario' && (isInventarioExpanded || isInventarioSubActive)) ||
                    (item.id === 'marketing' && (isMarketingExpanded || isMarketingSubActive))
                  );
                  
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          if (item.hasSubmenu) {
                            if (item.id === 'settings') {
                              setIsSettingsExpanded(!isSettingsExpanded);
                              if (!isSettingsExpanded) {
                                setActiveView('settings');
                              }
                            } else if (item.id === 'inventario') {
                              // Inventario non apre nulla, solo espande/contrae
                              setIsInventarioExpanded(!isInventarioExpanded);
                            } else if (item.id === 'marketing') {
                              // Marketing non apre nulla, solo espande/contrae
                              setIsMarketingExpanded(!isMarketingExpanded);
                            }
                          } else {
                            setActiveView(item.id);
                            setIsSidebarOpen(false);
                          }
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
                        {item.hasSubmenu ? (
                          <ChevronRight 
                            size={14} 
                            className={`opacity-40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                          />
                        ) : (
                          isActive && <ChevronRight size={14} className="opacity-40" />
                        )}
                      </button>
                      {item.hasSubmenu && isExpanded && item.subItems && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                          {item.subItems.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = activeView === subItem.id;
                            return (
                              <button
                                key={subItem.id}
                                onClick={() => {
                                  setActiveView(subItem.id);
                                  setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all group ${
                                  isSubActive 
                                    ? 'bg-gray-900 text-white shadow-lg' 
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-black'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <SubIcon size={16} strokeWidth={isSubActive ? 2.5 : 2} />
                                  <span className="text-xs font-black tracking-tight">{subItem.label}</span>
                                </div>
                                {isSubActive && <ChevronRight size={12} className="opacity-40" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

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
