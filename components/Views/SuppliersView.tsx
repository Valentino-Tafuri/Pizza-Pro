
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, X, Save, Truck, Phone, Mail, Package, Calendar } from 'lucide-react';
import { Supplier } from '../../types';

interface SuppliersViewProps {
  suppliers: Supplier[];
  onSave: (sup: Supplier) => Promise<string | undefined>;
  onDelete: (id: string) => Promise<void>;
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const SuppliersView: React.FC<SuppliersViewProps> = ({ suppliers, onSave, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Partial<Supplier>>({ name: '', phone: '', email: '', category: '', deliveryDays: [] });

  const handleOpenEdit = (sup: Supplier) => {
    setForm(sup);
    setEditingId(sup.id);
    setIsAdding(true);
  };

  const handleClose = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({ name: '', phone: '', email: '', category: '', deliveryDays: [] });
  };

  const handleSave = async () => {
    if (!form.name) return;
    await onSave({ ...form, id: editingId || '' } as Supplier);
    handleClose();
  };

  const toggleDay = (day: string) => {
    const current = form.deliveryDays || [];
    setForm({ ...form, deliveryDays: current.includes(day) ? current.filter(d => d !== day) : [...current, day] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Database Fornitori</h3>
        <button onClick={() => setIsAdding(true)} className="bg-black text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center space-x-2">
          <Plus size={16} /> <span>Aggiungi Fornitore</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {suppliers.map((sup) => (
          <div key={sup.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-5">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-inner uppercase">
                {sup.name[0]}
              </div>
              <div>
                <p className="text-lg font-black text-black tracking-tight">{sup.name}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[9px] font-black uppercase text-green-500 bg-green-50 px-2 py-0.5 rounded-md">{sup.category || 'Materia Prima'}</span>
                  {sup.deliveryDays?.map(d => <span key={d} className="text-[9px] font-black uppercase text-gray-300 bg-gray-50 px-2 py-0.5 rounded-md">{d}</span>)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => handleOpenEdit(sup)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl"><Edit2 size={18}/></button>
              <button onClick={() => onDelete(sup.id)} className="p-3 bg-red-50 text-red-200 rounded-2xl"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black tracking-tighter">{editingId ? 'Modifica Fornitore' : 'Nuovo Fornitore'}</h3>
              <button onClick={handleClose} className="p-2 bg-gray-50 rounded-full"><X size={24}/></button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Azienda</label>
                <input placeholder="Esempio: Caseificio Valfiorita" className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} onBlur={e => setForm({...form, name: normalizeText(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Telefono</label>
                <input placeholder="+39..." className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Settore</label>
                <input placeholder="Esempio: Latticini" className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Giorni di Consegna</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d} onClick={() => toggleDay(d)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${form.deliveryDays?.includes(d) ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>{d}</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleSave} className="w-full py-6 bg-black text-white rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all">
              Salva Fornitore
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersView;
