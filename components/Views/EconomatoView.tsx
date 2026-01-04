
import React, { useState } from 'react';
import { Search, Edit2, Plus, Trash2, X, AlertTriangle, PlusCircle, Check, Loader2, Tag, Truck, Calendar } from 'lucide-react';
import { Ingredient, Unit, Supplier } from '../../types';

interface EconomatoViewProps {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  onUpdate: (ingredient: Ingredient) => void;
  onAdd: (ingredient: Ingredient) => void;
  onDelete?: (id: string) => void;
  onAddSupplier?: (supplier: Supplier) => Promise<string | undefined>;
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const EconomatoView: React.FC<EconomatoViewProps> = ({ ingredients, suppliers, onUpdate, onAdd, onDelete, onAddSupplier }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Partial<Ingredient>>({ unit: 'kg', supplierId: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const categories = Array.from(new Set(ingredients.map(i => i.category)));
  const allCategories = [null, ...categories];

  const filtered = ingredients.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? i.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = (id: string) => {
    if (onDelete) onDelete(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Conferma eliminazione iOS Style */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center px-4 pb-10 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm space-y-3 animate-in slide-in-from-bottom-10">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-5 text-center border-b border-gray-100">
                <AlertTriangle className="mx-auto text-red-500 mb-2" size={24} />
                <h4 className="text-sm font-black text-black uppercase tracking-tight">Elimina Materia Prima</h4>
                <p className="text-[11px] text-gray-500 mt-1">Sei sicuro? Questa azione è irreversibile.</p>
              </div>
              <button onClick={() => handleDelete(confirmDeleteId)} className="w-full py-4 text-red-600 font-black text-base active:bg-red-50 transition-colors">Elimina Definitivamente</button>
            </div>
            <button onClick={() => setConfirmDeleteId(null)} className="w-full bg-white py-4 rounded-2xl font-black text-base text-black shadow-xl">Annulla</button>
          </div>
        </div>
      )}

      {/* Main UI elements continue as before... */}
      <div className="space-y-4 px-2">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {allCategories.map((cat) => (
            <button key={cat || 'all'} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${selectedCategory === cat ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}>{cat || 'Tutti'}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Cerca..." className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button onClick={() => { setIsAdding(true); setEditingId(null); setForm({ unit: 'kg', supplierId: '' }); }} className="absolute right-5 top-1/2 -translate-y-1/2 bg-black text-white p-2 rounded-xl shadow-sm"><Plus size={16} /></button>
        </div>
      </div>

      <div className="space-y-3 px-2">
        {filtered.map((ing) => (
          <div key={ing.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-50 flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-xl">📦</div>
              <div>
                <p className="font-black text-black text-sm tracking-tight">{ing.name}</p>
                <p className="text-[8px] text-gray-400 uppercase font-black bg-gray-100 px-1.5 py-0.5 rounded-md inline-block mt-1">{ing.category}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right mr-3">
                <p className="font-black text-black text-sm">€ {ing.pricePerUnit.toFixed(2)}</p>
                <p className="text-[8px] text-gray-400 font-bold uppercase">AL {ing.unit.toUpperCase()}</p>
              </div>
              <button onClick={() => { setEditingId(ing.id); setForm({ ...ing }); }} className="text-gray-300 p-3 bg-gray-50 rounded-2xl"><Edit2 size={16} /></button>
              <button onClick={() => setConfirmDeleteId(ing.id)} className="text-red-200 p-3 bg-red-50/30 rounded-2xl"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EconomatoView;
