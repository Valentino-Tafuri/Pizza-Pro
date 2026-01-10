
import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, User, ArrowLeft, LogOut, Truck, Users, Plus, Trash2, 
  Wallet, ChevronRight, Activity, Percent, Calculator, Info,
  Briefcase, Euro, Clock, MapPin, AlertTriangle, Edit2, Save,
  CheckCircle2, Home, Phone, Package, Lock, Mail, ShieldCheck, Loader2,
  TrendingUp, Target, MessageSquare
} from 'lucide-react';
import { auth } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { UserData, Supplier, Employee, FixedCost, Department } from '../types';

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userData: UserData;
  suppliers: Supplier[];
  employees: Employee[];
  onAddSupplier: (supplier: Supplier) => Promise<string | undefined>;
  onAddEmployee: (employee: Employee) => Promise<string | undefined>;
  onUpdateUserData?: (data: Partial<UserData>) => Promise<void>;
  onSignOut: () => void;
  onDeleteSupplier?: (id: string) => void;
  onDeleteEmployee?: (id: string) => void;
}

const DEPARTMENTS: Department[] = ['Pizzeria', 'Cucina', 'Sala', 'Bar', 'Lavaggio', 'Amministrazione'];
const COST_CATEGORIES = ['Affitto', 'Utenze', 'Assicurazione', 'Marketing', 'Manutenzione', 'Altro'];
const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ 
  isOpen, onClose, userData, suppliers, employees, onAddSupplier, onAddEmployee, 
  onUpdateUserData, onSignOut, onDeleteSupplier, onDeleteEmployee 
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'user' | 'bep' | 'suppliers' | 'employees' | 'extensions'>('main');
  
  // Modals state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddFixedCost, setShowAddFixedCost] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPostSaveDialog, setShowPostSaveDialog] = useState<{isOpen: boolean, type: 'staff' | 'bep' | 'suppliers' | 'user'}>({ isOpen: false, type: 'staff' });
  
  // Selection/Editing/Delete confirmation
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ id: string, type: 'employee' | 'supplier' | 'cost' } | null>(null);
  
  // Password Change state
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');

  // Forms state
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    firstName: '', lastName: '', monthlySalary: 0, contributionPercentage: 33, department: 'Pizzeria'
  });
  const [newFixedCost, setNewFixedCost] = useState<Partial<FixedCost>>({
    label: '', amount: 0, category: 'Affitto' as any
  });
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '', phone: '', category: '', deliveryDays: []
  });

  // --- LOGICA CALCOLO BEP ---
  const bepConfig = userData.bepConfig || { fixedCosts: [], foodCostIncidence: 30, serviceIncidence: 5, wasteIncidence: 2, averageTicket: 15 };
  
  const stats = useMemo(() => {
    const totalStaffCost = employees.reduce((acc, emp) => {
      const salary = Number(emp.monthlySalary) || 0;
      const contribution = Number(emp.contributionPercentage) || 0;
      return acc + (salary * (1 + contribution / 100));
    }, 0);
    const totalOtherFixed = bepConfig.fixedCosts.reduce((acc, cost) => acc + (Number(cost.amount) || 0), 0);
    const totalFixed = totalStaffCost + totalOtherFixed;
    
    const variablePercentage = (Number(bepConfig.foodCostIncidence) + Number(bepConfig.serviceIncidence) + Number(bepConfig.wasteIncidence)) / 100;
    const marginRatio = 1 - variablePercentage;
    
    const breakEvenRevenue = marginRatio > 0 ? totalFixed / marginRatio : 0;
    const breakEvenCovers = bepConfig.averageTicket > 0 ? breakEvenRevenue / bepConfig.averageTicket : 0;

    return { totalFixed, variablePercentage: variablePercentage * 100, breakEvenRevenue, breakEvenCovers, totalStaffCost, totalOtherFixed };
  }, [employees, bepConfig]);

  if (!isOpen) return null;

  const updateBep = async (updates: any) => {
    if (onUpdateUserData) {
      await onUpdateUserData({ bepConfig: { ...bepConfig, ...updates } });
    }
  };

  const handleUpdatePassword = async () => {
    setPassError('');
    if (passForm.new !== passForm.confirm) {
      setPassError('Le password non coincidono');
      return;
    }
    setPassLoading(true);
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, passForm.old);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passForm.new);
        setShowPasswordModal(false);
        setPassForm({ old: '', new: '', confirm: '' });
        alert('Password aggiornata!');
      }
    } catch (err: any) {
      setPassError('Credenziali non valide o errore server.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleSaveUser = async () => {
    if (onUpdateUserData) {
      await onUpdateUserData(userData);
      setShowPostSaveDialog({ isOpen: true, type: 'user' });
    }
  };

  const handleSaveEmployee = async () => {
    if (!newEmployee.firstName || !newEmployee.lastName) return;
    const employeeData = { ...newEmployee, id: editingEmployeeId || '' } as Employee;
    await onAddEmployee(employeeData);
    setNewEmployee({ firstName: '', lastName: '', monthlySalary: 0, contributionPercentage: 33, department: 'Pizzeria' });
    setShowAddEmployee(false);
    setShowPostSaveDialog({ isOpen: true, type: 'staff' });
  };

  const handleDeleteEmployee = (id: string) => {
    if (onDeleteEmployee) onDeleteEmployee(id);
    setDeleteConfirmId(null);
  };

  // State per Estensioni
  const [extensionsForm, setExtensionsForm] = useState({
    telegramToken: userData.extensions?.telegramToken || '',
    geminiToken: userData.extensions?.geminiToken || '',
    whatsappToken: userData.extensions?.whatsappToken || '',
    googleGeminiToken: userData.extensions?.googleGeminiToken || '',
  });
  const [extensionsSaving, setExtensionsSaving] = useState(false);

  // Aggiorna il form quando userData cambia
  useEffect(() => {
    setExtensionsForm({
      telegramToken: userData.extensions?.telegramToken || '',
      geminiToken: userData.extensions?.geminiToken || '',
      whatsappToken: userData.extensions?.whatsappToken || '',
      googleGeminiToken: userData.extensions?.googleGeminiToken || '',
    });
  }, [userData.extensions]);

  const handleSaveExtensions = async () => {
    if (!onUpdateUserData) return;
    setExtensionsSaving(true);
    try {
      await onUpdateUserData({
        extensions: {
          telegramToken: extensionsForm.telegramToken || undefined,
          geminiToken: extensionsForm.geminiToken || undefined,
          whatsappToken: extensionsForm.whatsappToken || undefined,
          googleGeminiToken: extensionsForm.googleGeminiToken || undefined,
        }
      });
      setShowPostSaveDialog({ isOpen: true, type: 'user' });
    } catch (error) {
      console.error('Error saving extensions:', error);
    } finally {
      setExtensionsSaving(false);
    }
  };

  const renderExtensions = () => (
    <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-24">
      <header className="flex items-center space-x-3">
        <button onClick={() => setActiveTab('main')} className="bg-gray-100 p-2 rounded-full active:scale-90 transition-transform"><ArrowLeft size={18} /></button>
        <Zap className="text-white/60" size={24} />
        <h3 className="text-2xl font-black tracking-tight text-black">Estensioni</h3>
      </header>

      <div className="space-y-6">
        {/* Telegram Token */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-xl">
              <MessageSquare className="text-blue-600" size={20} />
            </div>
            <div>
              <h4 className="font-black text-black">Token Telegram</h4>
              <p className="text-xs text-gray-500 font-bold">Inserisci il token del bot Telegram</p>
            </div>
          </div>
          <input
            type="password"
            placeholder="Inserisci token Telegram..."
            className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm font-bold"
            value={extensionsForm.telegramToken}
            onChange={(e) => setExtensionsForm({ ...extensionsForm, telegramToken: e.target.value })}
          />
        </div>

        {/* Google Gemini Token */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-purple-50 p-3 rounded-xl">
              <Key className="text-purple-600" size={20} />
            </div>
            <div>
              <h4 className="font-black text-black">Token Google Gemini</h4>
              <p className="text-xs text-gray-500 font-bold">Inserisci il token API di Google Gemini</p>
            </div>
          </div>
          <input
            type="password"
            placeholder="Inserisci token Google Gemini..."
            className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm font-bold"
            value={extensionsForm.googleGeminiToken}
            onChange={(e) => setExtensionsForm({ ...extensionsForm, googleGeminiToken: e.target.value })}
          />
        </div>

        {/* WhatsApp Token */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-50 p-3 rounded-xl">
              <MessageSquare className="text-green-600" size={20} />
            </div>
            <div>
              <h4 className="font-black text-black">Token WhatsApp</h4>
              <p className="text-xs text-gray-500 font-bold">Inserisci il token API di WhatsApp</p>
            </div>
          </div>
          <input
            type="password"
            placeholder="Inserisci token WhatsApp..."
            className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm font-bold"
            value={extensionsForm.whatsappToken}
            onChange={(e) => setExtensionsForm({ ...extensionsForm, whatsappToken: e.target.value })}
          />
        </div>

        {/* Gemini Token (generico) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-orange-50 p-3 rounded-xl">
              <Key className="text-orange-600" size={20} />
            </div>
            <div>
              <h4 className="font-black text-black">Token Gemini</h4>
              <p className="text-xs text-gray-500 font-bold">Inserisci il token API di Gemini</p>
            </div>
          </div>
          <input
            type="password"
            placeholder="Inserisci token Gemini..."
            className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm font-bold"
            value={extensionsForm.geminiToken}
            onChange={(e) => setExtensionsForm({ ...extensionsForm, geminiToken: e.target.value })}
          />
        </div>

        {/* Salva Button */}
        <button
          onClick={handleSaveExtensions}
          disabled={extensionsSaving}
          className="w-full py-5 bg-black text-white rounded-[2rem] font-black shadow-2xl flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {extensionsSaving ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Salvataggio...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>Salva Token</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderBep = () => (
    <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-24">
      <header className="flex items-center space-x-3">
        <button onClick={() => setActiveTab('main')} className="bg-gray-100 p-2 rounded-full active:scale-90 transition-transform"><ArrowLeft size={18} /></button>
        <h3 className="text-2xl font-black tracking-tight text-black">Gestione BEP</h3>
      </header>

      {/* RIEPILOGO PAREGGIO */}
      <section className="bg-black rounded-[2.5rem] p-8 text-white shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={100} /></div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Break-Even Mensile</p>
          <p className="text-5xl font-black tracking-tighter">€ {Math.round(stats.breakEvenRevenue).toLocaleString('it-IT')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
            <p className="text-[8px] font-black uppercase text-white/40">Coperti Necessari</p>
            <p className="text-xl font-black">{Math.ceil(stats.breakEvenCovers)} <span className="text-[9px] text-white/20">UNITÀ</span></p>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
            <p className="text-[8px] font-black uppercase text-white/40">Costi Fissi Tot.</p>
            <p className="text-xl font-black">€ {Math.round(stats.totalFixed).toLocaleString('it-IT')}</p>
          </div>
        </div>
      </section>

      {/* MODIFICA PREZZO COPERTO */}
      <section className="space-y-3 px-2">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Configurazione Scontrino</h4>
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl"><Wallet size={24}/></div>
            <div>
              <p className="text-sm font-black text-black">Scontrino Medio</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Cambio prezzo coperto</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
            <span className="text-xs font-black text-gray-300">€</span>
            <input 
              type="number" 
              className="w-16 bg-transparent text-right font-black text-sm border-none focus:ring-0 p-0" 
              value={bepConfig.averageTicket} 
              onChange={e => updateBep({ averageTicket: parseFloat(e.target.value) || 0 })} 
            />
          </div>
        </div>
      </section>

      {/* COSTI FISSI DETTAGLIO */}
      <section className="space-y-4 px-2">
        <div className="flex justify-between items-center px-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dettaglio Costi Mensili</h4>
          <button onClick={() => setShowAddFixedCost(true)} className="text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center space-x-1">
            <Plus size={14}/> <span>Aggiungi</span>
          </button>
        </div>
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm">
          <div className="p-5 bg-gray-50/50 flex justify-between items-center border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={16}/></div>
              <p className="text-xs font-black text-black">Personale (Lordo Azienda)</p>
            </div>
            <p className="text-xs font-black text-purple-600">€ {Math.round(stats.totalStaffCost).toLocaleString()}</p>
          </div>
          {bepConfig.fixedCosts.map((cost) => (
            <div key={cost.id} className="p-5 flex justify-between items-center border-b border-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-300 uppercase">{cost.category[0]}</div>
                <div><p className="font-black text-xs text-black">{cost.label}</p><p className="text-[8px] text-gray-400 font-bold uppercase">{cost.category}</p></div>
              </div>
              <div className="flex items-center space-x-4">
                <p className="text-xs font-black text-black">€ {cost.amount}</p>
                <button onClick={() => updateBep({ fixedCosts: bepConfig.fixedCosts.filter(c => c.id !== cost.id) })} className="text-red-100 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INCIDENZE VARIABILI */}
      <section className="space-y-3 px-2">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Incidenze Variabili (%)</h4>
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-8">
          {[
            { label: 'Food Cost Previsto', key: 'foodCostIncidence', color: 'accent-orange-500' },
            { label: 'Packaging & Servizio', key: 'serviceIncidence', color: 'accent-blue-500' },
            { label: 'Sfrido & Scarti', key: 'wasteIncidence', color: 'accent-red-500' }
          ].map(inc => (
            <div key={inc.key} className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-black text-black">{inc.label}</span>
                <span className="text-xs font-black bg-gray-50 px-3 py-1 rounded-full border border-gray-100">{(bepConfig as any)[inc.key]}%</span>
              </div>
              <input 
                type="range" min="0" max="60" 
                className={`w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer ${inc.color}`}
                value={(bepConfig as any)[inc.key]}
                onChange={e => updateBep({ [inc.key]: parseInt(e.target.value) })}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderUser = () => (
    <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-20">
      <header className="flex items-center space-x-3">
        <button onClick={() => setActiveTab('main')} className="bg-gray-100 p-2 rounded-full active:scale-90 transition-transform"><ArrowLeft size={18} /></button>
        <h3 className="text-2xl font-black tracking-tight text-black">Profilo Utente</h3>
      </header>

      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-300 uppercase px-2">Nome</label>
            <input 
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold" 
              value={userData.firstName || ''} 
              onChange={e => onUpdateUserData?.({ firstName: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-300 uppercase px-2">Cognome</label>
            <input 
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold" 
              value={userData.lastName || ''} 
              onChange={e => onUpdateUserData?.({ lastName: e.target.value })} 
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-300 uppercase px-2">Telefono</label>
          <div className="relative">
            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
              className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold" 
              value={userData.phone || ''} 
              onChange={e => onUpdateUserData?.({ phone: e.target.value })} 
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-300 uppercase px-2">Telegram Chat ID</label>
          <div className="relative">
            <MessageSquare size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
              className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold" 
              placeholder="Inserisci il tuo Chat ID Telegram"
              value={userData.telegramChatId || ''} 
              onChange={e => onUpdateUserData?.({ telegramChatId: e.target.value })} 
            />
          </div>
          <p className="text-[10px] text-gray-400 font-bold px-2 mt-1">
            Per ottenere il tuo Chat ID, avvia una conversazione con il bot e usa /start
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Sicurezza</h4>
        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100">
          <div className="p-6 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gray-50 text-gray-400 rounded-2xl"><Mail size={20}/></div>
              <div>
                <p className="text-xs font-black text-black">Email</p>
                <p className="text-[10px] text-gray-400 font-bold">{auth.currentUser?.email}</p>
              </div>
            </div>
            <ShieldCheck size={18} className="text-green-400" />
          </div>
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="w-full p-6 flex items-center justify-between active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-50 text-red-400 rounded-2xl"><Lock size={20}/></div>
              <p className="text-xs font-black text-black">Modifica Password</p>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        </div>
      </section>

      <button 
        onClick={handleSaveUser}
        className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center space-x-2 active:scale-95 transition-all"
      >
        <Save size={20} />
        <span>Salva Profilo</span>
      </button>
    </div>
  );

  const renderEmployees = () => (
    <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button onClick={() => setActiveTab('main')} className="bg-gray-100 p-2 rounded-full active:scale-90 transition-transform"><ArrowLeft size={18} /></button>
          <h3 className="text-2xl font-black tracking-tight text-black">Staff</h3>
        </div>
        <button onClick={() => { setShowAddEmployee(true); setEditingEmployeeId(null); setNewEmployee({firstName:'', lastName:'', monthlySalary:0, contributionPercentage:33, department:'Pizzeria'}); }} className="bg-black text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all"><Plus size={20} /></button>
      </header>

      <div className="space-y-4">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-black text-xs uppercase">
                {emp.firstName[0]}{emp.lastName[0]}
              </div>
              <div>
                <p className="font-black text-sm text-black">{emp.firstName} {emp.lastName}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{emp.department}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => { setNewEmployee(emp); setEditingEmployeeId(emp.id); setShowAddEmployee(true); }} className="p-3 bg-gray-50 rounded-2xl text-gray-400"><Edit2 size={16}/></button>
              <button onClick={() => setDeleteConfirmId({ id: emp.id, type: 'employee' })} className="p-3 bg-red-50 text-red-300 rounded-2xl"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
        {employees.length === 0 && <div className="p-20 text-center text-gray-200 font-black uppercase tracking-widest text-[10px]">Nessun Dipendente</div>}
      </div>
    </div>
  );

  const renderMain = () => (
    <div className="space-y-4 animate-in fade-in duration-500">
      <button onClick={() => setActiveTab('bep')} className="w-full bg-black text-white p-8 rounded-[3rem] shadow-2xl flex items-center justify-between active:scale-[0.98] transition-all">
        <div className="flex items-center space-x-5">
          <div className="bg-white/10 p-4 rounded-2xl text-orange-400"><Calculator size={28}/></div>
          <div className="text-left"><p className="font-black text-lg">Analisi BEP</p><p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Pareggio e Margini</p></div>
        </div>
        <ChevronRight size={20} className="text-white/20" />
      </button>
      <div className="grid grid-cols-1 gap-4">
        <button onClick={() => setActiveTab('employees')} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Users size={24}/></div>
            <p className="font-black text-sm">Gestione Staff</p>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>
        <button onClick={() => setActiveTab('suppliers')} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><Truck size={24}/></div>
            <p className="font-black text-sm">Fornitori</p>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>
        <button onClick={() => setActiveTab('user')} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><User size={24}/></div>
            <p className="font-black text-sm">Dati Profilo</p>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>
        <button onClick={() => setActiveTab('extensions')} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl"><Zap size={24}/></div>
            <p className="font-black text-sm">Estensioni</p>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>
      </div>
      <div className="pt-8">
        <button onClick={onSignOut} className="w-full bg-red-50 text-red-600 p-6 rounded-[2.5rem] flex items-center justify-center space-x-2 font-black uppercase text-[10px] active:scale-95 transition-all border border-red-100">
          <LogOut size={18} /><span>Disconnetti</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] ios-blur bg-white/95 flex flex-col p-6 animate-in slide-in-from-right duration-300 overflow-hidden">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-4xl font-black text-black tracking-tighter">Gestione</h2>
        <button onClick={onClose} className="bg-gray-100 p-3 rounded-full text-gray-600 active:scale-90 transition-transform"><X size={24} /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-12 scrollbar-hide">
        {activeTab === 'main' ? renderMain() : 
         activeTab === 'user' ? renderUser() : 
         activeTab === 'bep' ? renderBep() : 
         activeTab === 'employees' ? renderEmployees() : 
         activeTab === 'suppliers' ? renderMain() : 
         activeTab === 'extensions' ? renderExtensions() :
          <div className="p-12 text-center text-gray-300 font-black uppercase text-[10px]">Sincronizzazione...</div>}
      </div>

      {/* DELETE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto"><AlertTriangle size={44}/></div>
            <div><h3 className="text-2xl font-black text-black">Sei sicuro?</h3><p className="text-gray-400 text-sm mt-1">L'azione non può essere annullata.</p></div>
            <div className="space-y-3">
              <button onClick={() => deleteConfirmId.type === 'employee' ? handleDeleteEmployee(deleteConfirmId.id) : null} className="w-full bg-red-500 text-white py-5 rounded-[1.5rem] font-black active:scale-95 transition-all">Elimina Definitivamente</button>
              <button onClick={() => setDeleteConfirmId(null)} className="w-full bg-gray-100 text-black py-5 rounded-[1.5rem] font-black active:scale-95 transition-all">Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 pb-12">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-black">Cambio Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              {passError && <div className="p-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase text-center">{passError}</div>}
              <input type="password" placeholder="Password Attuale" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" value={passForm.old} onChange={e => setPassForm({...passForm, old: e.target.value})} />
              <input type="password" placeholder="Nuova Password" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} />
              <input type="password" placeholder="Conferma Password" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} />
              <button onClick={handleUpdatePassword} disabled={passLoading} className="w-full py-5 bg-black text-white rounded-[2rem] font-black shadow-2xl flex items-center justify-center space-x-2">
                {passLoading ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={20} /><span>Aggiorna Password</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST SAVE DIALOG */}
      {showPostSaveDialog.isOpen && (
        <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-[2rem] flex items-center justify-center mx-auto"><CheckCircle2 size={44} /></div>
            <div><h3 className="text-2xl font-black text-black">Salvato!</h3><p className="text-gray-400 text-sm mt-1">Sincronizzazione completata.</p></div>
            <button onClick={() => { setShowPostSaveDialog({ ...showPostSaveDialog, isOpen: false }); onClose(); }} className="w-full bg-gray-100 text-black py-5 rounded-[1.5rem] font-black flex items-center justify-center space-x-2 active:scale-95 transition-all"><Home size={18}/> <span>Torna alla Home</span></button>
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {showAddEmployee && (
        <div className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 pb-12 overflow-y-auto max-h-[90vh]">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
            <h3 className="text-2xl font-black mb-6">{editingEmployeeId ? 'Modifica Dipendente' : 'Nuovo Dipendente'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Nome" className="w-full bg-gray-50 rounded-2xl p-4 font-bold border-none" value={newEmployee.firstName} onChange={e => setNewEmployee({...newEmployee, firstName: e.target.value})} />
                <input placeholder="Cognome" className="w-full bg-gray-50 rounded-2xl p-4 font-bold border-none" value={newEmployee.lastName} onChange={e => setNewEmployee({...newEmployee, lastName: e.target.value})} />
              </div>
              <select className="w-full bg-gray-50 rounded-2xl p-4 font-bold border-none appearance-none" value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value as Department})}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="bg-gray-50 rounded-[2rem] p-6 space-y-6">
                <div className="flex justify-between items-center"><p className="text-xs font-black text-black">Stipendio Mensile</p><div className="bg-white px-4 py-2 rounded-xl border border-gray-100"><span className="text-xs font-black text-gray-300">€</span><input type="number" className="w-20 bg-transparent text-right font-black text-sm border-none focus:ring-0 p-0" value={newEmployee.monthlySalary || ''} onChange={e => setNewEmployee({...newEmployee, monthlySalary: parseFloat(e.target.value) || 0})} /></div></div>
                <div className="space-y-3"><div className="flex justify-between items-center"><p className="text-xs font-black text-black">Carico Azienda (%)</p><span className="text-xs font-black text-purple-600">+{newEmployee.contributionPercentage}%</span></div><input type="range" min="0" max="60" className="w-full h-1.5 bg-white accent-purple-500 rounded-full appearance-none cursor-pointer" value={newEmployee.contributionPercentage} onChange={e => setNewEmployee({...newEmployee, contributionPercentage: parseInt(e.target.value)})} /></div>
              </div>
              <button onClick={handleSaveEmployee} className="w-full py-5 bg-black text-white rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all">Salva Collaboratore</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD FIXED COST MODAL */}
      {showAddFixedCost && (
        <div className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 pb-12 overflow-y-auto max-h-[90vh]">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
            <h3 className="text-2xl font-black mb-6">Nuovo Costo Fisso</h3>
            <div className="space-y-4">
              <input placeholder="Descrizione (es. Affitto)" className="w-full bg-gray-50 rounded-2xl p-4 font-bold border-none" value={newFixedCost.label} onChange={e => setNewFixedCost({...newFixedCost, label: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                {COST_CATEGORIES.map(c => <button key={c} onClick={() => setNewFixedCost({...newFixedCost, category: c as any})} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newFixedCost.category === c ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>{c}</button>)}
              </div>
              <div className="bg-gray-50 rounded-[2rem] p-6 flex justify-between items-center"><p className="text-xs font-black text-black">Importo Mensile</p><div className="bg-white px-4 py-2 rounded-xl border border-gray-100 flex items-center space-x-1 shadow-sm"><span className="text-xs font-black text-gray-300">€</span><input type="number" className="w-20 bg-transparent text-right font-black text-sm border-none focus:ring-0 p-0" value={newFixedCost.amount || ''} onChange={e => setNewFixedCost({...newFixedCost, amount: parseFloat(e.target.value) || 0})} /></div></div>
              <button onClick={() => { if(newFixedCost.label && newFixedCost.amount) { updateBep({ fixedCosts: [...bepConfig.fixedCosts, { ...newFixedCost, id: Math.random().toString(36).substr(2,9) }] }); setShowAddFixedCost(false); } }} className="w-full py-5 bg-black text-white rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all">Salva Costo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsOverlay;
