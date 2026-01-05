
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, X, Save, AlertTriangle, Users, Phone, Mail, Briefcase } from 'lucide-react';
import { Employee, Department } from '../../types';

interface StaffViewProps {
  employees: Employee[];
  onSave: (emp: Employee) => Promise<string | undefined>;
  onDelete: (id: string) => Promise<void>;
}

const DEPARTMENTS: Department[] = ['Pizzeria', 'Cucina', 'Sala', 'Bar', 'Lavaggio', 'Amministrazione'];

const StaffView: React.FC<StaffViewProps> = ({ employees, onSave, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({
    firstName: '', lastName: '', monthlySalary: 0, contributionPercentage: 33, department: 'Pizzeria'
  });

  const handleOpenEdit = (emp: Employee) => {
    setForm(emp);
    setEditingId(emp.id);
    setIsAdding(true);
  };

  const handleClose = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({ firstName: '', lastName: '', monthlySalary: 0, contributionPercentage: 33, department: 'Pizzeria' });
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) return;
    await onSave({ ...form, id: editingId || '' } as Employee);
    handleClose();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Collaboratori</h3>
        <button onClick={() => setIsAdding(true)} className="bg-black text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center space-x-2">
          <Plus size={16} /> <span>Nuovo Staff</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-5">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-inner uppercase tracking-tighter">
                {emp.firstName[0]}{emp.lastName[0]}
              </div>
              <div>
                <p className="text-lg font-black text-black tracking-tight">{emp.firstName} {emp.lastName}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-50 px-2 py-0.5 rounded-md">{emp.department}</span>
                  <span className="text-[10px] font-black text-gray-300">€ {emp.monthlySalary} / mese</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => handleOpenEdit(emp)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-black transition-colors"><Edit2 size={18}/></button>
              <button onClick={() => setDeleteConfirmId(emp.id)} className="p-3 bg-red-50 text-red-200 rounded-2xl hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black tracking-tighter">{editingId ? 'Modifica Staff' : 'Nuovo Collaboratore'}</h3>
              <button onClick={handleClose} className="p-2 bg-gray-50 rounded-full"><X size={24}/></button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome</label>
                <input placeholder="Esempio: Marco" className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} onBlur={e => setForm({...form, firstName: normalizeText(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Cognome</label>
                <input placeholder="Esempio: Rossi" className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} onBlur={e => setForm({...form, lastName: normalizeText(e.target.value)})} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Reparto</label>
                <div className="flex flex-wrap gap-2">
                  {DEPARTMENTS.map(d => (
                    <button key={d} onClick={() => setForm({...form, department: d})} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${form.department === d ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Stipendio Mensile</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-300">€</span>
                  <input type="number" className="w-full bg-gray-50 border-none rounded-2xl p-5 pl-10 text-sm font-bold" value={form.monthlySalary || ''} onChange={e => setForm({...form, monthlySalary: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Carico Azienda (%)</label>
                <div className="relative">
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-gray-300">%</span>
                  <input type="number" className="w-full bg-gray-50 border-none rounded-2xl p-5 pr-10 text-sm font-bold" value={form.contributionPercentage || ''} onChange={e => setForm({...form, contributionPercentage: parseFloat(e.target.value)})} />
                </div>
              </div>
            </div>

            <button onClick={handleSave} className="w-full py-6 bg-black text-white rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2">
              <Save size={20}/> <span>Salva Modifiche</span>
            </button>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center space-y-8 shadow-2xl">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto"><AlertTriangle size={44}/></div>
            <div>
              <h3 className="text-2xl font-black text-black">Elimina Dipendente?</h3>
              <p className="text-gray-400 text-sm mt-2">I costi associati verranno ricalcolati nel BEP.</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => { onDelete(deleteConfirmId); setDeleteConfirmId(null); }} className="w-full bg-red-500 text-white py-5 rounded-[1.5rem] font-black active:scale-95 transition-all">Sì, elimina</button>
              <button onClick={() => setDeleteConfirmId(null)} className="w-full bg-gray-100 text-black py-5 rounded-[1.5rem] font-black active:scale-95 transition-all">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffView;
