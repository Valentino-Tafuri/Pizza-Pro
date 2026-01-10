import React, { useState } from 'react';
import { Settings, ChevronRight, Beaker, BarChart3, Users, Truck, Store, Calculator, MessageSquare, BrainCircuit, Phone, Wand, ArrowLeft, Save, Loader2 } from 'lucide-react';
import AssetsView from './AssetsView';
import StaffView from './StaffView';
import SuppliersView from './SuppliersView';
import PrefermentiView, { Preferment } from './PrefermentiView';
import BusinessSettingsView from './BusinessSettingsView';
import PricingView from './PricingView';
import { UserData, Employee, Supplier, BusinessConfig, PlatformConnection } from '../../types';

interface SettingsViewProps {
  userData: UserData;
  employees: Employee[];
  suppliers: Supplier[];
  platformConnections: {
    tripadvisor: PlatformConnection;
    google: PlatformConnection;
  };
  onUpdateBep: (config: any) => Promise<void>;
  onSaveEmployee: (emp: Employee) => Promise<string | undefined>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onSaveSupplier: (sup: Supplier) => Promise<string | undefined>;
  onDeleteSupplier: (id: string) => Promise<void>;
  onSaveBusinessConfig: (config: BusinessConfig) => Promise<void>;
  onDisconnectPlatform: (platform: 'tripadvisor' | 'google') => Promise<void>;
  onUpdateUserData?: (data: Partial<UserData>) => Promise<void>;
  initialSubSection?: 'assets' | 'staff' | 'suppliers' | 'business' | 'pricing' | 'extensions' | null;
  onNavigateBack?: () => void;
}

type SettingsSubSection = 'assets' | 'staff' | 'suppliers' | 'business' | 'pricing' | 'extensions' | null;

