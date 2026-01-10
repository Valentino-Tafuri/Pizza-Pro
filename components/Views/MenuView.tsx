
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, X, Edit2, Trash2, Loader2, Wand2, BrainCircuit, ClipboardList, ArrowRight, AlertTriangle, Upload, FileText, Check } from 'lucide-react';
import { MenuItem, Ingredient, SubRecipe, ComponentUsage, Unit, Supplier, UserData } from '../../types';
import { normalizeText, isLabCategory } from '../../utils/textUtils';

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
import { calculateMenuItemCost, calculateSubRecipeCostPerKg, getFoodCostColor } from '../../services/calculator';
import { GoogleGenAI, Type } from "@google/genai";

interface MenuViewProps {
  menu: MenuItem[];
  ingredients: Ingredient[];
  subRecipes: SubRecipe[];
  suppliers: Supplier[];
  userData: UserData;
  onAdd: (item: MenuItem) => void;
  onUpdate: (item: MenuItem) => void;
  onDelete?: (id: string) => void;
  onAddIngredient: (ingredient: Ingredient) => Promise<string | undefined>;
  onAddSupplier?: (supplier: Supplier) => Promise<string | undefined>;
  onAddSubRecipe?: (subRecipe: SubRecipe) => Promise<string | undefined>;
  onNavigateToLab?: () => void;
}

