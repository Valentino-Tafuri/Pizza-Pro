import React, { useState } from 'react';
import { Settings, ChevronRight, Beaker, BarChart3, Users, Truck, Store } from 'lucide-react';
import AssetsView from './AssetsView';
import StaffView from './StaffView';
import SuppliersView from './SuppliersView';
import PrefermentiView, { Preferment } from './PrefermentiView';
import BusinessSettingsView from './BusinessSettingsView';
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
  initialSubSection?: 'prefermenti' | 'assets' | 'staff' | 'suppliers' | 'business' | null;
}

type SettingsSubSection = 'prefermenti' | 'assets' | 'staff' | 'suppliers' | 'business' | null;

const SettingsView: React.FC<SettingsViewProps> = ({
  userData,
  employees,
  suppliers,
  platformConnections,
  preferments = [],
  onUpdateBep,
  onSaveEmployee,
  onDeleteEmployee,
  onSaveSupplier,
  onDeleteSupplier,
  onSavePreferment,
  onDeletePreferment,
  onSaveBusinessConfig,
  onDisconnectPlatform,
  initialSubSection = null
}) => {
  const [activeSubSection, setActiveSubSection] = useState<SettingsSubSection>(initialSubSection || null);

  const subSections = [
    { id: 'business' as SettingsSubSection, label: 'La Tua Attività', icon: Store },
    { id: 'prefermenti' as SettingsSubSection, label: 'Prefermenti', icon: Beaker },
    { id: 'assets' as SettingsSubSection, label: 'Costi e Asset', icon: BarChart3 },
    { id: 'staff' as SettingsSubSection, label: 'Staff', icon: Users },
    { id: 'suppliers' as SettingsSubSection, label: 'Fornitori', icon: Truck },
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
          />
        )}

        {activeSubSection === 'prefermenti' && (
          <PrefermentiView
            preferments={preferments}
            onSave={onSavePreferment ? onSavePreferment : async (pref) => {
              console.error('onSavePreferment non è definito!', pref);
              alert('Errore: funzione di salvataggio non configurata');
              return undefined;
            }}
            onDelete={onDeletePreferment}
          />
        )}

        {activeSubSection === 'assets' && (
          <AssetsView
            userData={userData}
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
                  {section.id === 'prefermenti' && 'Configura i prefermenti predefiniti'}
                  {section.id === 'assets' && 'Gestisci costi fissi e parametri variabili'}
                  {section.id === 'staff' && 'Gestisci collaboratori e dipendenti'}
                  {section.id === 'suppliers' && 'Gestisci database fornitori'}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;

