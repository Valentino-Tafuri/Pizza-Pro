
import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, X, Edit2, Trash2, Scale, Database, ChevronRight, 
  BrainCircuit, ClipboardList, Loader2, AlertTriangle, Truck, Check, 
  Calendar, Sparkles, Phone, ChefHat, Save, Wand2, Wand
} from 'lucide-react';
import { SubRecipe, Ingredient, ComponentUsage, Unit, Supplier } from '../../types';
import { calculateSubRecipeCostPerKg } from '../../services/calculator';
import { GoogleGenAI, Type } from "@google/genai";

interface LabViewProps {
  subRecipes: SubRecipe[];
  ingredients: Ingredient[];
  suppliers: Supplier[];
  onAdd: (sub: SubRecipe) => void;
  onUpdate: (sub: SubRecipe) => void;
  onDelete?: (id: string) => void;
  onAddIngredient: (ing: Ingredient) => Promise<string | undefined>;
  onAddSupplier?: (sup: Supplier) => Promise<string | undefined>;
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const LabView: React.FC<LabViewProps> = ({ subRecipes, ingredients, suppliers, onAdd, onUpdate, onDelete, onAddIngredient, onAddSupplier }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<'choice' | 'manual' | 'ai' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [procLoading, setProcLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [missingComps, setMissingComps] = useState<any[]>([]);
  const [currentMissingIdx, setCurrentMissingIdx] = useState(-1);
  const [wizardIng, setWizardIng] = useState<Partial<Ingredient>>({ unit: 'kg' });
  
  const [showSupModal, setShowSupModal] = useState(false);
  const [supForm, setSupForm] = useState<Partial<Supplier>>({ deliveryDays: [] });
  const [supLoading, setSupLoading] = useState(false);

  const [form, setForm] = useState<Partial<SubRecipe>>({ 
    components: [], 
    initialWeight: 1, 
    yieldWeight: 1,
    category: '',
    procedure: ''
  });

  const categories = useMemo(() => {
    return Array.from(new Set(subRecipes.map(s => s.category))).filter(Boolean);
  }, [subRecipes]);

  const filteredSubRecipes = useMemo(() => {
    return subRecipes.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? s.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [subRecipes, searchTerm, selectedCategory]);

  const handleAICreate = async () => {
    if (!aiPrompt) return;
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sei uno Chef AI esperto in chimica degli impasti. Crea una ricetta tecnica per: "${aiPrompt}".
        DATABASE ESISTENTE: ${JSON.stringify(ingredients.map(i => ({id: i.id, name: i.name})))}
        
        REGOLE:
        1. Se un ingrediente non è presente nel DATABASE ESISTENTE, lascia matchedId vuoto.
        2. Restituisci pesi in GRAMMI.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              initialWeight: { type: Type.NUMBER },
              yieldWeight: { type: Type.NUMBER },
              procedure: { type: Type.STRING },
              components: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    matchedId: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      const comps: ComponentUsage[] = [];
      const missing: any[] = [];

      data.components.forEach((c: any) => {
        const exists = ingredients.find(i => i.id === c.matchedId);
        if (c.matchedId && exists) {
          comps.push({ id: c.matchedId, type: 'ingredient', quantity: c.quantity });
        } else {
          missing.push(c);
        }
      });

      setForm({ ...data, components: comps });

      if (missing.length > 0) {
        setMissingComps(missing);
        setCurrentMissingIdx(0);
        setWizardIng({ name: missing[0].name, unit: 'kg' });
      } else {
        setCreationMode('manual');
      }
    } catch (err) {
      alert("Errore AI. Riprova.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateProcedure = async () => {
    if (!form.name || !form.components?.length) return;
    setProcLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const ingList = form.components.map(c => {
        const ing = ingredients.find(i => i.id === c.id);
        return `${ing?.name || 'Ingrediente'} (${c.quantity}g)`;
      }).join(', ');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sei uno Chef stellato esperto di laboratorio. Scrivi un procedimento tecnico, professionale e dettagliato per la preparazione di "${form.name}" usando questi ingredienti: ${ingList}. 
        Descrivi i passaggi in modo chiaro, citando temperature, tempi di riposo e tecniche specifiche. 
        Fornisci solo il testo del procedimento, senza introduzioni o conclusioni.`,
      });

      setForm(prev => ({ ...prev, procedure: response.text }));
    } catch (err) {
      alert("Errore nella generazione del procedimento.");
    } finally {
      setProcLoading(false);
    }
  };

  const saveWizardIngredient = async () => {
    if (!wizardIng.name || !wizardIng.pricePerUnit || !wizardIng.category) return;
    const newId = await onAddIngredient(wizardIng as Ingredient);
    if (newId) {
      const currentMissing = missingComps[currentMissingIdx];
      setForm(prev => ({
        ...prev,
        components: [...(prev.components || []), { id: newId, type: 'ingredient', quantity: currentMissing.quantity }]
      }));
      
      if (currentMissingIdx < missingComps.length - 1) {
        const nextIdx = currentMissingIdx + 1;
        setCurrentMissingIdx(nextIdx);
        setWizardIng({ name: missingComps[nextIdx].name, unit: 'kg' });
      } else {
        setMissingComps([]);
        setCurrentMissingIdx(-1);
        setCreationMode('manual');
      }
    }
  };

  const toggleSupDeliveryDay = (day: string) => {
    const currentDays = supForm.deliveryDays || [];
    if (currentDays.includes(day)) {
      setSupForm({ ...supForm, deliveryDays: currentDays.filter(d => d !== day) });
    } else {
      setSupForm({ ...supForm, deliveryDays: [...currentDays, day] });
    }
  };

  const handleQuickSup = async () => {
    if (!supForm.name || !onAddSupplier) return;
    setSupLoading(true);
    const id = await onAddSupplier({ 
      ...supForm, 
      id: '', 
      deliveryDays: supForm.deliveryDays || [],
      phone: supForm.phone || '',
      email: supForm.email || '',
      category: supForm.category || 'Generico'
    } as Supplier);
    if (id) {
      setWizardIng({ ...wizardIng, supplierId: id });
      setShowSupModal(false);
      setSupForm({ deliveryDays: [] });
    }
    setSupLoading(false);
  };

  const renderChoice = () => (
    <div className="fixed inset-0 z-[150] bg-white/95 ios-blur flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95">
      <button onClick={() => setCreationMode(null)} className="absolute top-12 right-6 bg-gray-100 p-3 rounded-full"><X size={24}/></button>
      
      <div className="text-center mb-10 space-y-2">
        <Sparkles className="mx-auto text-blue-500 mb-2" size={32} />
        <h2 className="text-3xl font-black">Nuova Preparazione</h2>
        <p className="text-gray-400 font-bold text-sm">Scegli come configurare il semilavorato.</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="text-center pb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 animate-pulse">Vuoi creare una preparazione perfetta con lo Chef AI?</p>
        </div>

        <button onClick={() => setCreationMode('ai')} className="w-full bg-black text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center space-x-5">
          <div className="bg-white/10 p-4 rounded-2xl text-blue-400"><BrainCircuit size={28}/></div>
          <div className="text-left"><h3 className="font-black text-lg">Chef AI Lab</h3><p className="text-white/60 text-xs font-bold">Genera dosi tecniche e resa</p></div>
        </button>
        <button onClick={() => setCreationMode('manual')} className="w-full bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm flex items-center space-x-5">
          <div className="bg-gray-50 p-4 rounded-2xl text-gray-400"><ClipboardList size={28}/></div>
          <div className="text-left"><h3 className="font-black text-lg text-black">Manuale</h3><p className="text-xs text-gray-400 font-bold">Configurazione tecnica</p></div>
        </button>
      </div>
    </div>
  );

  const renderWizard = () => (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce"><AlertTriangle size={32}/></div>
          <h3 className="text-2xl font-black">Conferma Ingrediente</h3>
          <p className="text-gray-400 text-sm mt-1">L'AI ha suggerito <span className="text-black font-black underline decoration-blue-500 underline-offset-4">"{missingComps[currentMissingIdx]?.name}"</span>. <br/>Aggiungerlo all'economato?</p>
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Ingrediente</label>
            <input className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none" value={wizardIng.name || ''} onChange={e => setWizardIng({...wizardIng, name: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Prezzo (€/kg)</label>
              <input type="number" step="0.01" className="w-full bg-black text-white rounded-2xl p-4 text-sm font-black text-center" value={wizardIng.pricePerUnit || ''} onChange={e => setWizardIng({...wizardIng, pricePerUnit: parseFloat(e.target.value)})} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoria</label>
              <input placeholder="Es: Verdure" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none" value={wizardIng.category || ''} onChange={e => setWizardIng({...wizardIng, category: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fornitore</label>
            <div className="flex space-x-2">
              <select className="flex-1 bg-gray-50 rounded-2xl p-4 text-sm font-bold appearance-none border-none" value={wizardIng.supplierId || ''} onChange={e => setWizardIng({...wizardIng, supplierId: e.target.value})}>
                <option value="">Nessuno...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={() => setShowSupModal(true)} className="bg-black text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-transform"><Plus size={20}/></button>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button onClick={() => setMissingComps([])} className="flex-1 py-5 bg-gray-100 text-gray-400 rounded-[2rem] font-black active:scale-95 transition-all">Salta</button>
          <button onClick={saveWizardIngredient} className="flex-[2] bg-black text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2">
            <Check size={18}/> <span>Conferma e Crea</span>
          </button>
        </div>
      </div>

      {showSupModal && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4">
            <h4 className="font-black text-xl tracking-tight">Nuovo Fornitore Rapido</h4>
            <div className="space-y-3">
              <input placeholder="Azienda" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={supForm.name || ''} onChange={e => setSupForm({...supForm, name: e.target.value})} />
              <input placeholder="Telefono" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={supForm.phone || ''} onChange={e => setSupForm({...supForm, phone: e.target.value})} />
            </div>
            <div className="flex space-x-2 pt-2">
              <button onClick={() => setShowSupModal(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-400">Annulla</button>
              <button onClick={handleQuickSup} className="flex-1 py-4 bg-black text-white rounded-2xl font-black shadow-lg">Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderForm = (isEdit: boolean) => (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="px-6 pt-12 pb-4 flex justify-between items-center border-b border-gray-50">
        <h3 className="font-black text-2xl tracking-tight">{isEdit ? 'Modifica Ricetta' : 'Nuova Ricetta'}</h3>
        <button onClick={() => { setCreationMode(null); setEditingId(null); }} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={20}/></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide pb-40">
        <div className="space-y-4">
          <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-5 text-2xl font-black tracking-tight" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome Semilavorato" />
          <input type="text" className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm font-bold" value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} placeholder="Categoria (es. Basi, Condimenti)" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-6 rounded-[2rem] text-center space-y-1">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Peso Iniziale (Kg)</p>
            <input type="number" step="0.001" className="bg-transparent border-none text-2xl font-black text-center w-full p-0" value={form.initialWeight || ''} onChange={e => setForm({...form, initialWeight: parseFloat(e.target.value)})} />
          </div>
          <div className="bg-blue-50 p-6 rounded-[2rem] text-center space-y-1">
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Resa Finale (Kg)</p>
            <input type="number" step="0.001" className="bg-transparent border-none text-2xl font-black text-center w-full p-0 text-blue-600" value={form.yieldWeight || ''} onChange={e => setForm({...form, yieldWeight: parseFloat(e.target.value)})} />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Componenti (g)</h4>
          {form.components?.map(c => {
            const item = ingredients.find(i => i.id === c.id);
            return (
              <div key={c.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <span className="font-bold text-sm text-black">{item?.name || 'Ingrediente'}</span>
                <div className="flex items-center bg-gray-50 px-3 py-2 rounded-xl">
                  <input type="number" className="w-14 bg-transparent text-center font-black text-xs" value={c.quantity} onChange={e => setForm({...form, components: form.components?.map(comp => comp.id === c.id ? {...comp, quantity: parseFloat(e.target.value)} : comp)})} />
                  <span className="text-[10px] text-gray-400 font-bold ml-1">g</span>
                  <button onClick={() => setForm({...form, components: form.components?.filter(comp => comp.id !== c.id)})} className="ml-2 text-red-200"><X size={14}/></button>
                </div>
              </div>
            );
          })}
          <button className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-300 font-bold text-xs flex items-center justify-center space-x-2">
            <Plus size={14}/> <span>Aggiungi Manualmente</span>
          </button>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Procedimento</h4>
            <button 
              onClick={handleGenerateProcedure}
              disabled={procLoading || !form.name}
              className="bg-black text-white px-4 py-2 rounded-full flex items-center space-x-2 active:scale-95 transition-all shadow-lg disabled:opacity-50"
            >
              {procLoading ? <Loader2 className="animate-spin" size={14}/> : <><ChefHat size={14}/> <Sparkles size={12}/> <span className="text-[9px] font-black uppercase">Chef AI</span></>}
            </button>
          </div>
          <div className="relative">
            <textarea 
              className="w-full bg-gray-50 border-none rounded-[2rem] p-6 text-sm font-bold min-h-[300px] leading-relaxed scrollbar-hide"
              placeholder="Inserisci i passaggi della ricetta..."
              value={form.procedure || ''}
              onChange={e => setForm({...form, procedure: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-50 safe-area-bottom">
        <button 
          onClick={() => {
            const payload = { ...form, id: editingId || Math.random().toString(36).substr(2,9) } as SubRecipe;
            if (editingId) onUpdate(payload); else onAdd(payload);
            setCreationMode(null); setEditingId(null);
          }} 
          className="w-full bg-black text-white py-5 rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
          <Save size={20}/> <span>Salva Ricetta</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {creationMode === 'choice' && renderChoice()}
      {creationMode === 'ai' && (
        <div className="fixed inset-0 z-[160] bg-white flex flex-col p-8 animate-in slide-in-from-right duration-500">
          <button onClick={() => setCreationMode(null)} className="absolute top-12 right-6 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
          <div className="mt-16 space-y-6 max-w-lg mx-auto w-full">
            <div className="flex items-center space-x-3 text-blue-500">
              <BrainCircuit size={28}/>
              <h2 className="text-3xl font-black tracking-tight">AI Lab Chef</h2>
            </div>
            <p className="text-gray-400 font-bold text-sm leading-relaxed">Descrivi la preparazione e l'AI gestirà dosi e ingredienti mancanti.</p>
            <textarea placeholder="Es: Pesto di cime di rapa con acciughe e peperoncino..." className="w-full bg-gray-50 rounded-[2rem] p-6 text-lg font-bold min-h-[180px] border-none shadow-inner" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
            <button onClick={handleAICreate} disabled={aiLoading || !aiPrompt} className="w-full bg-black text-white py-6 rounded-[2rem] font-black flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all">
              {aiLoading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20}/> <span>Analisi Tecnica</span></>}
            </button>
          </div>
        </div>
      )}
      
      {missingComps.length > 0 && currentMissingIdx !== -1 && renderWizard()}
      {(creationMode === 'manual' || editingId) && renderForm(!!editingId)}
      
      <div className="space-y-4 px-2">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setSelectedCategory(null)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${!selectedCategory ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}>Tutti</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${selectedCategory === cat ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}>{cat}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Cerca semilavorato..." className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button onClick={() => { setCreationMode('choice'); setForm({ components: [], initialWeight: 1, yieldWeight: 1, procedure: '' }); }} className="absolute right-5 top-1/2 -translate-y-1/2 bg-black text-white p-2 rounded-xl shadow-lg"><Plus size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-2">
        {filteredSubRecipes.map((sub) => {
          const cost = calculateSubRecipeCostPerKg(sub, ingredients);
          return (
            <div key={sub.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 flex items-center justify-between active:bg-gray-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-black tracking-tight">{sub.name}</h3>
                  <span className="text-[8px] text-gray-400 uppercase font-black bg-gray-100 px-1.5 py-0.5 rounded-md">{sub.category}</span>
                </div>
                <div className="flex mt-4 space-x-8">
                  <div><p className="text-[9px] uppercase text-gray-300 font-black">Costo / KG</p><p className="text-lg font-black text-green-600">€ {cost.toFixed(2)}</p></div>
                  <div><p className="text-[9px] uppercase text-gray-300 font-black">Resa</p><p className="text-lg font-black text-black">{sub.yieldWeight.toFixed(3)} kg</p></div>
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <button onClick={() => { setEditingId(sub.id); setForm(sub); setCreationMode('manual'); }} className="p-3 bg-gray-50 rounded-2xl text-gray-400"><Edit2 size={18}/></button>
                <button onClick={() => setConfirmDeleteId(sub.id)} className="p-3 bg-red-50 rounded-2xl text-red-300"><Trash2 size={18}/></button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center px-4 pb-10 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm space-y-3 animate-in slide-in-from-bottom-10">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-5 text-center border-b border-gray-100">
                <AlertTriangle className="mx-auto text-red-500 mb-2" size={24} />
                <h4 className="text-sm font-black text-black uppercase">Elimina Semilavorato</h4>
                <p className="text-[11px] text-gray-500 mt-1">L'azione è irreversibile.</p>
              </div>
              <button onClick={() => { if(onDelete) onDelete(confirmDeleteId); setConfirmDeleteId(null); }} className="w-full py-4 text-red-600 font-black text-base active:bg-red-50 transition-colors">Elimina Definitivamente</button>
            </div>
            <button onClick={() => setConfirmDeleteId(null)} className="w-full bg-white py-4 rounded-2xl font-black text-base text-black shadow-xl">Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabView;
