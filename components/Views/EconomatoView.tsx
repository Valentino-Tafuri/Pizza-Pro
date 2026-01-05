
import React, { useState, useMemo } from 'react';
import { Search, Edit2, Plus, Trash2, X, AlertTriangle, PlusCircle, Check, Loader2, Tag, Truck, Calendar, Save, Phone, FileDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Ingredient, Unit, Supplier } from '../../types';
import CSVImportExport from '../CSVImportExport';
import { normalizeText } from '../../utils/textUtils';

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
  const [form, setForm] = useState<Partial<Ingredient>>({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showCSVPanel, setShowCSVPanel] = useState(false);

  // Gestione Nuova Categoria nel Form
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  
  // Gestione Nuova Fornitore nel Form
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const [supForm, setSupForm] = useState<Partial<Supplier>>({ name: '', phone: '', category: '', deliveryDays: [] });

  const categories = useMemo(() => Array.from(new Set(ingredients.map(i => i.category))).filter(Boolean), [ingredients]);
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

  const handleSave = () => {
    if (!form.name || !form.category || form.pricePerUnit === undefined) return;
    const payload = { ...form, id: editingId || '' } as Ingredient;
    if (editingId) onUpdate(payload);
    else onAdd(payload);
    handleClose();
  };

  const handleClose = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
    setIsAddingNewCategory(false);
    setIsAddingNewSupplier(false);
  };

  const handleAddQuickSupplier = async () => {
    if (!supForm.name || !onAddSupplier) return;
    const newId = await onAddSupplier(supForm as Supplier);
    if (newId) {
      setForm({ ...form, supplierId: newId });
      setIsAddingNewSupplier(false);
      setSupForm({ name: '', phone: '', category: '', deliveryDays: [] });
    }
  };

  const handleBulkImport = async (ingredientsToImport: Ingredient[]) => {
    for (const ingredient of ingredientsToImport) {
      await onAdd(ingredient);
    }
  };

  const handleDeleteAll = async () => {
    if (onDelete && ingredients.length > 0) {
      for (const ingredient of ingredients) {
        await onDelete(ingredient.id);
      }
    }
  };

  const renderForm = () => (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[95vh] pb-12 scrollbar-hide relative">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
        
        {/* Sottopagina Creazione Fornitore */}
        {isAddingNewSupplier && (
          <div className="absolute inset-0 z-10 bg-white p-8 animate-in slide-in-from-right">
            <header className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black">Nuovo Fornitore</h3>
              <button onClick={() => setIsAddingNewSupplier(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </header>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Ragione Sociale</label>
                <input placeholder="Esempio: Caseificio Valfiorita" className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold" value={supForm.name} onChange={e => setSupForm({...supForm, name: e.target.value})} onBlur={e => setSupForm({...supForm, name: normalizeText(e.target.value)})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Telefono</label>
                  <input placeholder="+39..." className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold" value={supForm.phone} onChange={e => setSupForm({...supForm, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Categoria</label>
                  <input placeholder="Settore" className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold" value={supForm.category} onChange={e => setSupForm({...supForm, category: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Giorni Scarico</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(d => (
                    <button 
                      key={d} 
                      onClick={() => setSupForm({...supForm, deliveryDays: supForm.deliveryDays?.includes(d) ? supForm.deliveryDays.filter(day => day !== d) : [...(supForm.deliveryDays || []), d]})}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${supForm.deliveryDays?.includes(d) ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleAddQuickSupplier} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-xl active:scale-95 transition-all">Salva e Collega</button>
            </div>
          </div>
        )}

        <header className="flex justify-between items-center mb-8">
          <h3 className="text-3xl font-black tracking-tighter">{editingId ? 'Modifica Materia' : 'Nuova Materia'}</h3>
          <button onClick={handleClose} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={24}/></button>
        </header>

        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome Ingrediente</label>
            <input placeholder="Esempio: Farina Tipo 0" className="w-full bg-gray-50 border-none rounded-2xl p-5 text-lg font-black" value={form.name} onChange={e => setForm({...form, name: e.target.value})} onBlur={e => setForm({...form, name: normalizeText(e.target.value)})} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => { setForm({...form, category: cat}); setIsAddingNewCategory(false); }}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${form.category === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}
                >
                  {cat}
                </button>
              ))}
              <button 
                onClick={() => setIsAddingNewCategory(true)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center space-x-1 ${isAddingNewCategory ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-400'}`}
              >
                <Plus size={12}/> <span>Nuova</span>
              </button>
            </div>
            {isAddingNewCategory && (
              <input 
                autoFocus
                placeholder="Nome nuova categoria..." 
                className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-blue-100 border mt-2" 
                value={form.category} 
                onChange={e => setForm({...form, category: e.target.value})} 
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Costo (€)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-300">€</span>
                <input type="number" step="0.01" placeholder="0.00" className="w-full bg-gray-50 border-none rounded-2xl p-5 pl-10 text-xl font-black" value={form.pricePerUnit || ''} onChange={e => setForm({...form, pricePerUnit: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Unità di Misura</label>
              <div className="flex bg-gray-50 rounded-2xl p-1">
                {(['kg', 'l', 'unit'] as Unit[]).map(u => (
                  <button 
                    key={u} 
                    onClick={() => setForm({...form, unit: u})}
                    className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${form.unit === u ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fornitore Associato</label>
              <button onClick={() => setIsAddingNewSupplier(true)} className="text-blue-500 text-[10px] font-black uppercase flex items-center space-x-1">
                <PlusCircle size={12}/> <span>Nuovo Fornitore</span>
              </button>
            </div>
            <select 
              className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold appearance-none" 
              value={form.supplierId || ''} 
              onChange={e => setForm({...form, supplierId: e.target.value})}
            >
              <option value="">Nessun Fornitore</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Visualizzazione Prezzo Live */}
          <div className="bg-gray-50 rounded-[2rem] p-6 text-center">
            <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Prezzo in Anagrafica</p>
            <p className="text-3xl font-black text-black">€ {form.pricePerUnit?.toFixed(2) || '0.00'} <span className="text-sm text-gray-300">/ {form.unit?.toUpperCase()}</span></p>
          </div>

          <button onClick={handleSave} className="w-full py-6 bg-black text-white rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2 mt-4">
            <Save size={20}/>
            <span>Salva in Economato</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Modale Form */}
      {(isAdding || editingId) && renderForm()}

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

      {/* CSV Import/Export Panel */}
      <div className="px-2">
        <button
          onClick={() => setShowCSVPanel(!showCSVPanel)}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
          <FileDown size={18} />
          <span>Import/Export CSV</span>
          {showCSVPanel ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {showCSVPanel && (
          <div className="mt-4 animate-in slide-in-from-top duration-300">
            <CSVImportExport 
              ingredients={ingredients} 
              suppliers={suppliers} 
              onImport={handleBulkImport}
              onDeleteAll={handleDeleteAll}
            />
          </div>
        )}
      </div>

      <div className="space-y-4 px-2">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {allCategories.map((cat) => (
            <button key={cat || 'all'} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${selectedCategory === cat ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}>{cat || 'Tutti'}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Cerca..." className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button onClick={() => { setIsAdding(true); setEditingId(null); setForm({ unit: 'kg', supplierId: '', name: '', category: '', pricePerUnit: 0 }); }} className="absolute right-5 top-1/2 -translate-y-1/2 bg-black text-white p-2 rounded-xl shadow-sm active:scale-90 transition-transform"><Plus size={16} /></button>
        </div>
      </div>

      <div className="space-y-3 px-2">
        {filtered.length === 0 && ingredients.length === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Tag size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-black text-black mb-2">Nessun ingrediente</h3>
            <p className="text-sm font-semibold text-gray-400 mb-6">
              Inizia aggiungendo ingredienti manualmente o importa da CSV
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setIsAdding(true); setEditingId(null); setForm({ unit: 'kg', supplierId: '', name: '', category: '', pricePerUnit: 0 }); }}
                className="bg-black text-white px-6 py-3 rounded-xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>Aggiungi Manualmente</span>
              </button>
              <button
                onClick={() => setShowCSVPanel(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center space-x-2"
              >
                <FileDown size={18} />
                <span>Importa da CSV</span>
              </button>
            </div>
          </div>
        )}
        {filtered.map((ing) => (
          <div key={ing.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-50 flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-xl shadow-inner">📦</div>
              <div>
                <p className="font-black text-black text-sm tracking-tight">{ing.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-[8px] text-gray-400 uppercase font-black bg-gray-100 px-1.5 py-0.5 rounded-md inline-block">{ing.category}</span>
                  {ing.supplierId && (
                    <span className="text-[8px] text-blue-400 uppercase font-black bg-blue-50 px-1.5 py-0.5 rounded-md inline-block flex items-center">
                      <Truck size={8} className="mr-1"/> {suppliers.find(s => s.id === ing.supplierId)?.name || 'Sync...'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right mr-3">
                <p className="font-black text-black text-sm">€ {ing.pricePerUnit.toFixed(2)}</p>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">AL {ing.unit.toUpperCase()}</p>
              </div>
              <button onClick={() => { setEditingId(ing.id); setForm({ ...ing }); }} className="text-gray-300 p-3 bg-gray-50 rounded-2xl active:scale-90 transition-transform"><Edit2 size={16} /></button>
              <button onClick={() => setConfirmDeleteId(ing.id)} className="text-red-200 p-3 bg-red-50/30 rounded-2xl active:scale-90 transition-transform"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && ingredients.length > 0 && (
          <div className="p-20 text-center text-gray-300 uppercase font-black text-[10px] tracking-widest">
            Nessun Ingrediente trovato
          </div>
        )}
      </div>
    </div>
  );
};

export default EconomatoView;
