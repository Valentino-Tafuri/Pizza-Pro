
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, X, Edit2, Trash2, Scale, Database, ChevronRight, 
  BrainCircuit, ClipboardList, Loader2, AlertTriangle, Truck, Check, 
  Calendar, Sparkles, Phone, ChefHat, Save, Wand2, Wand, ToggleLeft, ToggleRight, Printer
} from 'lucide-react';
import { SubRecipe, Ingredient, ComponentUsage, Unit, Supplier } from '../../types';
import { calculateSubRecipeCostPerKg } from '../../services/calculator';
import { GoogleGenAI, Type } from "@google/genai";
import { normalizeText, isLabCategory } from '../../utils/textUtils';

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
  
  // Gestione categorie form principale
  const [isAddingNewCategoryForm, setIsAddingNewCategoryForm] = useState(false);
  
  const [showSupModal, setShowSupModal] = useState(false);
  const [supForm, setSupForm] = useState<Partial<Supplier>>({ deliveryDays: [] });
  const [supLoading, setSupLoading] = useState(false);

  const [form, setForm] = useState<Partial<SubRecipe>>({ 
    components: [], 
    initialWeight: 1, 
    yieldWeight: 1,
    category: '',
    procedure: '',
    shelfLife: 0,
    fifoLabel: false
  });
  const [wastePercentage, setWastePercentage] = useState<number>(0); // Percentuale di scarto/sfrido
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [addIngredientSearch, setAddIngredientSearch] = useState('');
  const [showNewIngredientForm, setShowNewIngredientForm] = useState(false);
  const [newIngredientForm, setNewIngredientForm] = useState<Partial<Ingredient>>({ 
    name: '', 
    unit: 'kg', 
    pricePerUnit: 0, 
    category: '', 
    supplierId: '' 
  });
  const [isAddingNewCategoryIng, setIsAddingNewCategoryIng] = useState(false);

  const categories = useMemo(() => {
    return Array.from(new Set(subRecipes.map(s => s.category))).filter(Boolean);
  }, [subRecipes]);

  const ingredientCategories = useMemo(() => {
    return Array.from(new Set(ingredients.map(i => i.category))).filter(Boolean);
  }, [ingredients]);

  const filteredSubRecipes = useMemo(() => {
    // Escludi le ricette del laboratorio (mostrate solo in LabCalculatorView)
    return subRecipes.filter(s => {
      // Escludi ricette del laboratorio
      if (isLabCategory(s.category)) return false;
      
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? s.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [subRecipes, searchTerm, selectedCategory]);

  // Calcola automaticamente il peso iniziale quando cambiano i componenti
  useEffect(() => {
    if (creationMode === 'manual' || editingId) {
      const calculatedInitialWeight = form.components?.reduce((acc, comp) => {
        return acc + (comp.quantity / 1000); // converte da grammi a kg
      }, 0) || 0;
      
      // Aggiorna solo se il valore è diverso (evita loop infiniti)
      if (Math.abs((form.initialWeight || 0) - calculatedInitialWeight) > 0.001) {
        setForm(prev => ({ ...prev, initialWeight: calculatedInitialWeight }));
      }
    }
  }, [form.components, creationMode, editingId]);

  // Calcola automaticamente la resa finale in base allo sfrido
  useEffect(() => {
    if ((creationMode === 'manual' || editingId) && form.initialWeight) {
      const calculatedYieldWeight = form.initialWeight * (1 - wastePercentage / 100);
      
      // Aggiorna solo se il valore è diverso (evita loop infiniti)
      if (Math.abs((form.yieldWeight || 0) - calculatedYieldWeight) > 0.001) {
        setForm(prev => ({ ...prev, yieldWeight: calculatedYieldWeight }));
      }
    }
  }, [form.initialWeight, wastePercentage, creationMode, editingId]);

  const handleAICreate = async () => {
    if (!aiPrompt) return;
    
    // Verifica API key
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey.includes('PLACEHOLDER')) {
      alert("⚠️ API Key Gemini non configurata!\n\nConfigura GEMINI_API_KEY nel file .env.local");
      return;
    }
    
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
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
        // Mantieni il popup AI aperto mentre gestisci gli ingredienti mancanti
      } else {
        // Chiudi il popup AI e apri direttamente il form manuale
        setCreationMode('manual');
        setAiPrompt(''); // Pulisci il prompt
      }
    } catch (err: any) {
      console.error('AI Error:', err);
      const errorMsg = err?.message || err?.toString() || 'Errore sconosciuto';
      
      if (errorMsg.includes('API_KEY') || errorMsg.includes('API key') || errorMsg.includes('authentication')) {
        alert("❌ Errore API Key Gemini!\n\nVerifica che GEMINI_API_KEY sia configurata correttamente nel file .env.local");
      } else if (errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        alert("⚠️ LIMITE API RAGGIUNTO\n\nHai superato il limite di richieste API di Google Gemini.\n\nSoluzioni:\n• Attendi qualche ora (limite giornaliero)\n• Attendi fino al prossimo mese (limite mensile)\n• Considera di aggiornare il piano Google Cloud\n\nNel frattempo, puoi creare le ricette manualmente.");
      } else if (errorMsg.includes('503') || errorMsg.includes('service unavailable')) {
        alert("⚠️ Servizio temporaneamente non disponibile\n\nIl servizio Gemini è temporaneamente sovraccarico. Riprova tra qualche minuto.");
      } else {
        alert(`Errore AI: ${errorMsg}\n\nRiprova o controlla la connessione.`);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateProcedure = async () => {
    if (!form.name || !form.components?.length) return;
    
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey.includes('PLACEHOLDER')) {
      alert("⚠️ API Key Gemini non configurata!");
      return;
    }
    
    setProcLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
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
    } catch (err: any) {
      console.error('AI Procedure Error:', err);
      const errorMsg = err?.message || err?.toString() || 'Errore sconosciuto';
      
      if (errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        alert("⚠️ LIMITE API RAGGIUNTO\n\nHai superato il limite di richieste API di Google Gemini.\n\nSoluzioni:\n• Attendi qualche ora (limite giornaliero)\n• Attendi fino al prossimo mese (limite mensile)\n• Considera di aggiornare il piano Google Cloud\n\nNel frattempo, puoi scrivere il procedimento manualmente.");
      } else if (errorMsg.includes('503') || errorMsg.includes('service unavailable')) {
        alert("⚠️ Servizio temporaneamente non disponibile\n\nIl servizio Gemini è temporaneamente sovraccarico. Riprova tra qualche minuto.");
      } else {
        alert(`Errore nella generazione del procedimento: ${errorMsg}\n\nPuoi scrivere il procedimento manualmente.`);
      }
    } finally {
      setProcLoading(false);
    }
  };

  const saveWizardIngredient = async () => {
    if (!wizardIng.name || !wizardIng.pricePerUnit || !wizardIng.category) return;
    const ingredientToSave = { ...wizardIng, name: normalizeText(wizardIng.name || '') } as Ingredient;
    const newId = await onAddIngredient(ingredientToSave);
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
      // Se siamo nel wizard, aggiorna wizardIng
      if (currentMissingIdx >= 0) {
        setWizardIng({ ...wizardIng, supplierId: id });
      }
      // Se siamo nel form nuovo ingrediente, aggiorna newIngredientForm
      if (showNewIngredientForm) {
        setNewIngredientForm({ ...newIngredientForm, supplierId: id });
      }
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
            <input className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none" value={wizardIng.name || ''} onChange={e => setWizardIng({...wizardIng, name: e.target.value})} onBlur={e => setWizardIng({...wizardIng, name: normalizeText(e.target.value)})} />
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
          <button onClick={() => { setMissingComps([]); setCurrentMissingIdx(-1); setCreationMode('manual'); }} className="flex-1 py-5 bg-gray-100 text-gray-400 rounded-[2rem] font-black active:scale-95 transition-all">Salta</button>
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
              <input placeholder="Azienda" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={supForm.name || ''} onChange={e => setSupForm({...supForm, name: e.target.value})} onBlur={e => setSupForm({...supForm, name: normalizeText(e.target.value)})} />
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
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[95vh] pb-12 scrollbar-hide relative">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
        
        <header className="flex justify-between items-center mb-8">
          <h3 className="text-3xl font-black tracking-tighter">{isEdit ? 'Modifica Topping' : 'Nuovo Topping'}</h3>
          <button onClick={() => { setCreationMode(null); setEditingId(null); setIsAddingNewCategoryForm(false); }} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={24}/></button>
        </header>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Preparazione</label>
            <input
              type="text"
              className="w-full bg-gray-50 border-none rounded-2xl p-5 text-2xl font-black"
              value={form.name || ''}
              onChange={e => setForm({...form, name: e.target.value})}
              onBlur={e => setForm({...form, name: normalizeText(e.target.value)})}
              placeholder="Nome Preparazione"
            />
          </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoria Ricetta</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => { setForm({...form, category: cat}); setIsAddingNewCategoryForm(false); }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${form.category === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}
              >
                {cat}
              </button>
            ))}
            <button 
              onClick={() => setIsAddingNewCategoryForm(true)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center space-x-1 ${isAddingNewCategoryForm ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-400'}`}
            >
              <Plus size={12}/> <span>Nuova</span>
            </button>
          </div>
          {isAddingNewCategoryForm && (
            <input 
              autoFocus
              placeholder="Nome nuova categoria..." 
              className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-blue-100 border mt-2" 
              value={form.category} 
              onChange={e => setForm({...form, category: e.target.value})} 
            />
          )}
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Dosi Ingredienti (g)</h4>
          {form.components?.map(c => {
            const item = ingredients.find(i => i.id === c.id) || subRecipes.find(s => s.id === c.id);
            // Calcola il costo del componente
            let componentCost = 0;
            if (c.type === 'ingredient') {
              const ing = ingredients.find(i => i.id === c.id);
              if (ing) {
                const multiplier = (ing.unit === 'kg' || ing.unit === 'l') ? 0.001 : 1;
                componentCost = ing.pricePerUnit * c.quantity * multiplier;
              }
            } else if (c.type === 'subrecipe') {
              const nestedSub = subRecipes.find(s => s.id === c.id);
              if (nestedSub) {
                const nestedCostPerKg = calculateSubRecipeCostPerKg(nestedSub, ingredients, subRecipes);
                componentCost = nestedCostPerKg * (c.quantity / 1000);
              }
            }
            
            // Calcola il costo totale della preparazione (includendo anche semilavorati)
            const totalCost = form.components?.reduce((acc, comp) => {
              if (comp.type === 'ingredient') {
                const ing = ingredients.find(i => i.id === comp.id);
                if (ing) {
                  const multiplier = (ing.unit === 'kg' || ing.unit === 'l') ? 0.001 : 1;
                  return acc + (ing.pricePerUnit * comp.quantity * multiplier);
                }
              } else if (comp.type === 'subrecipe') {
                const nestedSub = subRecipes.find(s => s.id === comp.id);
                if (nestedSub) {
                  const nestedCostPerKg = calculateSubRecipeCostPerKg(nestedSub, ingredients, subRecipes);
                  return acc + (nestedCostPerKg * (comp.quantity / 1000));
                }
              }
              return acc;
            }, 0) || 0;
            
            const incidence = totalCost > 0 ? (componentCost / totalCost) * 100 : 0;
            
            return (
              <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-black flex-1">{item?.name || 'Sync...'}</span>
                  <div className="flex items-center bg-gray-50 px-3 py-2 rounded-xl">
                    <input 
                      type="number" 
                      step="0.1"
                      className="w-16 bg-transparent text-center font-black text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-1" 
                      value={c.quantity} 
                      onChange={e => {
                        const newQuantity = parseFloat(e.target.value) || 0;
                        setForm({...form, components: form.components?.map(comp => comp.id === c.id ? {...comp, quantity: newQuantity} : comp)});
                      }} 
                    />
                    <span className="text-[10px] text-gray-400 font-bold ml-1 uppercase">g</span>
                    <button onClick={() => setForm({...form, components: form.components?.filter(comp => comp.id !== c.id)})} className="ml-2 text-red-200 hover:text-red-500 transition-colors"><X size={14}/></button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold">€{componentCost.toFixed(2)}</span>
                  <span className="text-blue-600 font-black">{incidence.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
          <button 
            onClick={() => setShowAddIngredientModal(true)}
            className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-300 font-bold text-xs flex items-center justify-center space-x-2 hover:border-gray-200 hover:text-gray-400 transition-colors"
          >
            <Plus size={14}/> <span>Aggiungi Manualmente</span>
          </button>
          
          {/* Selettore percentuale di scarto */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Scarto</span>
            <div className="flex items-center bg-white rounded-xl px-3 py-2 border border-gray-200">
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="100"
                className="w-16 bg-transparent text-center text-sm font-black text-gray-600 border-none p-0" 
                value={wastePercentage} 
                onChange={e => setWastePercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} 
              />
              <span className="text-[10px] font-black text-gray-400 ml-1">%</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-50">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center space-x-2">
              <ChefHat size={14} /> <span>Procedimento Tecnico</span>
            </h4>
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
              className="w-full bg-gray-50 border-none rounded-[2rem] p-6 text-sm font-bold min-h-[300px] leading-relaxed scrollbar-hide shadow-inner"
              placeholder="Procedura della ricetta..."
              value={form.procedure || ''}
              onChange={e => setForm({...form, procedure: e.target.value})}
            />
          </div>
        </div>

        {/* Durata Conservazione e Etichetta FIFO */}
        <div className="pt-4 border-t border-gray-50 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Durata Conservazione (giorni)</label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Es: 3"
                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold"
                value={form.shelfLife || ''}
                onChange={e => setForm({...form, shelfLife: parseInt(e.target.value) || 0})}
              />
              <p className="text-[8px] text-gray-400 font-bold px-1">Durata del prodotto una volta messo nei contenitori di linea</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Etichetta FIFO</label>
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                <span className="text-sm font-black text-black">Crea Etichetta FIFO</span>
                <button
                  onClick={() => setForm({...form, fifoLabel: !form.fifoLabel})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.fifoLabel ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${form.fifoLabel ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
                <span className="text-[10px] font-bold text-gray-400">{form.fifoLabel ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
          <div className="bg-gray-50 p-6 rounded-[2rem] text-center space-y-1">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Peso Iniziale (Kg)</p>
            <input 
              type="number" 
              step="0.001" 
              readOnly
              className="bg-transparent border-none text-2xl font-black text-center w-full p-0 cursor-not-allowed opacity-75" 
              value={(form.initialWeight || 0).toFixed(3)} 
            />
            <p className="text-[8px] text-gray-400 font-bold mt-1">Calcolato automaticamente</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-[2rem] text-center space-y-1">
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Resa Finale (Kg)</p>
            <input 
              type="number" 
              step="0.001" 
              readOnly
              className="bg-transparent border-none text-2xl font-black text-center w-full p-0 text-blue-600 cursor-not-allowed opacity-75" 
              value={(form.yieldWeight || 0).toFixed(3)} 
            />
            <p className="text-[8px] text-blue-400 font-bold mt-1">Calcolato automaticamente</p>
          </div>
        </div>

        <button 
          onClick={() => {
            // Calcola initialWeight e yieldWeight se non sono già calcolati
            const calculatedInitialWeight = form.components?.reduce((acc, comp) => {
              return acc + (comp.quantity / 1000); // converte da grammi a kg
            }, 0) || 0;
            
            const finalInitialWeight = form.initialWeight > 0 ? form.initialWeight : calculatedInitialWeight;
            const finalYieldWeight = form.yieldWeight > 0 ? form.yieldWeight : (finalInitialWeight * (1 - wastePercentage / 100));
            
            const payload = { 
              ...form, 
              name: normalizeText(form.name || ''), 
              id: editingId || Math.random().toString(36).substr(2,9),
              initialWeight: finalInitialWeight,
              yieldWeight: finalYieldWeight > 0 ? finalYieldWeight : finalInitialWeight
            } as SubRecipe;
            
            console.log('[LabView] Salvataggio ricetta:', {
              name: payload.name,
              components: payload.components?.length || 0,
              initialWeight: payload.initialWeight,
              yieldWeight: payload.yieldWeight,
              wastePercentage
            });
            
            if (editingId) onUpdate(payload); else onAdd(payload);
            setCreationMode(null); setEditingId(null); setIsAddingNewCategoryForm(false);
          }} 
          className="w-full py-6 bg-black text-white rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2 mt-4"
        >
          <Save size={20}/> <span>Finalizza Ricetta</span>
        </button>
        </div>
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
      
      {/* Modal per aggiungere ingredienti manualmente */}
      {showAddIngredientModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tight">Aggiungi Ingrediente</h3>
              <button onClick={() => { 
                setShowAddIngredientModal(false); 
                setAddIngredientSearch(''); 
                setShowNewIngredientForm(false);
                setNewIngredientForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
                setIsAddingNewCategoryIng(false);
              }} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:bg-gray-200 transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cerca ingrediente o semilavorato..." 
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" 
                value={addIngredientSearch} 
                onChange={(e) => setAddIngredientSearch(e.target.value)} 
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {/* Pulsante per aggiungere nuovo ingrediente */}
              {!showNewIngredientForm && (
                <button
                  onClick={() => setShowNewIngredientForm(true)}
                  className="w-full p-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-bold text-sm flex items-center justify-center space-x-2 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <Plus size={16}/> <span>Nuovo Ingrediente</span>
                </button>
              )}

              {/* Form per nuovo ingrediente */}
              {showNewIngredientForm && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-sm text-black">Nuovo Ingrediente</h4>
                    <button onClick={() => { setShowNewIngredientForm(false); setNewIngredientForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' }); }} className="text-gray-400 hover:text-gray-600">
                      <X size={18}/>
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Ingrediente</label>
                    <input 
                      placeholder="Es: Farina Tipo 0" 
                      className="w-full bg-white border-none rounded-2xl p-4 text-sm font-bold" 
                      value={newIngredientForm.name || ''} 
                      onChange={e => setNewIngredientForm({...newIngredientForm, name: e.target.value})}
                      onBlur={e => setNewIngredientForm({...newIngredientForm, name: normalizeText(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoria</label>
                    <div className="flex flex-wrap gap-2">
                      {ingredientCategories.map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => { setNewIngredientForm({...newIngredientForm, category: cat}); setIsAddingNewCategoryIng(false); }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newIngredientForm.category === cat ? 'bg-black text-white' : 'bg-white text-gray-400'}`}
                        >
                          {cat}
                        </button>
                      ))}
                      <button 
                        onClick={() => setIsAddingNewCategoryIng(true)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center space-x-1 ${isAddingNewCategoryIng ? 'bg-blue-600 text-white' : 'bg-white text-blue-400 border border-blue-200'}`}
                      >
                        <Plus size={12}/> <span>Nuova</span>
                      </button>
                    </div>
                    {isAddingNewCategoryIng && (
                      <input 
                        autoFocus
                        placeholder="Nome nuova categoria..." 
                        className="w-full bg-white rounded-xl p-4 text-sm font-bold border border-blue-200" 
                        value={newIngredientForm.category || ''} 
                        onChange={e => setNewIngredientForm({...newIngredientForm, category: e.target.value})} 
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Prezzo (€/kg)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        className="w-full bg-white border-none rounded-2xl p-4 text-sm font-black text-center" 
                        value={newIngredientForm.pricePerUnit || ''} 
                        onChange={e => setNewIngredientForm({...newIngredientForm, pricePerUnit: parseFloat(e.target.value) || 0})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unità</label>
                      <select 
                        className="w-full bg-white border-none rounded-2xl p-4 text-sm font-bold" 
                        value={newIngredientForm.unit || 'kg'} 
                        onChange={e => setNewIngredientForm({...newIngredientForm, unit: e.target.value as Unit})}
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="l">l</option>
                        <option value="ml">ml</option>
                        <option value="pz">pz</option>
                        <option value="unit">unit</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fornitore</label>
                    <div className="flex space-x-2">
                      <select 
                        className="flex-1 bg-white rounded-2xl p-4 text-sm font-bold border-none" 
                        value={newIngredientForm.supplierId || ''} 
                        onChange={e => setNewIngredientForm({...newIngredientForm, supplierId: e.target.value})}
                      >
                        <option value="">Nessuno...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <button 
                        onClick={() => setShowSupModal(true)} 
                        className="bg-black text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-transform"
                      >
                        <Plus size={20}/>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!newIngredientForm.name || !newIngredientForm.category || !newIngredientForm.pricePerUnit) {
                        alert("Compila tutti i campi obbligatori");
                        return;
                      }
                      const ingredientToSave = { ...newIngredientForm, name: normalizeText(newIngredientForm.name || '') } as Ingredient;
                      const newId = await onAddIngredient(ingredientToSave);
                      if (newId) {
                        setForm({
                          ...form,
                          components: [...(form.components || []), { id: newId, type: 'ingredient', quantity: 100 }]
                        });
                        setShowAddIngredientModal(false);
                        setShowNewIngredientForm(false);
                        setAddIngredientSearch('');
                        setNewIngredientForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
                      }
                    }}
                    className="w-full py-4 bg-black text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all"
                  >
                    Salva e Aggiungi
                  </button>
                </div>
              )}

              {/* Ingredienti esistenti */}
              {!showNewIngredientForm && ingredients
                .filter(ing => ing.name.toLowerCase().includes(addIngredientSearch.toLowerCase()))
                .map(ing => {
                  const alreadyAdded = form.components?.some(c => c.id === ing.id && c.type === 'ingredient');
                  return (
                    <button
                      key={ing.id}
                      onClick={() => {
                        if (!alreadyAdded) {
                          setForm({
                            ...form,
                            components: [...(form.components || []), { id: ing.id, type: 'ingredient', quantity: 100 }]
                          });
                          setShowAddIngredientModal(false);
                          setAddIngredientSearch('');
                        }
                      }}
                      disabled={alreadyAdded}
                      className={`w-full p-4 rounded-2xl text-left transition-all ${
                        alreadyAdded 
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                          : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm active:scale-95'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm text-black">{ing.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{ing.category}</p>
                        </div>
                        {alreadyAdded && (
                          <span className="text-[10px] text-gray-300 font-bold">Già aggiunto</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              
              {/* Semilavorati */}
              {subRecipes
                .filter(sub => {
                  // Escludi ricette del laboratorio (non devono essere componenti di altri topping)
                  if (isLabCategory(sub.category)) return false;
                  return sub.name.toLowerCase().includes(addIngredientSearch.toLowerCase());
                })
                .map(sub => {
                  const alreadyAdded = form.components?.some(c => c.id === sub.id && c.type === 'subrecipe');
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        if (!alreadyAdded) {
                          setForm({
                            ...form,
                            components: [...(form.components || []), { id: sub.id, type: 'subrecipe', quantity: 100 }]
                          });
                          setShowAddIngredientModal(false);
                          setAddIngredientSearch('');
                        }
                      }}
                      disabled={alreadyAdded}
                      className={`w-full p-4 rounded-2xl text-left transition-all ${
                        alreadyAdded 
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                          : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm active:scale-95'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm text-black">{sub.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{sub.category}</p>
                        </div>
                        {alreadyAdded && (
                          <span className="text-[10px] text-gray-300 font-bold">Già aggiunto</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              
              {ingredients.filter(ing => ing.name.toLowerCase().includes(addIngredientSearch.toLowerCase())).length === 0 &&
               subRecipes.filter(sub => !isLabCategory(sub.category) && sub.name.toLowerCase().includes(addIngredientSearch.toLowerCase())).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm font-bold">Nessun risultato trovato</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4 px-2">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setSelectedCategory(null)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${!selectedCategory ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}>Tutti</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${selectedCategory === cat ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}>{cat}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Nome per creazione rapida AI..." className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            <button 
              onClick={() => { setCreationMode('ai'); setAiPrompt(searchTerm); }} 
              disabled={!searchTerm}
              className="bg-blue-600 text-white p-2 rounded-xl shadow-lg disabled:opacity-50 active:scale-90 transition-transform"
            >
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
            </button>
            <button 
              onClick={() => { setCreationMode('manual'); setEditingId(null); setForm({ components: [], initialWeight: 1, yieldWeight: 1, procedure: '', category: '' }); setWastePercentage(0); }} 
              className="bg-black text-white p-2 rounded-xl shadow-lg active:scale-90 transition-transform"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-2">
        {filteredSubRecipes.map((sub) => {
          const cost = calculateSubRecipeCostPerKg(sub, ingredients, subRecipes);
          return (
            <div key={sub.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 flex items-center justify-between active:bg-gray-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-black tracking-tight">{sub.name}</h3>
                  <span className="text-[8px] text-gray-400 uppercase font-black bg-gray-100 px-1.5 py-0.5 rounded-md">{sub.category}</span>
                </div>
                <div className="flex mt-4 space-x-8">
                  <div><p className="text-[9px] uppercase text-gray-300 font-black">Costo / KG</p><p className="text-lg font-black text-green-600">€ {cost.toFixed(2)}</p></div>
                </div>
                {/* Switch Etichetta FIFO */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ETICHETTA FIFO</span>
                      <span className="text-xs font-black text-black">Crea Etichetta FIFO</span>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newFifoLabel = !sub.fifoLabel;
                        const updated = { ...sub, fifoLabel: newFifoLabel };
                        console.log('[LabView] Switch FIFO cliccato:', updated.name, 'fifoLabel:', newFifoLabel);
                        try {
                          await onUpdate(updated);
                          console.log('[LabView] SubRecipe aggiornato con successo');
                        } catch (error) {
                          console.error('[LabView] Errore aggiornamento:', error);
                          alert(`❌ Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      {sub.fifoLabel ? (
                        <ToggleRight className="text-green-600" size={24} />
                      ) : (
                        <ToggleLeft size={24} className="text-gray-400" />
                      )}
                      <span className="text-[10px] font-bold text-gray-400">{sub.fifoLabel ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                {/* Pulsante Stampa PDF - solo per ricette create con calcolatore avanzato */}
                {sub.advancedCalculatorData && (
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const { generateRecipePDF } = await import('../../utils/pdfGenerator');
                        // Nota: userData non è disponibile in LabView, ma può essere passata come prop se necessario
                        const userName = undefined; // Sarà mostrato solo se passato come prop
                        
                        generateRecipePDF({
                          name: sub.name,
                          category: sub.category,
                          hydration: sub.advancedCalculatorData.hydration,
                          result: sub.advancedCalculatorData.calculation,
                          ingredients: ingredients,
                          portionWeight: sub.portionWeight,
                          preferment: sub.advancedCalculatorData.preferment,
                          userName: userName,
                          management: sub.advancedCalculatorData.management
                        });
                      } catch (error) {
                        console.error('Errore generazione PDF:', error);
                        alert('Errore nella generazione del PDF. Assicurati che la ricetta sia stata creata con il calcolatore avanzato.');
                      }
                    }}
                    className="p-3 bg-purple-50 rounded-2xl text-purple-600 hover:bg-purple-100 transition-colors"
                    title="Stampa PDF Ricetta"
                  >
                    <Printer size={18} />
                  </button>
                )}
                <button onClick={() => { 
                  setEditingId(sub.id); 
                  setForm(sub); 
                  setCreationMode('manual');
                  // Calcola la percentuale di scarto basata su peso iniziale e resa finale
                  if (sub.initialWeight > 0 && sub.yieldWeight > 0) {
                    const calculatedWaste = ((sub.initialWeight - sub.yieldWeight) / sub.initialWeight) * 100;
                    setWastePercentage(Math.max(0, Math.min(100, calculatedWaste)));
                  } else {
                    setWastePercentage(0);
                  }
                }} className="p-3 bg-gray-50 rounded-2xl text-gray-400"><Edit2 size={18}/></button>
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
                <h4 className="text-sm font-black text-black uppercase">Elimina Topping</h4>
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
