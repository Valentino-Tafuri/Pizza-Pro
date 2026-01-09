
import React, { useState } from 'react';
import { 
  User, ShieldCheck, Mail, Phone, Lock, ChevronRight, Save, 
  Loader2, LogOut, CheckCircle2, AlertTriangle, Key, MessageSquare
} from 'lucide-react';
import { auth } from '../../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { UserData } from '../../types';

interface ProfileViewProps {
  userData: UserData;
  onUpdate: (data: Partial<UserData>) => Promise<void>;
  onSignOut: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userData, onUpdate, onSignOut }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
      setPassError('Credenziali errate o errore di sicurezza.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleSave = async () => {
    setIsUpdating(true);
    await onUpdate(userData);
    setIsUpdating(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
      <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 flex items-center space-x-8">
        <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-inner">
          {userData.firstName?.[0]}{userData.lastName?.[0] || 'U'}
        </div>
        <div className="flex-1">
          <h3 className="text-3xl font-black text-black tracking-tighter">{userData.firstName} {userData.lastName}</h3>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Amministratore Pizzeria</p>
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex items-center space-x-1.5 text-green-500 text-[10px] font-black uppercase">
              <ShieldCheck size={14} /> <span>Account Verificato</span>
            </div>
            <div className="flex items-center space-x-1.5 text-gray-300 text-[10px] font-black uppercase">
              <Mail size={14} /> <span>{auth.currentUser?.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-4">Anagrafica Personale</h4>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-300 uppercase px-2">Nome</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold" value={userData.firstName} onChange={e => onUpdate({ firstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-300 uppercase px-2">Cognome</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold" value={userData.lastName} onChange={e => onUpdate({ lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-300 uppercase px-2">Telefono</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold" value={userData.phone} onChange={e => onUpdate({ phone: e.target.value })} />
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
                  onChange={e => onUpdate({ telegramChatId: e.target.value.trim() })} 
                />
              </div>
              <p className="text-[10px] text-gray-400 font-bold px-2 mt-1">
                Per ottenere il tuo Chat ID, avvia una conversazione con il bot e usa /start
              </p>
              {userData.telegramChatId && (
                <p className="text-[10px] text-green-500 font-bold px-2 mt-1">
                  ✓ Chat ID configurato: {userData.telegramChatId}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-4">Sicurezza Account</h4>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-xl shadow-sm"><Key size={16} className="text-gray-400" /></div>
                <span className="text-xs font-black text-black">Credenziali Accesso</span>
              </div>
              <button onClick={() => setShowPasswordModal(true)} className="text-blue-500 text-[10px] font-black uppercase">Cambia Password</button>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-gray-50">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-black text-black uppercase tracking-widest">Soglia Alert Food Cost</span>
                <span className="text-xs font-black bg-red-50 text-red-500 px-3 py-1 rounded-full">{userData.foodCostThreshold}%</span>
              </div>
              <input 
                type="range" min="15" max="50" 
                className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-red-500"
                value={userData.foodCostThreshold}
                onChange={e => onUpdate({ foodCostThreshold: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="flex items-center space-x-4 pt-6">
        <button 
          onClick={handleSave}
          className="flex-1 bg-black text-white py-6 rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center space-x-2 active:scale-95 transition-all"
        >
          {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> <span>Salva Modifiche Profilo</span></>}
        </button>
        <button 
          onClick={onSignOut}
          className="px-8 bg-red-50 text-red-600 rounded-[2.5rem] font-black flex items-center justify-center space-x-2 active:scale-95 transition-all border border-red-100"
        >
          <LogOut size={20} />
          <span className="hidden sm:inline">Disconnetti</span>
        </button>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl space-y-6">
            <h3 className="text-3xl font-black tracking-tighter">Nuova Password</h3>
            <div className="space-y-4">
              {passError && <p className="p-3 bg-red-50 text-red-500 text-[10px] font-black rounded-xl text-center uppercase">{passError}</p>}
              <input type="password" placeholder="Password Attuale" className="w-full bg-gray-50 border-none rounded-2xl p-5 font-bold" value={passForm.old} onChange={e => setPassForm({...passForm, old: e.target.value})} />
              <input type="password" placeholder="Nuova Password" className="w-full bg-gray-50 border-none rounded-2xl p-5 font-bold" value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} />
              <input type="password" placeholder="Conferma Password" className="w-full bg-gray-50 border-none rounded-2xl p-5 font-bold" value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} />
            </div>
            <div className="flex space-x-3 pt-4">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-5 bg-gray-100 rounded-3xl font-black text-gray-400">Annulla</button>
              <button onClick={handleUpdatePassword} disabled={passLoading} className="flex-1 py-5 bg-black text-white rounded-3xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center">
                {passLoading ? <Loader2 className="animate-spin" /> : 'Aggiorna'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