const SettingsView: React.FC<SettingsViewProps> = ({
  userData,
  employees,
  suppliers,
  platformConnections,
  onUpdateBep,
  onSaveEmployee,
  onDeleteEmployee,
  onSaveSupplier,
  onDeleteSupplier,
  onSaveBusinessConfig,
  onDisconnectPlatform,
  onUpdateUserData,
  initialSubSection = null,
  onNavigateBack
  }) => {
  const [activeSubSection, setActiveSubSection] = useState<SettingsSubSection>(initialSubSection || null);

  // Helper function to navigate back
  const handleNavigateBack = onNavigateBack || (() => setActiveSubSection(null));

  const subSections = [
    { id: 'business' as SettingsSubSection, label: 'La Tua Attività', icon: Store },
    { id: 'assets' as SettingsSubSection, label: 'Costi e Asset', icon: BarChart3 },
    { id: 'pricing' as SettingsSubSection, label: 'Pricing Calculator', icon: Calculator },
    { id: 'staff' as SettingsSubSection, label: 'Staff', icon: Users },
    { id: 'suppliers' as SettingsSubSection, label: 'Fornitori', icon: Truck },
    { id: 'extensions' as SettingsSubSection, label: 'Integrazioni', icon: Settings },
  ];

  // Update activeSubSection when initialSubSection changes
  React.useEffect(() => {
    if (initialSubSection !== null && initialSubSection !== activeSubSection) {
      setActiveSubSection(initialSubSection);
    }
  }, [initialSubSection]);

  if (activeSubSection) {
    return (
      <div className="space-y-6">

        {activeSubSection === 'business' && (
          <BusinessSettingsView
            businessConfig={userData.businessConfig}
            platformConnections={platformConnections}
            onSave={onSaveBusinessConfig}
            onDisconnectPlatform={onDisconnectPlatform}
            onNavigateBack={handleNavigateBack}
          />
        )}

        {activeSubSection === 'assets' && (
          <AssetsView
            userData={userData}
            employees={employees}
            onUpdateBep={onUpdateBep}
          />
        )}

        {activeSubSection === 'pricing' && (
          <PricingView
            bepConfig={userData.bepConfig}
            employees={employees}
            onUpdateBep={onUpdateBep}
          />
        )}

        {activeSubSection === 'staff' && (
          <StaffView
            employees={employees}
            onSave={onSaveEmployee}
            onDelete={onDeleteEmployee}
          />
        )}

        {activeSubSection === 'suppliers' && (
          <SuppliersView
            suppliers={suppliers}
            onSave={onSaveSupplier}
            onDelete={onDeleteSupplier}
          />
        )}

        {activeSubSection === 'extensions' && (
          <ExtensionsView
            userData={userData}
            onUpdateUserData={onUpdateUserData}
            onNavigateBack={handleNavigateBack}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
            <Settings className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-black">Impostazioni</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSubSection(section.id)}
                className="bg-gray-50 hover:bg-gray-100 rounded-2xl p-6 text-left transition-all group border border-gray-100 hover:border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="text-white" size={20} />
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-black transition-colors" />
                </div>
                <h3 className="text-lg font-black text-black mb-2">{section.label}</h3>
                <p className="text-xs text-gray-400 font-semibold">
                  {section.id === 'business' && 'Configura nome, indirizzo e collegamenti Google/TripAdvisor'}
                  {section.id === 'assets' && 'Gestisci costi fissi e parametri variabili'}
                  {section.id === 'pricing' && 'Calcola prezzi basati sul product mix'}
                  {section.id === 'staff' && 'Gestisci collaboratori e dipendenti'}
                  {section.id === 'suppliers' && 'Gestisci database fornitori'}
                  {section.id === 'extensions' && 'Configura token API per Telegram, Gemini, WhatsApp'}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Extensions View Component
interface ExtensionsViewProps {
  userData: UserData;
  onUpdateUserData?: (data: Partial<UserData>) => Promise<void>;
  onNavigateBack?: () => void;
}

const ExtensionsView: React.FC<ExtensionsViewProps> = ({ userData, onUpdateUserData, onNavigateBack }) => {
  const [extensionsForm, setExtensionsForm] = useState({
    telegramToken: userData.extensions?.telegramToken || '',
    googleGeminiToken: userData.extensions?.googleGeminiToken || '',
    whatsappToken: userData.extensions?.whatsappToken || '',
    geminiToken: userData.extensions?.geminiToken || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Update form when userData changes
  React.useEffect(() => {
    setExtensionsForm({
      telegramToken: userData.extensions?.telegramToken || '',
      googleGeminiToken: userData.extensions?.googleGeminiToken || '',
      whatsappToken: userData.extensions?.whatsappToken || '',
      geminiToken: userData.extensions?.geminiToken || '',
    });
  }, [userData.extensions]);

  const handleSaveExtensions = async () => {
    if (!onUpdateUserData) return;
    setIsSaving(true);
    try {
      await onUpdateUserData({
        extensions: extensionsForm
      });
      setIsSaving(false);
    } catch (error) {
      console.error('Errore nel salvataggio delle estensioni:', error);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-20">
      <header className="flex items-center space-x-3">
        {onNavigateBack && (
          <button onClick={onNavigateBack} className="bg-gray-100 p-2 rounded-full active:scale-90 transition-transform">
            <ArrowLeft size={18} />
          </button>
        )}
        <h3 className="text-2xl font-black tracking-tight text-black">Integrazioni</h3>
      </header>

      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 space-y-6">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-300 uppercase px-2">Telegram Bot Token</label>
          <div className="relative">
            <MessageSquare size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" />
            <input
              type="password"
              className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold"
              placeholder="Inserisci il token del tuo bot Telegram"
              value={extensionsForm.telegramToken}
              onChange={e => setExtensionsForm({...extensionsForm, telegramToken: e.target.value})}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-300 uppercase px-2">Google Gemini API Key</label>
          <div className="relative">
            <BrainCircuit size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              type="password"
              className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold"
              placeholder="Inserisci la tua API Key Google Gemini"
              value={extensionsForm.googleGeminiToken}
              onChange={e => setExtensionsForm({...extensionsForm, googleGeminiToken: e.target.value})}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-300 uppercase px-2">WhatsApp Business API Token</label>
          <div className="relative">
            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400" />
            <input
              type="password"
              className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold"
              placeholder="Inserisci il token API di WhatsApp Business"
              value={extensionsForm.whatsappToken}
              onChange={e => setExtensionsForm({...extensionsForm, whatsappToken: e.target.value})}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-300 uppercase px-2">Gemini (Generico) API Key</label>
          <div className="relative">
            <Wand size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400" />
            <input
              type="password"
              className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold"
              placeholder="Inserisci la tua API Key Gemini generica"
              value={extensionsForm.geminiToken}
              onChange={e => setExtensionsForm({...extensionsForm, geminiToken: e.target.value})}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSaveExtensions}
        disabled={isSaving}
        className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
        <span>{isSaving ? 'Salvataggio...' : 'Salva Token'}</span>
      </button>
    </div>
  );
};

export default SettingsView;