const MenuView: React.FC<MenuViewProps> = ({ menu, ingredients, subRecipes, suppliers, userData, onAdd, onUpdate, onDelete, onAddIngredient, onAddSupplier, onAddSubRecipe, onNavigateToLab }) => {
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
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [addComponentSearch, setAddComponentSearch] = useState('');
  const [showNewIngredientForm, setShowNewIngredientForm] = useState(false);
  const [newIngredientForm, setNewIngredientForm] = useState<Partial<Ingredient>>({ 
    name: '', 
    unit: 'kg', 
    pricePerUnit: 0, 
    category: '', 
    supplierId: '' 
  });
  const [isAddingNewCategoryIng, setIsAddingNewCategoryIng] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);
  const [supForm, setSupForm] = useState<Partial<Supplier>>({ deliveryDays: [] });
  const [supLoading, setSupLoading] = useState(false);
  const [isAddingNewCategoryForm, setIsAddingNewCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  // CSV Import states
  interface CSVRow {
    categoria?: string;
    nome_portata?: string;
    descrizione?: string;
    prezzo?: string;
    topping_collegato?: string;
    disponibile?: string;
    allergeni?: string;
  }
  const [csvImportMode, setCsvImportMode] = useState<'upload' | 'missing-toppings' | 'preview' | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [missingToppings, setMissingToppings] = useState<{name: string; usedIn: {name: string; price: number}[]}[]>([]);
  const [currentMissingToppingIdx, setCurrentMissingToppingIdx] = useState(0);
  const [newToppingForm, setNewToppingForm] = useState<Partial<SubRecipe>>({ components: [], initialWeight: 1, yieldWeight: 1, category: '' });
  const [autoCreateCategories, setAutoCreateCategories] = useState(false);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const categories = useMemo(() => {
    return Array.from(new Set(menu.map(item => item.category))).filter(Boolean);
  }, [menu]);

  const ingredientCategories = useMemo(() => {
    return Array.from(new Set(ingredients.map(i => i.category))).filter(Boolean);
  }, [ingredients]);

  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [menu, searchTerm, selectedCategory]);

  const handleAICreate = async () => {
    if (!aiPrompt) return;
    
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
        if (c.matchedId) {
          const matchedIngredient = ingredients.find(ing => ing.id === c.matchedId);
          newComps.push({ 
            id: c.matchedId, 
            type: 'ingredient', 
            quantity: c.quantity,
            unit: matchedIngredient?.unit // Preserva l'unità dell'ingrediente trovato
          });
        } else missing.push(c);
      });

      setForm({ name: data.name, sellingPrice: data.sellingPrice, category: 'Menu AI', components: newComps });
      if (missing.length > 0) {
        setMissingComps(missing);
        setCurrentMissingIdx(0);
      } else {
        setCreationMode('manual');
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

  const handleResolveMissing = async () => {
    const price = parseFloat(quickIngPrice.replace(',', '.'));
    if (isNaN(price)) return;
    const current = missingComps[currentMissingIdx];
    const ingredientToAdd = {
      id: '', 
      name: current.name, 
      unit: 'kg' as Unit, // Default a 'kg' per AI imports
      pricePerUnit: price, 
      category: 'AI Imports'
    };
    const newId = await onAddIngredient(ingredientToAdd);
    if (newId) {
      // Usa l'unità che è stata passata al onAddIngredient
      setForm(prev => ({
        ...prev,
        components: [...(prev.components || []), { 
          id: newId, 
          type: 'ingredient', 
          quantity: current.quantity,
          unit: ingredientToAdd.unit // Preserva l'unità dell'ingrediente appena creato
        }]
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

  // CSV Import functions - Header mappings per parsing flessibile
  const headerMappings: Record<string, string[]> = {
    categoria: ['categoria', 'category', 'cat'],
    nome_portata: ['nome_portata', 'nome portata', 'nome', 'name', 'piatto', 'portata'],
    descrizione: ['descrizione', 'description', 'desc', 'descrizione portata'],
    prezzo: ['prezzo', 'price', 'costo', 'prezzo vendita'],
    topping_collegato: ['topping_collegato', 'topping collegato', 'topping', 'ricetta', 'subrecipe'],
    disponibile: ['disponibile', 'disponibilita', 'available', 'attivo', 'active'],
    allergeni: ['allergeni', 'allergens', 'allergies', 'allergie']
  };

  const normalizeHeader = (header: string): string => {
    const normalized = header.toLowerCase().trim().replace(/[_\s]+/g, '_');
    
    // Cerca corrispondenza nelle mappature
    for (const [standardKey, variants] of Object.entries(headerMappings)) {
      const normalizedVariants = variants.map(v => v.toLowerCase().replace(/[_\s]+/g, '_'));
      if (normalizedVariants.includes(normalized) || normalized.includes(standardKey)) {
        return standardKey;
      }
    }
    
    return normalized;
  };

  const validateCSVHeaders = (headers: string[]) => {
    const requiredHeaders = ['categoria', 'nome_portata', 'prezzo'];
    const normalizedHeaders = headers.map(normalizeHeader);
    
    const missingHeaders = requiredHeaders.filter(
      required => !normalizedHeaders.includes(required)
    );
    
    return {
      valid: missingHeaders.length === 0,
      missing: missingHeaders,
      found: headers,
      normalized: normalizedHeaders
    };
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(v => v.replace(/^"|"$/g, ''));
  };

  const parseCSV = (text: string): CSVRow[] => {
    // Rimuovi BOM se presente
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Il file CSV è vuoto');
    }
    
    // Parse prima riga (header) con gestione virgolette
    const rawHeaders = parseCSVLine(lines[0]);
    const normalizedHeaders = rawHeaders.map(normalizeHeader);
    
    // Valida header
    const validation = validateCSVHeaders(rawHeaders);
    if (!validation.valid) {
      const errorMessage = `Header CSV non validi

❌ Header obbligatori mancanti: ${validation.missing.join(', ')}

✓ Header trovati nel file: ${rawHeaders.join(', ')}

💡 Suggerimento:
Scarica il template CSV di esempio e verifica che il tuo file 
contenga gli stessi header nella prima riga.

Header richiesti:
• categoria (obbligatorio)
• nome_portata o nome (obbligatorio)
• prezzo (obbligatorio)
• descrizione (opzionale)
• topping_collegato o topping (opzionale)
• disponibile (opzionale)
• allergeni (opzionale)`;
      throw new Error(errorMessage);
    }
    
    // Crea mappa per accesso rapido alle colonne
    const headerMap = new Map<string, number>();
    rawHeaders.forEach((header, idx) => {
      const normalized = normalizeHeader(header);
      if (!headerMap.has(normalized)) {
        headerMap.set(normalized, idx);
      }
    });
    
    const data: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every(v => !v.trim())) continue;
      
      const row: CSVRow = {};
      
      // Mappa i valori usando gli header normalizzati
      headerMap.forEach((colIndex, normalizedHeader) => {
        if (values[colIndex] !== undefined) {
          row[normalizedHeader as keyof CSVRow] = values[colIndex];
        }
      });
      
      data.push(row);
    }
    
    return data;
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let text = e.target?.result as string;
        
        // Rimuovi BOM se presente
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }
        
        const parsed = parseCSV(text);
        
        if (parsed.length === 0) {
          alert('Il file CSV non contiene dati validi.\n\nVerifica che ci siano righe di dati oltre all\'header.');
          return;
        }
        
        setCsvData(parsed);
        
        // Check for missing toppings (escludi ricette del laboratorio)
        const toppingsInCsv = new Set(
          parsed
            .map(row => row.topping_collegato?.trim())
            .filter(Boolean)
        );
        const existingToppingNames = new Set(
          subRecipes
            .filter(sr => !isLabCategory(sr.category))
            .map(sr => sr.name.toLowerCase())
        );
        
        const missing: {name: string; usedIn: {name: string; price: number}[]}[] = [];
        
        toppingsInCsv.forEach(toppingName => {
          if (toppingName && !existingToppingNames.has(toppingName.toLowerCase())) {
            const usedIn = parsed
              .filter(row => {
                const rowTopping = row.topping_collegato?.trim().toLowerCase() || '';
                return rowTopping === toppingName.toLowerCase();
              })
              .map(row => ({ 
                name: row.nome_portata || 'Sconosciuto', 
                price: parseFloat(row.prezzo?.replace(',', '.') || '0') || 0 
              }));
            if (usedIn.length > 0) {
              missing.push({ name: toppingName, usedIn });
            }
          }
        });
        
        if (missing.length > 0) {
          setMissingToppings(missing);
          setCurrentMissingToppingIdx(0);
          setCsvImportMode('missing-toppings');
        } else {
          setCsvImportMode('preview');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto nel parsing del CSV';
        
        // Mostra dialog di errore migliorato
        alert(errorMessage);
      }
    };
    
    reader.onerror = () => {
      alert('❌ Errore nella lettura del file.\n\nAssicurati che il file non sia corrotto e riprova.');
    };
    
    reader.readAsText(file, 'UTF-8');
  };

  const handleCreateMissingTopping = async () => {
    if (!onAddSubRecipe) return;
    if (!newToppingForm.name || !newToppingForm.category) {
      alert('Compila nome e categoria del topping');
      return;
    }
    
    const newId = await onAddSubRecipe({
      ...newToppingForm,
      name: normalizeText(newToppingForm.name),
      id: Math.random().toString(36).substr(2, 9),
      components: newToppingForm.components || [],
      initialWeight: newToppingForm.initialWeight || 1,
      yieldWeight: newToppingForm.yieldWeight || 1
    } as SubRecipe);
    
    if (newId) {
      // Move to next missing topping or proceed to preview
      if (currentMissingToppingIdx < missingToppings.length - 1) {
        setCurrentMissingToppingIdx(prev => prev + 1);
        setNewToppingForm({ components: [], initialWeight: 1, yieldWeight: 1, category: '' });
      } else {
        setCsvImportMode('preview');
        setNewToppingForm({ components: [], initialWeight: 1, yieldWeight: 1, category: '' });
      }
    }
  };

  const handleConfirmImport = () => {
    // Escludi ricette del laboratorio dalla mappa dei topping
    const existingToppingNames = new Map(
      subRecipes
        .filter(sr => !isLabCategory(sr.category))
        .map(sr => [sr.name.toLowerCase(), sr.id])
    );
    
    let importedCount = 0;
    let skippedCount = 0;
    
    csvData.forEach(row => {
      const toppingName = row.topping_collegato?.trim();
      const toppingId = toppingName ? existingToppingNames.get(toppingName.toLowerCase()) : null;
      
      const category = row.categoria?.trim() || 'Generica';
      const name = normalizeText(row.nome_portata?.trim() || '');
      const priceStr = row.prezzo?.replace(',', '.') || '0';
      const price = parseFloat(priceStr);
      
      // Valida dati obbligatori
      if (!name || price <= 0 || isNaN(price)) {
        skippedCount++;
        return;
      }
      
      const menuItem: MenuItem = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        category,
        sellingPrice: price,
        components: toppingId ? [{ id: toppingId as string, type: 'subrecipe' as const, quantity: 1 }] : [],
        isDelivery: row.disponibile?.toLowerCase().includes('delivery') || row.disponibile?.toLowerCase().includes('si') || false
      };
      
      onAdd(menuItem);
      importedCount++;
    });
    
    let message = `✅ Import completato!\n\n`;
    message += `• ${importedCount} portata${importedCount > 1 ? 'e' : ''} importata${importedCount > 1 ? 'e' : ''}`;
    if (skippedCount > 0) {
      message += `\n• ${skippedCount} riga${skippedCount > 1 ? 'e' : ''} saltata${skippedCount > 1 ? 'e' : ''} (dati non validi)`;
    }
    
    alert(message);
    setCsvImportMode(null);
    setCsvData([]);
    setMissingToppings([]);
  };

  const handleDownloadExampleCSV = () => {
    const exampleData = [
      ['categoria', 'nome_portata', 'descrizione', 'prezzo', 'topping_collegato', 'disponibile', 'allergeni'],
      ['Pizze Classiche', 'Margherita', 'Pomodoro mozzarella e basilico', '8.50', 'Margherita', 'Sì', 'Glutine;Lattosio'],
      ['Pizze Classiche', 'Marinara', 'Pomodoro aglio e origano', '7.00', '', 'Sì', 'Glutine'],
      ['Pizze Speciali', 'Carbonara', 'Pancetta uova e pecorino', '12.00', 'Carbonara', 'Sì', 'Glutine;Latte;Uova'],
      ['Focacce', 'Focaccia classica', 'Olio sale e rosmarino', '5.00', '', 'Sì', 'Glutine'],
      ['Focacce', 'Focaccia pomodoro', 'Pomodoro e origano', '6.50', 'Pomodoro fresco', 'Sì', 'Glutine'],
      ['Panini', 'Panino Carbonara', 'Pancetta uova e pecorino', '8.00', 'Carbonara', 'Sì', 'Glutine;Latte;Uova'],
      ['Antipasti', 'Bruschetta', 'Pomodoro fresco su pane', '5.00', 'Bruschetta', 'Sì', 'Glutine'],
    ];

    // Formatta correttamente i valori con virgolette dove necessario
    const formatCSVRow = (row: string[]): string => {
      return row.map(cell => {
        // Se contiene virgola, virgolette o newline, avvolgi in virgolette
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',');
    };

    const csvContent = [
      formatCSVRow(exampleData[0]),
      ...exampleData.slice(1).map(row => formatCSVRow(row))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM per Excel
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'esempio_menu_import.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[95vh] pb-12 scrollbar-hide relative">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
        
        <header className="flex justify-between items-center mb-8">
          <h3 className="text-3xl font-black tracking-tighter">{isEdit ? 'Modifica Pizza' : 'Dettagli Ricetta'}</h3>
          <button onClick={() => { setCreationMode(null); setEditingId(null); setIsAddingNewCategoryForm(false); }} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={24}/></button>
        </header>
        
        <div className="space-y-6">
        <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xl font-black" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} onBlur={e => setForm({...form, name: normalizeText(e.target.value)})} placeholder="Nome Pizza" />
        
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoria</label>
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

        {/* Toggle Delivery - solo se delivery è abilitato nelle impostazioni */}
        {userData?.bepConfig?.deliveryEnabled && (
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div>
              <span className="text-sm font-black text-black">Servita in Delivery</span>
              <p className="text-[9px] text-gray-400 font-bold mt-1">Include costi delivery nell'Asset Cost</p>
            </div>
            <button
              onClick={() => setForm({...form, isDelivery: !form.isDelivery})}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.isDelivery ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${form.isDelivery ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        )}

        <div className="space-y-3">
          {form.components?.map(c => {
            const item = ingredients.find(i => i.id === c.id) || subRecipes.find(s => s.id === c.id) || menu.find(m => m.id === c.id);
            // Calcola il costo del componente
            let componentCost = 0;
            if (c.type === 'ingredient') {
              const ing = ingredients.find(i => i.id === c.id);
              if (ing) {
                const multiplier = (ing.unit === 'kg' || ing.unit === 'l') ? 0.001 : 1;
                componentCost = ing.pricePerUnit * c.quantity * multiplier;
              }
            } else if (c.type === 'subrecipe') {
              const sub = subRecipes.find(s => s.id === c.id);
              if (sub) {
                const costPerKg = calculateSubRecipeCostPerKg(sub, ingredients, subRecipes);
                // Se è una ricetta del laboratorio (ha portionWeight), usa il peso porzione
                if (sub.portionWeight && sub.portionWeight > 0) {
                  const costPerPortion = (costPerKg * sub.portionWeight) / 1000;
                  componentCost = costPerPortion * c.quantity; // quantity è in porzioni
                } else {
                  // Comportamento originale: quantità in grammi
                  componentCost = costPerKg * (c.quantity / 1000);
                }
              }
            } else if (c.type === 'menuitem') {
              const menuItem = menu.find(m => m.id === c.id);
              if (menuItem) {
                const itemCost = calculateMenuItemCost(menuItem, ingredients, subRecipes, menu);
                componentCost = itemCost * c.quantity; // quantity è in porzioni (0.5 o 1.0)
              }
            }
            
            // Calcola il costo totale della ricetta
            const totalCost = calculateMenuItemCost(form as MenuItem, ingredients, subRecipes, menu);
            const incidence = totalCost > 0 ? (componentCost / totalCost) * 100 : 0;
            
            return (
              <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm flex-1 truncate">{item?.name || 'Sync...'}</span>
                  <div className="flex items-center bg-gray-50 px-3 py-2 rounded-xl">
                    <input 
                      type="number" 
                      step={c.type === 'menuitem' || (c.type === 'subrecipe' && subRecipes.find(s => s.id === c.id)?.portionWeight) ? 0.5 : 0.1}
                      className="w-16 bg-transparent text-center font-black text-xs" 
                      value={c.quantity} 
                      onChange={e => setForm({...form, components: form.components?.map(comp => comp.id === c.id ? {...comp, quantity: parseFloat(e.target.value)} : comp)})} 
                    />
                    <span className="text-[10px] text-gray-400 font-bold ml-1 uppercase">
                      {c.type === 'menuitem' || (c.type === 'subrecipe' && subRecipes.find(s => s.id === c.id)?.portionWeight) 
                        ? 'porz' 
                        : c.type === 'ingredient' && c.unit 
                          ? c.unit 
                          : ingredients.find(ing => ing.id === c.id)?.unit || 'g'}
                    </span>
                    <button 
                      onClick={() => setForm({...form, components: form.components?.filter(comp => comp.id !== c.id)})} 
                      className="ml-2 text-red-200 hover:text-red-500 transition-colors"
                    >
                      <X size={14}/>
                    </button>
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
            onClick={() => setShowAddComponentModal(true)}
            className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-300 font-bold text-xs flex items-center justify-center space-x-2 hover:border-gray-200 hover:text-gray-400 transition-colors"
          >
            <Plus size={14}/> <span>Aggiungi Manualmente</span>
          </button>
        </div>
        
        {/* Calcolo prezzo consigliato */}
        {(() => {
          const totalCost = calculateMenuItemCost(form as MenuItem, ingredients, subRecipes);
          const bepConfig = userData?.bepConfig || { foodCostIncidence: 30, serviceIncidence: 5, wasteIncidence: 2 };
          const foodCostIncidence = bepConfig.foodCostIncidence || 30;
          const serviceIncidence = bepConfig.serviceIncidence || 5;
          const wasteIncidence = bepConfig.wasteIncidence || 2;
          const deliveryEnabled = bepConfig.deliveryEnabled || false;
          const deliveryIncidence = bepConfig.deliveryIncidence || 0;
          
          // Calcola il Total Asset Cost includendo il delivery solo se:
          // 1. Il delivery è abilitato nelle impostazioni
          // 2. La pizza è marcata come "in delivery"
          let totalVariableIncidence = foodCostIncidence + serviceIncidence + wasteIncidence;
          if (deliveryEnabled && form.isDelivery) {
            totalVariableIncidence += deliveryIncidence;
          }
          
          // Prezzo consigliato Asset Cost: calcolato in modo che il Food Cost sul prezzo finale 
          // sia esattamente uguale al Food Cost Previsto impostato nelle impostazioni
          // Formula base: Prezzo Base = Costo Materie Prime / (Food Cost Previsto / 100)
          // Se delivery è attivo e la pizza è in delivery, il delivery viene aggiunto come costo aggiuntivo
          // al prezzo base, mantenendo il Food Cost rispettato
          let recommendedAssetCostPrice = 0;
          if (totalCost > 0 && foodCostIncidence > 0) {
            // Calcola il prezzo base rispettando solo il Food Cost
            const basePrice = totalCost / (foodCostIncidence / 100);
            
            if (deliveryEnabled && form.isDelivery) {
              // Aggiungi il delivery come costo aggiuntivo al prezzo base
              // Il delivery viene aggiunto come percentuale sul prezzo base
              recommendedAssetCostPrice = basePrice * (1 + deliveryIncidence / 100);
            } else {
              // Senza delivery, usa solo il prezzo base
              recommendedAssetCostPrice = basePrice;
            }
          }
          
          // Food Cost attuale (solo materie prime)
          const currentFoodCost = form.sellingPrice > 0 ? (totalCost / form.sellingPrice) * 100 : 0;
          
          return (
            <div className="space-y-4">
              {/* Costo Totale Pizza */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-[2.5rem] border border-green-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Costo Totale Pizza</span>
                  <span className="text-[10px] font-black uppercase text-green-600 bg-green-100 px-3 py-1 rounded-full">
                    Materie Prime
                  </span>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-green-700 tracking-tight">
                    €{totalCost.toFixed(2)}
                  </span>
                </div>
                <p className="text-[9px] text-gray-400 font-bold mt-2">
                  Costo totale di tutti gli ingredienti e preparazioni utilizzati
                </p>
              </div>

              {/* Prezzo Consigliato Asset Cost */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-[2.5rem] border border-purple-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Prezzo Consigliato Asset Cost</span>
                  <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                    Asset Cost {totalVariableIncidence}%
                  </span>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-black tracking-tight">
                    €{recommendedAssetCostPrice.toFixed(2)}
                  </span>
                  {recommendedAssetCostPrice > 0 && (
                    <button
                      onClick={() => setForm({...form, sellingPrice: Math.round(recommendedAssetCostPrice * 2) / 2})}
                      className="ml-auto bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black active:scale-95 transition-all"
                    >
                      Applica
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-gray-400 font-bold mt-2">
                  Calcolato per rispettare Food Cost {foodCostIncidence}% (Asset totale: {totalVariableIncidence}% - Food Cost {foodCostIncidence}% + Packaging {serviceIncidence}% + Sfrido {wasteIncidence}%{deliveryEnabled && form.isDelivery ? ` + Delivery ${deliveryIncidence}%` : ''})
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black text-white p-5 rounded-3xl text-center">
                  <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">Prezzo Vendita</span>
                  <input type="number" step="0.5" className="bg-transparent border-none text-2xl font-black text-white w-full text-center p-0" value={form.sellingPrice || ''} onChange={e => setForm({...form, sellingPrice: parseFloat(e.target.value)})} />
                </div>
                <div className="bg-gray-50 p-5 rounded-3xl text-center flex flex-col justify-center">
                  <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">Food Cost Attuale</span>
                  <p className="text-2xl font-black text-black">{currentFoodCost.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          );
        })()}
        </div>

        <button onClick={() => {
          const payload = { ...form, name: normalizeText(form.name || ''), id: editingId || Math.random().toString(36).substr(2,9), category: form.category || 'Generica', components: form.components || [] } as MenuItem;
          if (editingId) onUpdate(payload); else onAdd(payload);
          setCreationMode(null); setEditingId(null); setIsAddingNewCategoryForm(false);
        }} className="w-full py-6 bg-black text-white rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all mt-4">Salva Pizza</button>
      </div>
    </div>
  );

  const renderCSVImportDialogs = () => (
    <>
      {/* Upload Dialog */}
      {csvImportMode === 'upload' && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <Upload className="mx-auto text-blue-500 mb-4" size={48} />
              <h3 className="text-2xl font-black text-black mb-2">Importa CSV Menu</h3>
              <p className="text-sm text-gray-500 font-semibold">
                Carica un file CSV con la struttura: categoria, nome_portata, descrizione, prezzo, topping_collegato, disponibile, allergeni
              </p>
            </div>
            <div className="space-y-4">
              <button
                onClick={handleDownloadExampleCSV}
                className="w-full bg-blue-50 border border-blue-200 text-blue-600 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
              >
                <FileText size={18} />
                Scarica CSV di Esempio
              </button>
              <label className="block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
                <div className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                  <FileText className="mx-auto mb-3 text-gray-400" size={32} />
                  <p className="text-sm font-bold text-gray-600">Clicca per selezionare file CSV</p>
                </div>
              </label>
            </div>
            <button
              onClick={() => setCsvImportMode(null)}
              className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Missing Toppings Dialog */}
      {csvImportMode === 'missing-toppings' && missingToppings.length > 0 && currentMissingToppingIdx < missingToppings.length && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <AlertTriangle className="mx-auto text-yellow-500 mb-4" size={48} />
              <h3 className="text-2xl font-black text-black mb-2">Topping Mancanti - Creazione Richiesta</h3>
              <p className="text-sm text-gray-500 font-semibold">
                Le seguenti portate richiedono topping non ancora creati:
              </p>
            </div>

            {(() => {
              const currentTopping = missingToppings[currentMissingToppingIdx];
              return (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="text-blue-600" size={24} />
                      <h4 className="text-lg font-black text-black">TOPPING: "{currentTopping.name}"</h4>
                    </div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Usato in portate:</p>
                    <div className="space-y-2">
                      {currentTopping.usedIn.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-3 flex items-center justify-between">
                          <span className="font-bold text-sm text-black">{item.name}</span>
                          <span className="font-black text-sm text-green-600">€{item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Topping</label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold"
                        value={newToppingForm.name || currentTopping.name}
                        onChange={e => setNewToppingForm({...newToppingForm, name: normalizeText(e.target.value)})}
                        placeholder="Nome Topping"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoria</label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold"
                        value={newToppingForm.category || ''}
                        onChange={e => setNewToppingForm({...newToppingForm, category: e.target.value})}
                        placeholder="Categoria (es: Condimenti)"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-blue-800">
                      Per importare queste portate, crea prima i topping mancanti. Puoi crearli ora uno alla volta, oppure annullare e importare prima i topping usando la sezione 'Topping'.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateMissingTopping}
                      className="flex-1 bg-black text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all"
                    >
                      Crea Topping
                    </button>
                    <button
                      onClick={() => {
                        setCsvImportMode(null);
                        if (onNavigateToLab) onNavigateToLab();
                      }}
                      className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all"
                    >
                      Annulla e Vai a Topping
                    </button>
                    <button
                      onClick={() => {
                        setCsvImportMode(null);
                        setCsvData([]);
                        setMissingToppings([]);
                      }}
                      className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black"
                    >
                      Annulla Import
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      {csvImportMode === 'preview' && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <Check className="mx-auto text-green-500 mb-4" size={48} />
              <h3 className="text-2xl font-black text-black mb-2">Anteprima Import</h3>
              <p className="text-sm text-gray-500 font-semibold">
                {csvData.length} portata{csvData.length > 1 ? 'e' : ''} pronte per l'import
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={autoCreateCategories}
                  onChange={e => setAutoCreateCategories(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm font-bold text-gray-700">Crea nuove categorie automaticamente</span>
              </label>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(() => {
                  const grouped = csvData.reduce((acc, row) => {
                    const cat = row.categoria?.trim() || 'Generica';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(row);
                    return acc;
                  }, {} as Record<string, CSVRow[]>);

                  return Object.entries(grouped).map(([category, items]: [string, CSVRow[]]) => (
                    <div key={category} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <h4 className="font-black text-sm text-black mb-3 uppercase">{category}</h4>
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div key={idx} className="bg-white rounded-xl p-3 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm text-black">{item.nome_portata}</p>
                              {item.topping_collegato && (
                                <p className="text-xs text-gray-500 font-semibold">Topping: {item.topping_collegato}</p>
                              )}
                            </div>
                            <span className="font-black text-sm text-green-600">€{parseFloat(item.prezzo || '0').toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setCsvImportMode(null);
                  setCsvData([]);
                }}
                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 bg-black text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all"
              >
                Conferma e Importa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {csvImportMode && renderCSVImportDialogs()}
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
      
      {/* Modal per aggiungere componenti */}
      {showAddComponentModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tight">Aggiungi Componente</h3>
              <button onClick={() => { 
                setShowAddComponentModal(false); 
                setAddComponentSearch(''); 
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
                placeholder="Cerca ingrediente, preparazione o pizza..." 
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" 
                value={addComponentSearch} 
                onChange={(e) => setAddComponentSearch(e.target.value)} 
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {/* Pulsante per aggiungere nuovo ingrediente */}
              {!showNewIngredientForm && (
                <button
                  onClick={() => setShowNewIngredientForm(true)}
                  className="w-full p-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-bold text-sm flex items-center justify-center space-x-2 hover:border-blue-300 hover:bg-blue-50 transition-all mb-4"
                >
                  <Plus size={16}/> <span>Nuovo Ingrediente</span>
                </button>
              )}

              {/* Form per nuovo ingrediente */}
              {showNewIngredientForm && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 space-y-4 mb-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-sm text-black">Nuovo Ingrediente</h4>
                    <button onClick={() => { setShowNewIngredientForm(false); setNewIngredientForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' }); setIsAddingNewCategoryIng(false); }} className="text-gray-400 hover:text-gray-600">
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
                      const newId = await onAddIngredient(newIngredientForm as Ingredient);
                      if (newId) {
                        setForm({
                          ...form,
                          components: [...(form.components || []), { 
                            id: newId, 
                            type: 'ingredient', 
                            quantity: 100,
                            unit: newIngredientForm.unit // Preserva l'unità dell'ingrediente appena creato
                          }]
                        });
                        setShowAddComponentModal(false);
                        setShowNewIngredientForm(false);
                        setAddComponentSearch('');
                        setNewIngredientForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
                        setIsAddingNewCategoryIng(false);
                      }
                    }}
                    className="w-full py-4 bg-black text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all"
                  >
                    Salva e Aggiungi
                  </button>
                </div>
              )}

              {/* Ingredienti esistenti */}
              {!showNewIngredientForm && (
                <>
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Ingredienti</p>
                  {ingredients
                  .filter(ing => ing.name.toLowerCase().includes(addComponentSearch.toLowerCase()))
                  .map(ing => {
                    const alreadyAdded = form.components?.some(c => c.id === ing.id && c.type === 'ingredient');
                    return (
                      <button
                        key={ing.id}
                        onClick={() => {
                          if (!alreadyAdded) {
                            setForm({
                              ...form,
                              components: [...(form.components || []), { 
                                id: ing.id, 
                                type: 'ingredient', 
                                quantity: 100,
                                unit: ing.unit // Preserva l'unità dell'ingrediente
                              }]
                            });
                            setShowAddComponentModal(false);
                            setAddComponentSearch('');
                          }
                        }}
                        disabled={alreadyAdded}
                        className={`w-full p-4 rounded-2xl text-left transition-all mb-2 ${
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
              </div>

              {/* Preparazioni */}
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Preparazioni</p>
                {subRecipes
                  .filter(sub => {
                    // Escludi ricette del laboratorio (non devono essere topping)
                    if (isLabCategory(sub.category)) return false;
                    return sub.name.toLowerCase().includes(addComponentSearch.toLowerCase());
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
                            setShowAddComponentModal(false);
                            setAddComponentSearch('');
                          }
                        }}
                        disabled={alreadyAdded}
                        className={`w-full p-4 rounded-2xl text-left transition-all mb-2 ${
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
              </div>

              {/* Pizze (con supporto mezze porzioni) */}
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Pizze</p>
                {menu
                  .filter(item => item.id !== editingId && item.name.toLowerCase().includes(addComponentSearch.toLowerCase()))
                  .map(item => {
                    const alreadyAdded = form.components?.some(c => c.id === item.id && c.type === 'menuitem');
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (!alreadyAdded) {
                            setForm({
                              ...form,
                              components: [...(form.components || []), { id: item.id, type: 'menuitem', quantity: 0.5 }] // Default mezza porzione
                            });
                            setShowAddComponentModal(false);
                            setAddComponentSearch('');
                          }
                        }}
                        disabled={alreadyAdded}
                        className={`w-full p-4 rounded-2xl text-left transition-all mb-2 ${
                          alreadyAdded 
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                            : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm active:scale-95'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black text-sm text-black">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{item.category}</p>
                          </div>
                          {alreadyAdded && (
                            <span className="text-[10px] text-gray-300 font-bold">Già aggiunto</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
              
              {!showNewIngredientForm && ingredients.filter(ing => ing.name.toLowerCase().includes(addComponentSearch.toLowerCase())).length === 0 &&
               subRecipes.filter(sub => !isLabCategory(sub.category) && sub.name.toLowerCase().includes(addComponentSearch.toLowerCase())).length === 0 &&
               menu.filter(item => item.id !== editingId && item.name.toLowerCase().includes(addComponentSearch.toLowerCase())).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm font-bold">Nessun risultato trovato</p>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal per nuovo fornitore */}
      {showSupModal && (
        <div className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-xl tracking-tight">Nuovo Fornitore Rapido</h4>
              <button onClick={() => { setShowSupModal(false); setSupForm({ deliveryDays: [] }); }} className="bg-gray-100 p-2 rounded-full text-gray-400">
                <X size={18}/>
              </button>
            </div>
            <div className="space-y-3">
              <input placeholder="Azienda" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={supForm.name || ''} onChange={e => setSupForm({...supForm, name: e.target.value})} onBlur={e => setSupForm({...supForm, name: normalizeText(e.target.value)})} />
              <input placeholder="Telefono" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={supForm.phone || ''} onChange={e => setSupForm({...supForm, phone: e.target.value})} />
            </div>
            <div className="flex space-x-2 pt-2">
              <button onClick={() => { setShowSupModal(false); setSupForm({ deliveryDays: [] }); }} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-400">Annulla</button>
              <button 
                onClick={async () => {
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
                    setNewIngredientForm({ ...newIngredientForm, supplierId: id });
                    setShowSupModal(false);
                    setSupForm({ deliveryDays: [] });
                  }
                  setSupLoading(false);
                }}
                disabled={supLoading}
                className="flex-1 py-4 bg-black text-white rounded-2xl font-black shadow-lg disabled:opacity-50"
              >
                {supLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-6 pb-12">

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
              onClick={() => {
                if (!editingCategory) {
                  setSelectedCategory(cat === selectedCategory ? null : cat);
                }
              }}
              onMouseDown={() => {
                const timer = setTimeout(() => {
                  setEditingCategory(cat);
                  setNewCategoryName(cat);
                }, 500); // 500ms per long press
                setLongPressTimer(timer);
              }}
              onMouseUp={() => {
                if (longPressTimer) {
                  clearTimeout(longPressTimer);
                  setLongPressTimer(null);
                }
              }}
              onMouseLeave={() => {
                if (longPressTimer) {
                  clearTimeout(longPressTimer);
                  setLongPressTimer(null);
                }
              }}
              onTouchStart={() => {
                const timer = setTimeout(() => {
                  setEditingCategory(cat);
                  setNewCategoryName(cat);
                }, 500);
                setLongPressTimer(timer);
              }}
              onTouchEnd={() => {
                if (longPressTimer) {
                  clearTimeout(longPressTimer);
                  setLongPressTimer(null);
                }
              }}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${selectedCategory === cat ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'} ${editingCategory === cat ? 'ring-2 ring-blue-500' : ''}`}
            >
              {editingCategory === cat ? (
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onBlur={(e) => {
                    const newName = normalizeText(e.target.value);
                    if (newName && newName !== cat && newName.trim() !== '') {
                      // Aggiorna tutte le ricette con la vecchia categoria
                      menu.filter(item => item.category === cat).forEach(item => {
                        onUpdate({ ...item, category: newName });
                      });
                    }
                    setEditingCategory(null);
                    setNewCategoryName('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      setEditingCategory(null);
                      setNewCategoryName('');
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white text-black border-none rounded px-2 py-1 text-[10px] font-black uppercase w-full text-center"
                  autoFocus
                />
              ) : (
                cat
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Cerca pizza..." className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button onClick={() => setCsvImportMode('upload')} className="bg-blue-600 text-white p-2 rounded-xl shadow-sm active:scale-90 transition-transform" title="Importa CSV">
              <Upload size={16} />
            </button>
            <button onClick={() => { setCreationMode('manual'); setEditingId(null); setForm({ components: [], sellingPrice: 0, category: '' }); setIsAddingNewCategoryForm(false); }} className="bg-black text-white p-2 rounded-xl shadow-sm"><Plus size={16} /></button>
          </div>
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
                <button onClick={() => { setEditingId(item.id); setForm(item); setCreationMode('manual'); setIsAddingNewCategoryForm(false); }} className="bg-gray-50 p-3 rounded-2xl text-gray-400 border border-gray-100"><Edit2 size={18} /></button>
                <button onClick={() => onDelete?.(item.id)} className="bg-red-50 p-3 rounded-2xl text-red-300 border border-red-50"><Trash2 size={18} /></button>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </>
  );
};

export default MenuView;
