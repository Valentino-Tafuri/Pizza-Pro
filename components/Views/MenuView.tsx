
import React, { useState, useMemo } from 'react';
import { Search, Plus, X, Edit2, Trash2, Loader2, Wand2, BrainCircuit, ClipboardList, ArrowRight, AlertTriangle } from 'lucide-react';
import { MenuItem, Ingredient, SubRecipe, ComponentUsage, Unit, Supplier } from '../../types';
import { calculateMenuItemCost, getFoodCostColor } from '../../services/calculator';
import { GoogleGenAI, Type } from "@google/genai";

interface MenuViewProps {
  menu: MenuItem[];
  ingredients: Ingredient[];
  subRecipes: SubRecipe[];
  suppliers: Supplier[];
  onAdd: (item: MenuItem) => void;
  onUpdate: (item: MenuItem) => void;
  onDelete?: (id: string) => void;
  onAddIngredient: (ingredient: Ingredient) => Promise<string | undefined>;
  onAddSupplier?: (supplier: Supplier) => Promise<string | undefined>;
}

const MenuView: React.FC<MenuViewProps> = ({ menu, ingredients, subRecipes, suppliers, onAdd, onUpdate, onDelete, onAddIngredient, onAddSupplier }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<'choice' | 'manual' | 'ai' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<MenuItem>>({ components: [] });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [missingComps, setMissingComps] = useState<any[]>([]);
  const [currentMissingIdx, setCurrentMissingIdx] = useState(-1);
  const [quickIngPrice, setQuickIngPrice] = useState('');

  const categories = useMemo(() => {
    return Array.from(new Set(menu.map(item => item.category))).filter(Boolean);
  }, [menu]);

  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [menu, searchTerm, selectedCategory]);

  const handleAICreate = async () => {
    if (!aiPrompt) return;
    setAiLoading(true);
    try {
      // Use the API key directly from process.env.API_KEY as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sei un esperto Pizza Chef. Crea una ricetta per: "${aiPrompt}". 
        Usa grammi per le dosi. Restituisci JSON.
        ID esistenti: ${JSON.stringify(ingredients.map(i => ({id: i.id, name: i.name})))}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              sellingPrice: { type: Type.NUMBER },
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

      // Extract text output using the .text property as per guidelines
      const jsonStr = response.text;
      if (!jsonStr) {
        throw new Error("L'AI non ha restituito una risposta valida.");
      }
      const data = JSON.parse(jsonStr);
      const newComps: ComponentUsage[] = [];
      const missing: any[] = [];

      data.components.forEach((c: any) => {
        if (c.matchedId) newComps.push({ id: c.matchedId, type: 'ingredient', quantity: c.quantity });
        else missing.push(c);
      });

      setForm({ name: data.name, sellingPrice: data.sellingPrice, category: 'Menu AI', components: newComps });
      if (missing.length > 0) {
        setMissingComps(missing);
        setCurrentMissingIdx(0);
      } else {
        setCreationMode('manual');
      }
    } catch (err) {
      alert("Errore AI. Controlla la connessione o l'API_KEY.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleResolveMissing = async () => {
    const price = parseFloat(quickIngPrice.replace(',', '.'));
    if (isNaN(price)) return;
    const current = missingComps[currentMissingIdx];
    const newId = await onAddIngredient({
      id: '', name: current.name, unit: 'kg', pricePerUnit: price, category: 'AI Imports'
    });
    if (newId) {
      setForm(prev => ({
        ...prev,
        components: [...(prev.components || []), { id: newId, type: 'ingredient', quantity: current.quantity }]
      }));
      if (currentMissingIdx < missingComps.length - 1) {
        setCurrentMissingIdx(prev => prev + 1);
        setQuickIngPrice('');
      } else {
        setMissingComps([]);
        setCurrentMissingIdx(-1);
        setCreationMode('manual');
      }
    }
  };

  const renderChoice = () => (
    <div className="fixed inset-0 z-[150] bg-white/95 ios-blur flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95">
      <button onClick={() => setCreationMode(null)} className="absolute top-12 right-6 bg-gray-100 p-3 rounded-full"><X size={24}/></button>
      <h2 className="text-3xl font-black mb-12">Nuova Pizza</h2>
      <div className="w-full max-w-sm space-y-4">
        <button onClick={() => setCreationMode('manual')} className="w-full bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm flex items-center space-x-5">
          <div className="bg-gray-50 p-4 rounded-2xl"><ClipboardList size={28}/></div>
          <div className="text-left"><h3 className="font-black text-lg">Manuale</h3><p className="text-xs text-gray-400 font-bold">Inserimento classico</p></div>
        </button>
        <button onClick={() => setCreationMode('ai')} className="w-full bg-black text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center space-x-5">
          <div className="bg-white/10 p-4 rounded-2xl"><BrainCircuit size={28}/></div>
          <div className="text-left"><h3 className="font-black text-lg text-white">Chef AI</h3><p className="text-white/60 text-xs font-bold">Generazione intelligente</p></div>
        </button>
      </div>
    </div>
  );

  const renderWizard = () => (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-[2rem] flex items-center justify-center mx-auto"><AlertTriangle size={40}/></div>
        <h3 className="text-2xl font-black">Materia Assente</h3>
        <p className="text-gray-400 text-sm">Lo Chef suggerisce <span className="text-black font-black">"{missingComps[currentMissingIdx]?.name}"</span>. Qual è il prezzo al KG?</p>
        <input autoFocus type="text" inputMode="decimal" placeholder="€ 0.00" className="w-full bg-gray-50 border-none rounded-2xl p-5 text-2xl font-black text-center" value={quickIngPrice} onChange={e => setQuickIngPrice(e.target.value)} />
        <button onClick={handleResolveMissing} className="w-full bg-black text-white py-5 rounded-[1.5rem] font-black">Aggiungi e Continua</button>
      </div>
    </div>
  );

  const renderForm = (isEdit: boolean) => (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="px-6 pt-12 pb-4 flex justify-between items-center border-b border-gray-50">
        <h3 className="font-black text-2xl tracking-tight">{isEdit ? 'Modifica Pizza' : 'Dettagli Ricetta'}</h3>
        <button onClick={() => { setCreationMode(null); setEditingId(null); }} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={20}/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide pb-32">
        <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xl font-black" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome Pizza" />
        
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoria</label>
          <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold" value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} placeholder="Es: Pizze Classiche" />
        </div>

        <div className="space-y-3">
          {form.components?.map(c => {
            const item = ingredients.find(i => i.id === c.id) || subRecipes.find(s => s.id === c.id);
            return (
              <div key={c.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <span className="font-bold text-sm flex-1 truncate">{item?.name || 'Sync...'}</span>
                <div className="flex items-center bg-gray-50 px-3 py-2 rounded-xl">
                  <input type="number" className="w-12 bg-transparent text-center font-black text-xs" value={c.quantity} onChange={e => setForm({...form, components: form.components?.map(comp => comp.id === c.id ? {...comp, quantity: parseFloat(e.target.value)} : comp)})} />
                  <span className="text-[10px] text-gray-400 font-bold ml-1 uppercase">g</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black text-white p-5 rounded-3xl text-center">
            <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">Prezzo Vendita</span>
            <input type="number" step="0.5" className="bg-transparent border-none text-2xl font-black text-white w-full text-center p-0" value={form.sellingPrice || ''} onChange={e => setForm({...form, sellingPrice: parseFloat(e.target.value)})} />
          </div>
          <div className="bg-blue-50 text-blue-600 p-5 rounded-3xl text-center flex flex-col justify-center">
            <span className="text-[9px] font-black uppercase block mb-1">Food Cost</span>
            <p className="text-2xl font-black">{((calculateMenuItemCost(form as MenuItem, ingredients, subRecipes) / (form.sellingPrice || 1)) * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>
      <div className="p-6 bg-white border-t border-gray-50 safe-area-bottom">
        <button onClick={() => {
          const payload = { ...form, id: editingId || Math.random().toString(36).substr(2,9), category: form.category || 'Generica', components: form.components || [] } as MenuItem;
          if (editingId) onUpdate(payload); else onAdd(payload);
          setCreationMode(null); setEditingId(null);
        }} className="w-full bg-black text-white py-5 rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all">Salva Pizza</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {creationMode === 'choice' && renderChoice()}
      {creationMode === 'ai' && (
        <div className="fixed inset-0 z-[160] bg-white flex flex-col p-8 animate-in slide-in-from-right">
          <button onClick={() => setCreationMode(null)} className="absolute top-12 right-6 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
          <div className="mt-16 space-y-6">
            <h2 className="text-3xl font-black">Chef AI</h2>
            <textarea placeholder="Es: Pizza con datterino giallo, guanciale croccante e stracciatella..." className="w-full bg-gray-50 rounded-3xl p-6 text-lg font-bold min-h-[150px] border-none" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
            <button onClick={handleAICreate} disabled={aiLoading || !aiPrompt} className="w-full bg-black text-white py-6 rounded-[2rem] font-black flex items-center justify-center space-x-3">
              {aiLoading ? <Loader2 className="animate-spin" /> : <><BrainCircuit size={20}/> <span>Progetta Ricetta</span></>}
            </button>
          </div>
        </div>
      )}
      {missingComps.length > 0 && currentMissingIdx !== -1 && renderWizard()}
      {(creationMode === 'manual' || editingId) && renderForm(!!editingId)}

      <div className="space-y-4 px-2">
        {/* Category Filters */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setSelectedCategory(null)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${!selectedCategory ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Tutti
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${selectedCategory === cat ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Cerca pizza..." className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button onClick={() => setCreationMode('choice')} className="absolute right-5 top-1/2 -translate-y-1/2 bg-black text-white p-2 rounded-xl shadow-sm"><Plus size={16} /></button>
        </div>
      </div>

      <div className="space-y-4 px-2">
        {filteredMenu.map((item) => {
          const cost = calculateMenuItemCost(item, ingredients, subRecipes);
          const fc = item.sellingPrice > 0 ? (cost / item.sellingPrice) * 100 : 0;
          return (
            <div key={item.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-black">{item.name}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${getFoodCostColor(fc)}`}>{fc.toFixed(1)}% FC</span>
                </div>
                <div className="flex mt-4 space-x-8">
                  <div><p className="text-[9px] uppercase text-gray-300 font-black">Prezzo</p><p className="text-lg font-black text-black">€ {item.sellingPrice.toFixed(2)}</p></div>
                  <div><p className="text-[9px] uppercase text-gray-300 font-black">Margine</p><p className="text-lg font-black text-green-600">€ {(item.sellingPrice - cost).toFixed(2)}</p></div>
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <button onClick={() => { setEditingId(item.id); setForm(item); setCreationMode('manual'); }} className="bg-gray-50 p-3 rounded-2xl text-gray-400 border border-gray-100"><Edit2 size={18} /></button>
                <button onClick={() => onDelete?.(item.id)} className="bg-red-50 p-3 rounded-2xl text-red-300 border border-red-50"><Trash2 size={18} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MenuView;
