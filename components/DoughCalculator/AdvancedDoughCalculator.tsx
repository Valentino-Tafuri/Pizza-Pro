import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Plus, Minus, X, Save, Sliders, FileDown, Settings, Clock, Thermometer, Flame, ChevronDown, ChevronUp, Search, Check, PlusCircle } from 'lucide-react';
import { Ingredient, Unit, Supplier } from '../../types';
import { normalizeText } from '../../utils/textUtils';
import { Preferment } from '../Views/PrefermentiView';
import { FlourSelection, AdditionalIngredient } from '../../utils/doughCalculator';
import { useDoughCalculations } from '../../hooks/useDoughCalculations';
import { PhaseCard } from './PhaseCard';
import { FlourSelector } from './FlourSelector';
import { IOSStepper } from './IOSStepper';
import { RecipeSummary } from './RecipeSummary';
import { generateRecipePDF } from '../../utils/pdfGenerator';

interface AdvancedCalculatorFormData {
  recipeName: string;
  recipeCategory: string;
  totalHydration: number;
  multiplier: number;
  portionWeight?: number;
  // Pre-fermento
  usePreferment: boolean;
  selectedPrefermentId: string | null;
  prefermentFlourPercentage: number;
  prefermentFlourSelections: FlourSelection[];
  // Autolisi
  useAutolysis: boolean;
  autolysisFlourPercentage: number;
  autolysisHydration: number;
  autolysisSaltPercentage: number;
  autolysisFlourSelections: FlourSelection[];
  // Chiusura
  saltPercentage: number;
  yeastPercentage: number;
  oilPercentage: number;
  maltPercentage: number;
  additionalIngredients: AdditionalIngredient[];
  closureFlourSelections: FlourSelection[];
  // Ingredienti selezionati
  selectedWaterId: string | null;
  selectedSaltId: string | null;
  selectedOilId: string | null;
  selectedYeastId: string | null;
  selectedMaltId: string | null;
  // Gestione fasi
  prefStorageTime: string;
  prefStorageTemp: string;
  prefProcedure: string;
  autolysisTime: string;
  autolysisTemp: string;
  autolysisProcedure: string;
  mixingTime: string;
  mixingTemp: string;
  mixingProcedure: string;
  usePuntata: boolean;
  puntataTime: string;
  puntataTemp: string;
  puntataProcedure: string;
  usePreShape: boolean;
  apprettoTime: string;
  apprettoTemp: string;
  apprettoProcedure: string;
  preShapeTime: string;
  preShapeTemp: string;
  preShapeProcedure: string;
  shapeTime: string;
  shapeTemp: string;
  shapeProcedure: string;
  cookingTime: string;
  cookingTemp: string;
  cookingProcedure: string;
}

interface AdvancedDoughCalculatorProps {
  ingredients: Ingredient[];
  preferments: Preferment[];
  onSave?: (recipe: any) => void;
  userName?: string; // Nome utente per il PDF
  onAddIngredient?: (ing: Ingredient) => Promise<string | undefined>;
  onAddSupplier?: (sup: any) => Promise<string | undefined>;
  suppliers?: any[];
  initialData?: AdvancedCalculatorFormData; // Dati per modifica ricetta esistente
}

const AdvancedDoughCalculator: React.FC<AdvancedDoughCalculatorProps> = ({
  ingredients,
  preferments,
  onSave,
  userName,
  onAddIngredient,
  onAddSupplier,
  suppliers = [],
  initialData
}) => {
  // Parametri generali
  const [recipeName, setRecipeName] = useState(initialData?.recipeName || '');
  const [recipeCategory, setRecipeCategory] = useState(initialData?.recipeCategory || 'Pizza');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const categories = ['Pizza', 'Pane', 'Dolci', 'Panificazione', 'Focaccia', 'Taralli', 'Biscotti', 'Grissini', 'Crackers', 'Altro'];

  // Categorie che NON permettono liquidi aggiuntivi (solo acqua)
  const categoriesSoloAcqua = ['Pizza', 'Pane', 'Panificazione', 'Focaccia'];
  const allowExtraLiquids = !categoriesSoloAcqua.includes(recipeCategory);
  const [totalHydration, setTotalHydration] = useState(initialData?.totalHydration ?? 70);
  const [multiplier, setMultiplier] = useState(initialData?.multiplier ?? 1);
  const [portionWeight, setPortionWeight] = useState<number | undefined>(initialData?.portionWeight ?? 270);

  // Pre-fermento
  const [usePreferment, setUsePreferment] = useState(initialData?.usePreferment ?? false);
  const [selectedPrefermentId, setSelectedPrefermentId] = useState<string | null>(initialData?.selectedPrefermentId ?? null);
  const [prefermentFlourPercentage, setPrefermentFlourPercentage] = useState(initialData?.prefermentFlourPercentage ?? 20);
  const [prefermentFlourSelections, setPrefermentFlourSelections] = useState<FlourSelection[]>(initialData?.prefermentFlourSelections ?? []);

  // Autolisi
  const [useAutolysis, setUseAutolysis] = useState(initialData?.useAutolysis ?? false);
  const [autolysisFlourPercentage, setAutolysisFlourPercentage] = useState(initialData?.autolysisFlourPercentage ?? 70);
  const [autolysisHydration, setAutolysisHydration] = useState(initialData?.autolysisHydration ?? 60);
  const [autolysisSaltPercentage, setAutolysisSaltPercentage] = useState(initialData?.autolysisSaltPercentage ?? 0);
  const [autolysisFlourSelections, setAutolysisFlourSelections] = useState<FlourSelection[]>(initialData?.autolysisFlourSelections ?? []);

  // Chiusura
  const [saltPercentage, setSaltPercentage] = useState(initialData?.saltPercentage ?? 2.5); // Sale totale ricetta
  const [yeastPercentage, setYeastPercentage] = useState(initialData?.yeastPercentage ?? 0.5);
  const [oilPercentage, setOilPercentage] = useState(initialData?.oilPercentage ?? 0);
  const [maltPercentage, setMaltPercentage] = useState(initialData?.maltPercentage ?? 0);
  const [additionalIngredients, setAdditionalIngredients] = useState<AdditionalIngredient[]>(initialData?.additionalIngredients ?? []);
  const [closureFlourSelections, setClosureFlourSelections] = useState<FlourSelection[]>(initialData?.closureFlourSelections ?? []);

  // Liquidi aggiuntivi (vino, latte, birra, ecc.) - solo per categorie non-pizza
  interface ExtraLiquid {
    id: string;
    ingredientId: string;
    percentage: number;
  }
  const [extraLiquids, setExtraLiquids] = useState<ExtraLiquid[]>([]);
  const [selectedExtraLiquidId, setSelectedExtraLiquidId] = useState<string>('');
  const [newExtraLiquidPercentage, setNewExtraLiquidPercentage] = useState<number>(0);

  // === PARAMETRI GESTIONE FASI ===
  // Gestione Pre-fermento (tempo in ore, temperatura in °C)
  const [prefStorageTime, setPrefStorageTime] = useState<string>(initialData?.prefStorageTime ?? '12-24');
  const [prefStorageTemp, setPrefStorageTemp] = useState<string>(initialData?.prefStorageTemp ?? '18-20');
  const [prefProcedure, setPrefProcedure] = useState<string>(initialData?.prefProcedure ?? 'Mescolare farina, acqua e lievito. Coprire e lasciar maturare.');

  // Gestione Autolisi
  const [autolysisTime, setAutolysisTime] = useState<string>(initialData?.autolysisTime ?? '30-60');
  const [autolysisTemp, setAutolysisTemp] = useState<string>(initialData?.autolysisTemp ?? 'T.A.');
  const [autolysisProcedure, setAutolysisProcedure] = useState<string>(initialData?.autolysisProcedure ?? 'Mescolare farina e acqua fino a formare un impasto omogeneo. Coprire e lasciar riposare.');

  // Funzione helper per generare procedura IMPASTO pre-impostata
  const generateDefaultMixingProcedure = (
    hasPreferment: boolean,
    hasAutolysis: boolean,
    hasMalt: boolean,
    hasOil: boolean
  ): string => {
    const steps: string[] = [];
    
    if (hasPreferment) {
      steps.push('Inserire la biga');
    }
    
    if (hasAutolysis) {
      steps.push('Inserire l\'autolisi');
    }
    
    steps.push('Inserire il lievito');
    
    if (hasMalt) {
      steps.push('Inserire il malto');
    }
    
    steps.push('Aggiungere acqua per raggiungere il 65%');
    steps.push('Far girare per 5 min in 1°Vel');
    steps.push('Aggiungere il sale e far girare 3 min');
    steps.push('Aggiungere l\'acqua restante in 2°Vel per 3 min');
    
    if (hasOil) {
      steps.push('Ultimare con l\'olio');
    }
    
    steps.push('Mettere in vasche 60x40');
    
    return steps.join('. ') + '.';
  };

  // Gestione Impasto (chiusura)
  const [mixingTime, setMixingTime] = useState<string>(initialData?.mixingTime ?? '11');
  const [mixingTemp, setMixingTemp] = useState<string>(initialData?.mixingTemp ?? '24');
  const defaultMixingProcedure = generateDefaultMixingProcedure(
    initialData?.usePreferment ?? false,
    initialData?.useAutolysis ?? false,
    (initialData?.maltPercentage ?? 0) >= 0.1,
    (initialData?.oilPercentage ?? 0) > 0
  );
  const [mixingProcedure, setMixingProcedure] = useState<string>(initialData?.mixingProcedure ?? defaultMixingProcedure);

  // Puntata (prima lievitazione in massa)
  const [usePuntata, setUsePuntata] = useState<boolean>(initialData?.usePuntata ?? true);
  const [puntataTime, setPuntataTime] = useState<string>(initialData?.puntataTime ?? '24 ore 4°C / 15-20 min 24°C');
  const [puntataTemp, setPuntataTemp] = useState<string>(initialData?.puntataTemp ?? '4°C / 24°C');
  const [puntataProcedure, setPuntataProcedure] = useState<string>(initialData?.puntataProcedure ?? 'Inserire in contenitore leggermente oliato e far puntare a 24 ore 4°C / 15-20 min 24°C');

  // Appretto vs Pre-shape
  const [usePreShape, setUsePreShape] = useState<boolean>(initialData?.usePreShape ?? false); // false = Appretto, true = Pre-shape

  // Appretto (lievitazione dopo staglio)
  const [apprettoTime, setApprettoTime] = useState<string>(initialData?.apprettoTime ?? '4-8');
  const [apprettoTemp, setApprettoTemp] = useState<string>(initialData?.apprettoTemp ?? 'T.A. / 4°C');
  const [apprettoProcedure, setApprettoProcedure] = useState<string>(initialData?.apprettoProcedure ?? 'Formare i panetti e lasciar lievitare. Conservare in frigorifero se necessario.');

  // Pre-shape (pre-forma prima dello shape)
  const [preShapeTime, setPreShapeTime] = useState<string>(initialData?.preShapeTime ?? '15-30');
  const [preShapeTemp, setPreShapeTemp] = useState<string>(initialData?.preShapeTemp ?? 'T.A.');
  const [preShapeProcedure, setPreShapeProcedure] = useState<string>(initialData?.preShapeProcedure ?? 'Pre-formare i panetti in forma tondeggiante. Lasciar riposare coperti.');

  // Shape (forma finale)
  const [shapeTime, setShapeTime] = useState<string>(initialData?.shapeTime ?? '10-20');
  const [shapeTemp, setShapeTemp] = useState<string>(initialData?.shapeTemp ?? 'T.A.');
  const [shapeProcedure, setShapeProcedure] = useState<string>(initialData?.shapeProcedure ?? 'Formare i panetti nella forma finale. Sistemare su teglia o cestino.');

  // Cottura
  const [cookingTime, setCookingTime] = useState<string>(initialData?.cookingTime ?? '10-15');
  const [cookingTemp, setCookingTemp] = useState<string>(initialData?.cookingTemp ?? '450-480');
  const [cookingProcedure, setCookingProcedure] = useState<string>(initialData?.cookingProcedure ?? 'Cuocere in forno preriscaldato fino a doratura uniforme.');

  // UI State
  const [selectedAdditionalIngredientId, setSelectedAdditionalIngredientId] = useState<string>('');
  const [newAdditionalIngredientPercentage, setNewAdditionalIngredientPercentage] = useState<number>(1);
  const [showAdditionalIngredientModal, setShowAdditionalIngredientModal] = useState(false);
  const [additionalIngredientSearch, setAdditionalIngredientSearch] = useState('');
  const [selectedAdditionalCategory, setSelectedAdditionalCategory] = useState<string | null>(null);
  
  // Modal aggiunta ingredienti - Sistema a due schermate
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [addIngredientModalScreen, setAddIngredientModalScreen] = useState<'search' | 'form'>('search'); // 'search' = lista ingredienti, 'form' = form nuovo ingrediente
  const [addIngredientSearch, setAddIngredientSearch] = useState('');
  const [newIngredientForm, setNewIngredientForm] = useState<Partial<Ingredient>>({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
  const [isAddingNewCategoryIng, setIsAddingNewCategoryIng] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);
  const [supForm, setSupForm] = useState<Partial<Supplier>>({ name: '', phone: '', category: '', deliveryDays: [] });
  const [supLoading, setSupLoading] = useState(false);

    
  // Categorie ingredienti
  const ingredientCategories = useMemo(() => {
    return Array.from(new Set(ingredients.map(i => i.category))).filter(Boolean) as string[];
  }, [ingredients]);
  
  // Ingredienti base selezionati
  const [selectedWaterId, setSelectedWaterId] = useState<string | null>(initialData?.selectedWaterId ?? null);
  const [selectedSaltId, setSelectedSaltId] = useState<string | null>(initialData?.selectedSaltId ?? null);
  const [selectedOilId, setSelectedOilId] = useState<string | null>(initialData?.selectedOilId ?? null);
  const [selectedYeastId, setSelectedYeastId] = useState<string | null>(initialData?.selectedYeastId ?? null);
  const [selectedMaltId, setSelectedMaltId] = useState<string | null>(initialData?.selectedMaltId ?? null);
  
  // Filtra solo farine dall'economato - include tutti i prodotti della categoria "farina" (case insensitive)
  const availableFlours = useMemo(() => {
    return ingredients.filter(ing => {
      const categoryLower = ing.category?.toLowerCase() || '';
      const nameLower = ing.name?.toLowerCase() || '';
      // Include se la categoria contiene "farina" o se il nome contiene "farina"
      return categoryLower.includes('farina') || nameLower.includes('farina');
    });
  }, [ingredients]);
  
  // Filtra ingredienti per categoria (acqua, sale, olio, lievito, malto)
  const availableWater = useMemo(() => {
    return ingredients.filter(ing => 
      ing.name.toLowerCase().includes('acqua') || 
      ing.name.toLowerCase().includes('water') ||
      ing.category.toLowerCase().includes('acqua')
    );
  }, [ingredients]);
  
  const availableSalt = useMemo(() => {
    return ingredients.filter(ing => 
      ing.name.toLowerCase().includes('sale') || 
      ing.name.toLowerCase().includes('salt') ||
      ing.category.toLowerCase().includes('sale')
    );
  }, [ingredients]);
  
  const availableOil = useMemo(() => {
    return ingredients.filter(ing => 
      ing.name.toLowerCase().includes('olio') || 
      ing.name.toLowerCase().includes('oil') ||
      ing.name.toLowerCase().includes('evo') ||
      ing.category.toLowerCase().includes('olio')
    );
  }, [ingredients]);
  
  const availableYeast = useMemo(() => {
    return ingredients.filter(ing => 
      ing.name.toLowerCase().includes('lievito') || 
      ing.name.toLowerCase().includes('yeast') ||
      ing.category.toLowerCase().includes('lievito')
    );
  }, [ingredients]);
  
  const availableMalt = useMemo(() => {
    return ingredients.filter(ing =>
      ing.name.toLowerCase().includes('malto') ||
      ing.name.toLowerCase().includes('malt') ||
      ing.category.toLowerCase().includes('malto')
    );
  }, [ingredients]);

  // Liquidi aggiuntivi disponibili (vino, latte, birra, ecc.)
  const availableLiquids = useMemo(() => {
    return ingredients.filter(ing => {
      const name = ing.name.toLowerCase();
      const cat = ing.category.toLowerCase();
      // Escludi acqua (ha già il suo campo), cerca liquidi
      if (name.includes('acqua')) return false;
      return (
        name.includes('vino') ||
        name.includes('birra') ||
        name.includes('latte') ||
        name.includes('liquore') ||
        name.includes('rum') ||
        name.includes('marsala') ||
        name.includes('succo') ||
        name.includes('spremuta') ||
        cat.includes('liquidi') ||
        cat.includes('bevande') ||
        cat.includes('vini') ||
        cat.includes('alcolici')
      );
    });
  }, [ingredients]);

  // Calcola totale percentuale liquidi extra
  const totalExtraLiquidsPercentage = useMemo(() => {
    return extraLiquids.reduce((sum, l) => sum + l.percentage, 0);
  }, [extraLiquids]);

  // Trova prefermento selezionato
  const selectedPreferment = useMemo(() => {
    return preferments.find(p => p.id === selectedPrefermentId) || null;
  }, [preferments, selectedPrefermentId]);

  // Auto-selezione ingredienti base dall'economato al mount
  useEffect(() => {
    // Acqua - cerca "acqua" nel nome
    if (!selectedWaterId && availableWater.length > 0) {
      const acqua = availableWater.find(i =>
        i.name.toLowerCase() === 'acqua' ||
        i.name.toLowerCase().includes('acqua')
      );
      if (acqua) setSelectedWaterId(acqua.id);
    }

    // Sale Fino - cerca esattamente "sale fino" o simile
    if (!selectedSaltId && availableSalt.length > 0) {
      const saleFino = availableSalt.find(i =>
        i.name.toLowerCase() === 'sale fino' ||
        i.name.toLowerCase().includes('sale fino')
      ) || availableSalt[0]; // fallback al primo sale disponibile
      if (saleFino) setSelectedSaltId(saleFino.id);
    }

    // Olio Semi Girasole - cerca esattamente
    if (!selectedOilId && availableOil.length > 0) {
      const olioGirasole = availableOil.find(i =>
        i.name.toLowerCase().includes('semi girasole') ||
        i.name.toLowerCase().includes('girasole') ||
        i.name.toLowerCase() === 'olio semi girasole'
      ) || availableOil[0]; // fallback al primo olio
      if (olioGirasole) setSelectedOilId(olioGirasole.id);
    }

    // Estratto Di Malto In Polvere - cerca esattamente
    if (!selectedMaltId && availableMalt.length > 0) {
      const malto = availableMalt.find(i =>
        i.name.toLowerCase().includes('estratto') ||
        i.name.toLowerCase().includes('malto in polvere') ||
        i.name.toLowerCase() === 'estratto di malto in polvere'
      ) || availableMalt[0]; // fallback al primo malto
      if (malto) setSelectedMaltId(malto.id);
    }

    // Lievito - seleziona il primo disponibile
    if (!selectedYeastId && availableYeast.length > 0) {
      setSelectedYeastId(availableYeast[0].id);
    }
  }, [availableWater, availableSalt, availableOil, availableMalt, availableYeast]);

  // Aggiorna procedura IMPASTO automaticamente quando cambiano i selettori (solo se non modificata manualmente)
  useEffect(() => {
    // Aggiorna solo se non è stato passato un valore iniziale personalizzato
    if (!initialData?.mixingProcedure) {
      const newProcedure = generateDefaultMixingProcedure(
        usePreferment,
        useAutolysis,
        maltPercentage >= 0.1,
        oilPercentage > 0
      );
      setMixingProcedure(newProcedure);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usePreferment, useAutolysis, maltPercentage, oilPercentage]);
  
  // Calcoli
  const { result, errors, isValid } = useDoughCalculations({
    totalFlour: 1000, // Base 1kg
    totalHydration,
    multiplier,
    usePreferment,
    selectedPreferment,
    prefermentFlourPercentage,
    prefermentFlourSelections,
    useAutolysis,
    autolysisFlourPercentage,
    autolysisHydration,
    autolysisSaltPercentage,
    autolysisFlourSelections,
    saltPercentage,
    yeastPercentage,
    oilPercentage,
    maltPercentage,
    additionalIngredients,
    closureFlourSelections,
    selectedSaltId,
    selectedYeastId,
    selectedOilId,
    selectedMaltId,
    ingredients
  });

  // Calcola percentuali farina e validazione
  // IMPORTANTE: Tutte le percentuali sono sempre sulla farina TOTALE (100% = 1kg)
  const flourValidation = useMemo(() => {
    const totalFlour = 1000; // Base sempre 1kg

    // Percentuale farina usata nel pre-fermento (sulla farina totale)
    const prefPercentage = usePreferment && selectedPreferment ? prefermentFlourPercentage : 0;
    const prefermentFlour = (totalFlour * prefPercentage) / 100;

    // Percentuale farina usata in autolisi (sulla farina TOTALE)
    const autoPercentage = useAutolysis ? autolysisFlourPercentage : 0;
    const autolysisFlour = (totalFlour * autoPercentage) / 100;

    // Percentuale massima disponibile per autolisi
    const maxAutolysisPercentage = 100 - prefPercentage;

    // Percentuale rimanente per chiusura (sulla farina totale)
    const closurePercentage = 100 - prefPercentage - autoPercentage;
    const remainingForClosure = (totalFlour * closurePercentage) / 100;

    // Verifica che le percentuali delle farine sommino al 100% in ogni fase
    const prefFlourTotal = prefermentFlourSelections.reduce((sum, f) => sum + f.percentage, 0);
    const autoFlourTotal = autolysisFlourSelections.reduce((sum, f) => sum + f.percentage, 0);
    const closureFlourTotal = closureFlourSelections.reduce((sum, f) => sum + f.percentage, 0);

    // La ricetta è valida se ogni fase ha le farine che sommano al 100%
    const isPrefFlourValid = !usePreferment || prefPercentage === 0 || Math.abs(prefFlourTotal - 100) < 0.01;
    const isAutoFlourValid = !useAutolysis || autoPercentage === 0 || Math.abs(autoFlourTotal - 100) < 0.01;
    const isClosureFlourValid = closurePercentage <= 0 || Math.abs(closureFlourTotal - 100) < 0.01;

    // Verifica che ci siano farine selezionate dove necessario
    const hasPrefFlours = !usePreferment || prefPercentage === 0 || prefermentFlourSelections.length > 0;
    const hasAutoFlours = !useAutolysis || autoPercentage === 0 || autolysisFlourSelections.length > 0;
    const hasClosureFlours = closurePercentage <= 0 || closureFlourSelections.length > 0;

    return {
      prefPercentage,
      autoPercentage,
      closurePercentage,
      maxAutolysisPercentage,
      remainingForClosure,
      prefermentFlour,
      autolysisFlour,
      isPrefFlourValid,
      isAutoFlourValid,
      isClosureFlourValid,
      hasPrefFlours,
      hasAutoFlours,
      hasClosureFlours,
      isAllFloursAssigned: isPrefFlourValid && isAutoFlourValid && isClosureFlourValid && hasPrefFlours && hasAutoFlours && hasClosureFlours
    };
  }, [
    usePreferment, selectedPreferment, prefermentFlourPercentage, prefermentFlourSelections,
    useAutolysis, autolysisFlourPercentage, autolysisFlourSelections,
    closureFlourSelections
  ]);
  
  const handleAddAdditionalIngredient = () => {
    if (!selectedAdditionalIngredientId || newAdditionalIngredientPercentage <= 0) return;
    
    const newIng: AdditionalIngredient = { id: selectedAdditionalIngredientId, percentage: newAdditionalIngredientPercentage };
    setAdditionalIngredients([...additionalIngredients, newIng]);
    setSelectedAdditionalIngredientId('');
    setNewAdditionalIngredientPercentage(1);
  };

  const handleAddAdditionalIngredientWithValue = React.useCallback((ingredientId: string, percentage: number) => {
    if (!ingredientId || percentage <= 0) return;
    
    // Usa una funzione di callback per evitare problemi di re-render
    setAdditionalIngredients(prev => {
      // Verifica se l'ingrediente è già presente
      if (prev.some(ing => ing.id === ingredientId)) {
        return prev;
      }
      const newIng: AdditionalIngredient = { id: ingredientId, percentage };
      return [...prev, newIng];
    });
    
    // Reset immediato senza delay
    setSelectedAdditionalIngredientId('');
    setNewAdditionalIngredientPercentage(1);
    setShowAdditionalIngredientModal(false);
  }, []);
  
  const handleRemoveAdditionalIngredient = (ingredientId: string) => {
    setAdditionalIngredients(additionalIngredients.filter(ing => ing.id !== ingredientId));
  };
  
  const handleUpdateAdditionalIngredientPercentage = (ingredientId: string, percentage: number) => {
    setAdditionalIngredients(additionalIngredients.map(ing =>
      ing.id === ingredientId ? { ...ing, percentage: Math.max(0, percentage) } : ing
    ));
  };
  
  // Ingredienti disponibili (non già aggiunti)
  const availableIngredientsForSelect = useMemo(() => {
    const addedIds = new Set(additionalIngredients.map(ai => ai.id));
    return ingredients.filter(ing => !addedIds.has(ing.id));
  }, [ingredients, additionalIngredients]);
  
  return (
    <div className="space-y-6 pb-12">
      {/* Errori validazione */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-black text-sm text-red-900 mb-2">Errori di validazione</h4>
              <ul className="space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-xs font-semibold text-red-800">• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Nome Ricetta e Categoria */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="text-sm font-black text-gray-700 mb-3 block">
            Nome Ricetta *
          </label>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="Es: Pane Classico, Pizza Napoletana..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {!recipeName && (
            <p className="text-xs text-gray-400 font-semibold mt-2">
              ⚠️ Inserisci un nome per la ricetta
            </p>
          )}
        </div>
        
        <div>
          <label className="text-sm font-black text-gray-700 mb-3 block">
            Categoria *
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setRecipeCategory(cat);
                  setIsAddingNewCategory(false);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                  recipeCategory === cat
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setIsAddingNewCategory(true)}
              className={`px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 ${
                isAddingNewCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <Plus size={16} />
              <span>Nuova</span>
            </button>
          </div>
          {isAddingNewCategory && (
            <input
              autoFocus
              type="text"
              placeholder="Nome nuova categoria..."
              value={recipeCategory}
              onChange={(e) => {
                setRecipeCategory(e.target.value);
                setIsAddingNewCategory(false);
              }}
              onBlur={() => setIsAddingNewCategory(false)}
              className="w-full mt-2 bg-gray-50 border border-blue-200 rounded-xl px-4 py-3 text-base font-bold focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div>
      
      {/* Parametri Iniziali */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Sliders className="text-blue-600" size={24} />
          <h3 className="text-xl font-black text-black">Parametri Iniziali</h3>
        </div>

        <div className="space-y-3">
          {/* Idratazione totale - iOS Style */}
          <IOSStepper
            value={totalHydration}
            onChange={setTotalHydration}
            min={10}
            max={90}
            step={0.5}
            unit="%"
            label="Idratazione Totale"
            sublabel="Percentuale acqua sulla farina"
          />

          {/* Moltiplicatore */}
          <IOSStepper
            value={multiplier}
            onChange={setMultiplier}
            min={0.5}
            max={10}
            step={0.5}
            unit="x"
            label="Moltiplicatore Ricetta"
            sublabel="Base: 1kg farina"
          />

          {/* Peso porzione */}
          <IOSStepper
            value={portionWeight || 270}
            onChange={(v) => setPortionWeight(v > 0 ? v : undefined)}
            min={100}
            max={500}
            step={10}
            unit="g"
            label="Peso Porzione"
            sublabel="Per calcolo costo per porzione"
          />
        </div>
      </div>
      
      {/* Pre-fermento */}
      <PhaseCard
        title="Pre-fermento"
        isActive={usePreferment}
        onToggle={setUsePreferment}
        collapsible={true}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-black text-gray-700 mb-2 block">
              Seleziona Pre-fermento
            </label>
            <select
              value={selectedPrefermentId || ''}
              onChange={(e) => setSelectedPrefermentId(e.target.value || null)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleziona un pre-fermento...</option>
              {preferments.map(pref => (
                <option key={pref.id} value={pref.id}>
                  {pref.name} ({pref.waterPercentage}% idratazione, {pref.yeastPercentage}% lievito)
                </option>
              ))}
            </select>
            {selectedPreferment && (
              <p className="text-xs text-gray-500 font-semibold mt-1">
                Tipo: {selectedPreferment.type} • Sale: {selectedPreferment.saltPercentage}%
              </p>
            )}
          </div>
          
          {selectedPreferment && (
            <>
              {/* Percentuale farina pre-fermento - iOS Style */}
              <IOSStepper
                value={prefermentFlourPercentage}
                onChange={setPrefermentFlourPercentage}
                min={5}
                max={100}
                step={5}
                unit="%"
                label="Farina nel Pre-fermento"
                sublabel={`${prefermentFlourPercentage}% della farina totale = ${flourValidation.prefermentFlour}g`}
              />
              
              <div>
                <label className="text-sm font-black text-gray-700 mb-3 block">
                  Seleziona Farine per Pre-fermento
                </label>
                <FlourSelector
                  flourSelections={prefermentFlourSelections}
                  availableFlours={availableFlours}
                  onUpdate={setPrefermentFlourSelections}
                  phaseLabel="Pre-fermento"
                />
              </div>

              {/* Gestione Pre-fermento */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Gestione Pre-fermento
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (ore)</label>
                    <input
                      type="text"
                      value={prefStorageTime}
                      onChange={(e) => setPrefStorageTime(e.target.value)}
                      placeholder="es: 12-24"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura (°C)</label>
                    <input
                      type="text"
                      value={prefStorageTemp}
                      onChange={(e) => setPrefStorageTemp(e.target.value)}
                      placeholder="es: 18-20"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
                  <textarea
                    value={prefProcedure}
                    onChange={(e) => setPrefProcedure(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </PhaseCard>
      
      {/* Autolisi */}
      <PhaseCard
        title="Autolisi"
        isActive={useAutolysis}
        onToggle={setUseAutolysis}
        collapsible={true}
      >
        <div className="space-y-4">
          {/* Percentuale farina autolisi - iOS Style */}
          <IOSStepper
            value={autolysisFlourPercentage}
            onChange={(v) => setAutolysisFlourPercentage(Math.min(v, flourValidation.maxAutolysisPercentage))}
            min={0}
            max={flourValidation.maxAutolysisPercentage}
            step={5}
            unit="%"
            label="Farina in Autolisi"
            sublabel={`${autolysisFlourPercentage}% della farina totale = ${flourValidation.autolysisFlour}g (max ${flourValidation.maxAutolysisPercentage}%)`}
          />

          {/* Idratazione autolisi - iOS Style */}
          <IOSStepper
            value={autolysisHydration}
            onChange={setAutolysisHydration}
            min={40}
            max={80}
            step={1}
            unit="%"
            label="Idratazione Autolisi"
          />

          {/* Sale in autolisi - iOS Style */}
          <IOSStepper
            value={autolysisSaltPercentage}
            onChange={setAutolysisSaltPercentage}
            min={0}
            max={3}
            step={0.1}
            unit="%"
            label="Sale in Autolisi"
            sublabel="Verrà sottratto dal sale totale"
          />

          <div>
            <label className="text-sm font-black text-gray-700 mb-3 block">
              Seleziona Farine per Autolisi
            </label>
            <FlourSelector
              flourSelections={autolysisFlourSelections}
              availableFlours={availableFlours}
              onUpdate={setAutolysisFlourSelections}
              phaseLabel="Autolisi"
            />
          </div>

          {/* Gestione Autolisi */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Gestione Autolisi
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (min)</label>
                <input
                  type="text"
                  value={autolysisTime}
                  onChange={(e) => setAutolysisTime(e.target.value)}
                  placeholder="es: 30-60"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura</label>
                <input
                  type="text"
                  value={autolysisTemp}
                  onChange={(e) => setAutolysisTemp(e.target.value)}
                  placeholder="es: T.A."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
              <textarea
                value={autolysisProcedure}
                onChange={(e) => setAutolysisProcedure(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
              />
            </div>
          </div>
        </div>
      </PhaseCard>

      {/* Chiusura Impasto */}
      <PhaseCard
        title="Chiusura Impasto"
        isActive={true}
        onToggle={() => {}}
        collapsible={false}
      >
        <div className="space-y-6">
          {/* Riepilogo distribuzione farina */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
            <h4 className="text-xs font-black text-blue-800 uppercase mb-3">Distribuzione Farina (100% = 1kg)</h4>
            <div className="flex gap-2 mb-2">
              {flourValidation.prefPercentage > 0 && (
                <div
                  className="bg-amber-400 rounded-lg h-3"
                  style={{ width: `${flourValidation.prefPercentage}%` }}
                  title={`Pre-fermento: ${flourValidation.prefPercentage}%`}
                />
              )}
              {flourValidation.autoPercentage > 0 && (
                <div
                  className="bg-green-400 rounded-lg h-3"
                  style={{ width: `${flourValidation.autoPercentage}%` }}
                  title={`Autolisi: ${flourValidation.autoPercentage}%`}
                />
              )}
              {flourValidation.closurePercentage > 0 && (
                <div
                  className="bg-blue-500 rounded-lg h-3"
                  style={{ width: `${flourValidation.closurePercentage}%` }}
                  title={`Chiusura: ${flourValidation.closurePercentage}%`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-bold">
              {flourValidation.prefPercentage > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-amber-400 rounded" />
                  <span className="text-gray-700">Pre-fermento: {flourValidation.prefPercentage}%</span>
                </div>
              )}
              {flourValidation.autoPercentage > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-green-400 rounded" />
                  <span className="text-gray-700">Autolisi: {flourValidation.autoPercentage}%</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded" />
                <span className="text-gray-700">Chiusura: {flourValidation.closurePercentage}% ({flourValidation.remainingForClosure.toFixed(0)}g)</span>
              </div>
            </div>
          </div>

          {/* Farine chiusura */}
          <div>
            <label className="text-sm font-black text-gray-700 mb-3 block">
              Seleziona Farine per Chiusura *
            </label>
            {availableFlours.length === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-bold text-red-800">Nessuna farina disponibile</p>
                <p className="text-xs text-red-600 mt-1 mb-2">
                  Aggiungi ingredienti con categoria "Farine" nell'Economato per poter creare ricette.
                </p>
                {onAddIngredient && (
                  <button
                    onClick={() => setShowAddIngredientModal(true)}
                    className="w-full py-2 bg-blue-600 text-white rounded-xl font-black text-sm active:scale-95 transition-all"
                  >
                    <Plus size={16} className="inline mr-2" />
                    Aggiungi Farina
                  </button>
                )}
              </div>
            ) : flourValidation.closurePercentage <= 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-bold text-green-800">Tutta la farina è già stata assegnata</p>
                <p className="text-xs text-green-600 mt-1">
                  Il 100% della farina è stato distribuito tra pre-fermento ({flourValidation.prefPercentage}%) e autolisi ({flourValidation.autoPercentage}%).
                </p>
              </div>
            ) : (
              <FlourSelector
                flourSelections={closureFlourSelections}
                availableFlours={availableFlours}
                onUpdate={setClosureFlourSelections}
                phaseLabel="Chiusura"
              />
            )}
          </div>
          
          {/* Ingredienti standard - Stile iOS */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-gray-700 mb-2">Ingredienti Standard</h4>

            {/* Sale - iOS Style con info ingrediente */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              <IOSStepper
                value={saltPercentage}
                onChange={setSaltPercentage}
                min={1.8}
                max={3}
                step={0.1}
                unit="%"
                label="Sale"
                sublabel={selectedSaltId ? ingredients.find(i => i.id === selectedSaltId)?.name : 'Auto: Sale Fino'}
              />
              {!selectedSaltId && availableSalt.length === 0 && (
                <button
                  onClick={() => setShowAddIngredientModal(true)}
                  className="px-4 pb-3 text-xs text-blue-600 font-semibold hover:underline"
                >
                  Aggiungi sale all'economato
                </button>
              )}
              {useAutolysis && autolysisSaltPercentage > 0 && (
                <p className="px-4 pb-3 text-xs text-blue-600 font-semibold">
                  Sale chiusura: {(saltPercentage - autolysisSaltPercentage).toFixed(1)}%
                </p>
              )}
            </div>

            {/* Lievito - iOS Style */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              <IOSStepper
                value={yeastPercentage}
                onChange={setYeastPercentage}
                min={0}
                max={3}
                step={0.1}
                unit="%"
                label="Lievito"
                sublabel={selectedYeastId ? ingredients.find(i => i.id === selectedYeastId)?.name : 'Auto: primo disponibile'}
              />
              {!selectedYeastId && availableYeast.length === 0 && (
                <button
                  onClick={() => setShowAddIngredientModal(true)}
                  className="px-4 pb-3 text-xs text-blue-600 font-semibold hover:underline"
                >
                  Aggiungi lievito all'economato
                </button>
              )}
            </div>

            {/* Olio - iOS Style */}
            <IOSStepper
              value={oilPercentage}
              onChange={setOilPercentage}
              min={0}
              max={50}
              step={0.5}
              unit="%"
              label="Olio"
              sublabel={selectedOilId ? ingredients.find(i => i.id === selectedOilId)?.name : 'Auto: Olio Semi Girasole'}
            />

            {/* Malto - iOS Style */}
            <IOSStepper
              value={maltPercentage}
              onChange={setMaltPercentage}
              min={0}
              max={2}
              step={0.1}
              unit="%"
              label="Malto"
              sublabel={selectedMaltId ? ingredients.find(i => i.id === selectedMaltId)?.name : 'Auto: Estratto Di Malto'}
            />

            {/* Info ingredienti auto-selezionati */}
            <div className="bg-blue-50 rounded-xl p-3 mt-2">
              <p className="text-xs text-blue-700 font-semibold">
                Gli ingredienti base (acqua, sale, olio, malto) sono selezionati automaticamente dall'economato.
              </p>
            </div>
          </div>
          
          {/* Ingredienti aggiuntivi - Stile FlourSelector */}
          <div>
            <h4 className="text-sm font-black text-gray-700 mb-3">Ingredienti Aggiuntivi</h4>
            
            {/* Lista ingredienti selezionati - Stile FlourSelector */}
            {additionalIngredients.length > 0 && (
              <div className="space-y-2 mb-3">
                {additionalIngredients.map(ing => {
                  const ingredient = ingredients.find(i => i.id === ing.id);
                  if (!ingredient) return null;
                  
                  return (
                    <div key={ing.id} className="bg-gray-50 rounded-2xl overflow-hidden">
                      <div className="flex items-center p-3 gap-3">
                        {/* Info ingrediente */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{ingredient.name}</p>
                          <p className="text-xs text-gray-500 font-medium">{ingredient.category}</p>
                        </div>

                        {/* Stepper iOS Style */}
                        <div className="flex items-center gap-1">
                          <div className="flex items-center bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleUpdateAdditionalIngredientPercentage(ing.id, Math.max(0, ing.percentage - 0.5))}
                              className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-200"
                            >
                              <Minus size={16} strokeWidth={2.5} />
                            </button>

                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={ing.percentage}
                              onChange={(e) => handleUpdateAdditionalIngredientPercentage(ing.id, parseFloat(e.target.value) || 0)}
                              className="w-16 h-10 text-center text-sm font-bold text-gray-900 bg-transparent focus:outline-none focus:bg-blue-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />

                            <button
                              type="button"
                              onClick={() => handleUpdateAdditionalIngredientPercentage(ing.id, ing.percentage + 0.5)}
                              className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-gray-50 active:bg-gray-100 transition-colors border-l border-gray-200"
                            >
                              <Plus size={16} strokeWidth={2.5} />
                            </button>
                          </div>

                          <span className="text-xs font-bold text-gray-400 w-5">%</span>

                          {/* Pulsante rimuovi */}
                          <button
                            onClick={() => handleRemoveAdditionalIngredient(ing.id)}
                            className="p-2 text-red-400 hover:text-red-600 active:scale-95 transition-all"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Pulsante per aprire modal selezione ingrediente */}
            {availableIngredientsForSelect.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowAdditionalIngredientModal(true);
                  setAdditionalIngredientSearch('');
                  setSelectedAdditionalCategory(null);
                }}
                className="w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold text-sm flex items-center justify-center space-x-2 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95"
              >
                <Plus size={20} />
                <span>Aggiungi Ingrediente</span>
              </button>
            )}

            {/* Messaggio se non ci sono ingredienti disponibili */}
            {availableIngredientsForSelect.length === 0 && additionalIngredients.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 font-semibold">
                  Tutti gli ingredienti sono già stati aggiunti
                </p>
              </div>
            )}
          </div>

          {/* Gestione Impasto */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Gestione Impasto
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo impasto (min)</label>
                <input
                  type="text"
                  value={mixingTime}
                  onChange={(e) => setMixingTime(e.target.value)}
                  placeholder="es: 15-20"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">T° finale impasto (°C)</label>
                <input
                  type="text"
                  value={mixingTemp}
                  onChange={(e) => setMixingTemp(e.target.value)}
                  placeholder="es: 24"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
              <textarea
                value={mixingProcedure}
                onChange={(e) => setMixingProcedure(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
              />
            </div>
          </div>
        </div>
      </PhaseCard>

      {/* Puntata */}
      <PhaseCard
        title="Puntata"
        isActive={usePuntata}
        onToggle={setUsePuntata}
        collapsible={true}
      >
        {usePuntata && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 font-semibold">
              Prima lievitazione dell'impasto in massa, prima dello staglio.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (min)</label>
                <input
                  type="text"
                  value={puntataTime}
                  onChange={(e) => setPuntataTime(e.target.value)}
                  placeholder="es: 30-60"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura</label>
                <input
                  type="text"
                  value={puntataTemp}
                  onChange={(e) => setPuntataTemp(e.target.value)}
                  placeholder="es: T.A."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
              <textarea
                value={puntataProcedure}
                onChange={(e) => setPuntataProcedure(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
              />
            </div>
          </div>
        )}
      </PhaseCard>

      {/* Appretto / Pre-shape Toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-black">{usePreShape ? "Pre-shape" : "Appretto"}</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setUsePreShape(false)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  !usePreShape
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                Appretto
              </button>
              <button
                onClick={() => setUsePreShape(true)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  usePreShape
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                Pre-shape
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {!usePreShape ? (
            // Appretto
            <>
              <p className="text-xs text-gray-500 font-semibold">
                Lievitazione finale dopo lo staglio dei panetti ({portionWeight ? `${portionWeight}g` : 'peso da definire'}).
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (ore)</label>
                  <input
                    type="text"
                    value={apprettoTime}
                    onChange={(e) => setApprettoTime(e.target.value)}
                    placeholder="es: 4-8"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura</label>
                  <input
                    type="text"
                    value={apprettoTemp}
                    onChange={(e) => setApprettoTemp(e.target.value)}
                    placeholder="es: T.A. / 4°C"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
                <textarea
                  value={apprettoProcedure}
                  onChange={(e) => setApprettoProcedure(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
                />
              </div>
            </>
          ) : (
            // Pre-shape
            <>
              <p className="text-xs text-gray-500 font-semibold">
                Pre-forma i panetti prima dello shape finale ({portionWeight ? `${portionWeight}g` : 'peso da definire'}).
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (min)</label>
                  <input
                    type="text"
                    value={preShapeTime}
                    onChange={(e) => setPreShapeTime(e.target.value)}
                    placeholder="es: 15-30"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura</label>
                  <input
                    type="text"
                    value={preShapeTemp}
                    onChange={(e) => setPreShapeTemp(e.target.value)}
                    placeholder="es: T.A."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
                <textarea
                  value={preShapeProcedure}
                  onChange={(e) => setPreShapeProcedure(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Shape - Solo se Pre-shape è attivo */}
      {usePreShape && (
        <PhaseCard
          title="Shape"
          isActive={true}
          onToggle={() => {}}
          collapsible={false}
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500 font-semibold">
              Forma finale dei panetti dopo il pre-shape ({portionWeight ? `${portionWeight}g` : 'peso da definire'}).
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (min)</label>
                <input
                  type="text"
                  value={shapeTime}
                  onChange={(e) => setShapeTime(e.target.value)}
                  placeholder="es: 10-20"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura</label>
                <input
                  type="text"
                  value={shapeTemp}
                  onChange={(e) => setShapeTemp(e.target.value)}
                  placeholder="es: T.A."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
              <textarea
                value={shapeProcedure}
                onChange={(e) => setShapeProcedure(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
              />
            </div>
          </div>
        </PhaseCard>
      )}

      {/* Cottura */}
      <PhaseCard
        title="Cottura"
        isActive={true}
        onToggle={() => {}}
        collapsible={false}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (minuti)</label>
              <input
                type="text"
                value={cookingTime}
                onChange={(e) => setCookingTime(e.target.value)}
                placeholder="es: 10-15"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura (°C)</label>
              <input
                type="text"
                value={cookingTemp}
                onChange={(e) => setCookingTemp(e.target.value)}
                placeholder="es: 450-480"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
            <textarea
              value={cookingProcedure}
              onChange={(e) => setCookingProcedure(e.target.value)}
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
            />
          </div>
        </div>
      </PhaseCard>

      {/* Riepilogo - Mostra sempre se c'è un risultato */}
      {result && result.closure ? (
        <>
          <RecipeSummary
            result={result}
            ingredients={ingredients}
            portionWeight={portionWeight}
            multiplier={multiplier}
            selectedSaltId={selectedSaltId}
            selectedYeastId={selectedYeastId}
            selectedOilId={selectedOilId}
            selectedMaltId={selectedMaltId}
            selectedWaterId={selectedWaterId}
          />
          
          {/* Feedback per azioni disabilitate */}
          {(!recipeName.trim() || !flourValidation.isAllFloursAssigned || !selectedWaterId || !selectedSaltId || !selectedYeastId || (oilPercentage > 0 && !selectedOilId) || (usePreferment && maltPercentage > 0 && !selectedMaltId)) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <p className="text-sm font-bold text-amber-800 mb-2">⚠️ Per salvare o esportare la ricetta:</p>
              <ul className="text-sm text-amber-700 space-y-1">
                {!recipeName.trim() && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Inserisci un <strong>nome per la ricetta</strong> nel campo in alto
                  </li>
                )}
                {!selectedWaterId && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona un <strong>ingrediente acqua</strong> dall'economato
                  </li>
                )}
                {!selectedSaltId && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona un <strong>ingrediente sale</strong> dall'economato
                  </li>
                )}
                {!selectedYeastId && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona un <strong>ingrediente lievito</strong> dall'economato
                  </li>
                )}
                {oilPercentage > 0 && !selectedOilId && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona un <strong>ingrediente olio</strong> dall'economato (o imposta olio a 0%)
                  </li>
                )}
                {usePreferment && maltPercentage > 0 && !selectedMaltId && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona un <strong>ingrediente malto</strong> dall'economato (o imposta malto a 0%)
                  </li>
                )}
                {usePreferment && selectedPreferment && !flourValidation.hasPrefFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona le <strong>farine per il pre-fermento</strong>
                  </li>
                )}
                {usePreferment && selectedPreferment && !flourValidation.isPrefFlourValid && flourValidation.hasPrefFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Le percentuali farine nel <strong>pre-fermento</strong> devono sommare al 100%
                  </li>
                )}
                {useAutolysis && !flourValidation.hasAutoFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona le <strong>farine per l'autolisi</strong>
                  </li>
                )}
                {useAutolysis && !flourValidation.isAutoFlourValid && flourValidation.hasAutoFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Le percentuali farine nell'<strong>autolisi</strong> devono sommare al 100%
                  </li>
                )}
                {flourValidation.remainingForClosure > 0 && !flourValidation.hasClosureFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona le <strong>farine per la chiusura</strong> ({flourValidation.remainingForClosure.toFixed(0)}g rimanenti)
                  </li>
                )}
                {flourValidation.remainingForClosure > 0 && !flourValidation.isClosureFlourValid && flourValidation.hasClosureFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Le percentuali farine nella <strong>chiusura</strong> devono sommare al 100%
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Pulsanti Azioni */}
          <div className="space-y-3">
            {/* Pulsante Export PDF */}
            <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              console.log('Export PDF...', { recipeName, result });
              
              if (!recipeName.trim()) {
                alert('⚠️ Inserisci un nome per la ricetta prima di esportare il PDF');
                return;
              }
              
              if (!result) {
                alert('⚠️ Non c\'è un risultato da esportare. Configura la ricetta prima di esportare.');
                return;
              }
              
              if (!selectedWaterId || !selectedSaltId || !selectedYeastId) {
                alert('⚠️ Seleziona tutti gli ingredienti obbligatori (acqua, sale, lievito) prima di esportare');
                return;
              }
              
              if (oilPercentage > 0 && !selectedOilId) {
                alert('⚠️ Seleziona un ingrediente olio dall\'economato (o imposta la percentuale olio a 0)');
                return;
              }
              
              if (usePreferment && maltPercentage > 0 && !selectedMaltId) {
                alert('⚠️ Seleziona un ingrediente malto dall\'economato (o imposta la percentuale malto a 0)');
                return;
              }
              
              try {
                  generateRecipePDF({
                    name: recipeName.trim(),
                    category: recipeCategory.trim(),
                    hydration: totalHydration,
                    result,
                    ingredients,
                    portionWeight,
                    preferment: usePreferment ? selectedPreferment : null,
                    userName: userName,
                    management: {
                      preferment: usePreferment ? {
                        time: prefStorageTime,
                        temp: prefStorageTemp,
                        procedure: prefProcedure
                      } : undefined,
                      autolysis: useAutolysis ? {
                        time: autolysisTime,
                        temp: autolysisTemp,
                        procedure: autolysisProcedure
                      } : undefined,
                      mixing: {
                        time: mixingTime,
                        temp: mixingTemp,
                        procedure: mixingProcedure
                      },
                      puntata: usePuntata ? {
                        time: puntataTime,
                        temp: puntataTemp,
                        procedure: puntataProcedure
                      } : undefined,
                      appretto: !usePreShape ? {
                        time: apprettoTime,
                        temp: apprettoTemp,
                        procedure: apprettoProcedure
                      } : undefined,
                      preShape: usePreShape ? {
                        time: preShapeTime,
                        temp: preShapeTemp,
                        procedure: preShapeProcedure
                      } : undefined,
                      shape: usePreShape ? {
                        time: shapeTime,
                        temp: shapeTemp,
                        procedure: shapeProcedure
                      } : undefined,
                      cooking: {
                        time: cookingTime,
                        temp: cookingTemp,
                        procedure: cookingProcedure
                      }
                    }
                  });
                } catch (error) {
                  console.error('Errore nella generazione PDF:', error);
                  alert(`Errore nella generazione PDF: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
                }
              }}
              disabled={!recipeName.trim() || !flourValidation.isAllFloursAssigned || !selectedWaterId || !selectedSaltId || !selectedYeastId || (oilPercentage > 0 && !selectedOilId) || (usePreferment && maltPercentage > 0 && !selectedMaltId)}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-5 rounded-2xl font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              title={!recipeName.trim() ? 'Inserisci un nome per la ricetta' : !flourValidation.isAllFloursAssigned ? 'Completa l\'assegnazione delle farine' : !selectedWaterId ? 'Seleziona acqua' : !selectedSaltId ? 'Seleziona sale' : !selectedYeastId ? 'Seleziona lievito' : (oilPercentage > 0 && !selectedOilId) ? 'Seleziona olio' : (usePreferment && maltPercentage > 0 && !selectedMaltId) ? 'Seleziona malto' : ''}
            >
              <FileDown size={20} />
              <span>Esporta PDF Ricetta</span>
            </button>
            
            {/* Pulsante Salva */}
            {onSave && (
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (!recipeName.trim()) {
                    alert('⚠️ Inserisci un nome per la ricetta prima di salvare');
                    return;
                  }
                  
                  if (!flourValidation.isAllFloursAssigned) {
                    alert('⚠️ Completa l\'assegnazione delle farine in tutte le fasi prima di salvare');
                    return;
                  }
                  
                  // Verifica ingredienti obbligatori
                  if (!selectedWaterId) {
                    alert('⚠️ Seleziona un ingrediente acqua dall\'economato');
                    return;
                  }
                  if (!selectedSaltId) {
                    alert('⚠️ Seleziona un ingrediente sale dall\'economato');
                    return;
                  }
                  if (!selectedYeastId) {
                    alert('⚠️ Seleziona un ingrediente lievito dall\'economato');
                    return;
                  }
                  if (oilPercentage > 0 && !selectedOilId) {
                    alert('⚠️ Seleziona un ingrediente olio dall\'economato (o imposta la percentuale olio a 0)');
                    return;
                  }
                  if (usePreferment && maltPercentage > 0 && !selectedMaltId) {
                    alert('⚠️ Seleziona un ingrediente malto dall\'economato (o imposta la percentuale malto a 0)');
                    return;
                  }
            
            // Avvisa se ci sono errori critici
            const criticalErrors = errors.filter(e => 
              e.includes('negativa') || 
              e.includes('supera il 100%')
            );
            
            if (criticalErrors.length > 0) {
              const confirmSave = confirm(
                `⚠️ Attenzione: Ci sono errori critici nella ricetta:\n\n${criticalErrors.join('\n')}\n\nVuoi salvare comunque?`
              );
              if (!confirmSave) return;
            }
            
            // Salva la ricetta
            if (onSave && result) {
              try {
                // Salva tutti i dati del form per poterli ricaricare in modifica
                const formData: AdvancedCalculatorFormData = {
                  recipeName: recipeName.trim(),
                  recipeCategory: recipeCategory.trim(),
                  totalHydration,
                  multiplier,
                  portionWeight,
                  // Pre-fermento
                  usePreferment,
                  selectedPrefermentId,
                  prefermentFlourPercentage,
                  prefermentFlourSelections,
                  // Autolisi
                  useAutolysis,
                  autolysisFlourPercentage,
                  autolysisHydration,
                  autolysisSaltPercentage,
                  autolysisFlourSelections,
                  // Chiusura
                  saltPercentage,
                  yeastPercentage,
                  oilPercentage,
                  maltPercentage,
                  additionalIngredients,
                  closureFlourSelections,
                  // Ingredienti selezionati
                  selectedWaterId,
                  selectedSaltId,
                  selectedOilId,
                  selectedYeastId,
                  selectedMaltId,
                  // Gestione fasi
                  prefStorageTime,
                  prefStorageTemp,
                  prefProcedure,
                  autolysisTime,
                  autolysisTemp,
                  autolysisProcedure,
                  mixingTime,
                  mixingTemp,
                  mixingProcedure,
                  usePuntata,
                  puntataTime,
                  puntataTemp,
                  puntataProcedure,
                  usePreShape,
                  apprettoTime,
                  apprettoTemp,
                  apprettoProcedure,
                  preShapeTime,
                  preShapeTemp,
                  preShapeProcedure,
                  shapeTime,
                  shapeTemp,
                  shapeProcedure,
                  cookingTime,
                  cookingTemp,
                  cookingProcedure
                };

                await onSave({
                  name: normalizeText(recipeName.trim()),
                  category: recipeCategory.trim(),
                  hydration: totalHydration,
                  portionWeight,
                  preferment: usePreferment ? selectedPreferment : null,
                  calculation: result,
                  formData, // Dati completi del form per ricaricamento
                  selectedIngredients: {
                    water: selectedWaterId,
                    salt: selectedSaltId,
                    oil: selectedOilId,
                    yeast: selectedYeastId,
                    malt: selectedMaltId
                  },
                  management: {
                    preferment: usePreferment ? {
                      time: prefStorageTime,
                      temp: prefStorageTemp,
                      procedure: prefProcedure
                    } : undefined,
                    autolysis: useAutolysis ? {
                      time: autolysisTime,
                      temp: autolysisTemp,
                      procedure: autolysisProcedure
                    } : undefined,
                    mixing: {
                      time: mixingTime,
                      temp: mixingTemp,
                      procedure: mixingProcedure
                    },
                    puntata: usePuntata ? {
                      time: puntataTime,
                      temp: puntataTemp,
                      procedure: puntataProcedure
                    } : undefined,
                    appretto: !usePreShape ? {
                      time: apprettoTime,
                      temp: apprettoTemp,
                      procedure: apprettoProcedure
                    } : undefined,
                    preShape: usePreShape ? {
                      time: preShapeTime,
                      temp: preShapeTemp,
                      procedure: preShapeProcedure
                    } : undefined,
                    shape: usePreShape ? {
                      time: shapeTime,
                      temp: shapeTemp,
                      procedure: shapeProcedure
                    } : undefined,
                    cooking: {
                      time: cookingTime,
                      temp: cookingTemp,
                      procedure: cookingProcedure
                    }
                  }
                });
                // Genera PDF automaticamente dopo il salvataggio
                generateRecipePDF({
                  name: recipeName.trim(),
                  category: recipeCategory.trim(),
                  hydration: totalHydration,
                  result,
                  ingredients,
                  portionWeight,
                  preferment: usePreferment ? selectedPreferment : null,
                  userName: userName,
                  management: {
                    preferment: usePreferment ? {
                      time: prefStorageTime,
                      temp: prefStorageTemp,
                      procedure: prefProcedure
                    } : undefined,
                    autolysis: useAutolysis ? {
                      time: autolysisTime,
                      temp: autolysisTemp,
                      procedure: autolysisProcedure
                    } : undefined,
                    mixing: {
                      time: mixingTime,
                      temp: mixingTemp,
                      procedure: mixingProcedure
                    },
                    puntata: usePuntata ? {
                      time: puntataTime,
                      temp: puntataTemp,
                      procedure: puntataProcedure
                    } : undefined,
                    appretto: !usePreShape ? {
                      time: apprettoTime,
                      temp: apprettoTemp,
                      procedure: apprettoProcedure
                    } : undefined,
                    preShape: usePreShape ? {
                      time: preShapeTime,
                      temp: preShapeTemp,
                      procedure: preShapeProcedure
                    } : undefined,
                    shape: usePreShape ? {
                      time: shapeTime,
                      temp: shapeTemp,
                      procedure: shapeProcedure
                    } : undefined,
                    cooking: {
                      time: cookingTime,
                      temp: cookingTemp,
                      procedure: cookingProcedure
                    }
                  }
                });
                
                alert('✅ Ricetta salvata e PDF generato con successo!');
                
                // NON resettare il form: mantieni tutto visibile per permettere export aggiuntivi
                // Se vuoi creare una nuova ricetta, puoi cliccare "X" per chiudere il calcolatore
              } catch (error) {
                console.error('Errore nel salvataggio:', error);
                alert(`Errore nel salvataggio: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
              }
            }
                }}
                disabled={!recipeName.trim() || !flourValidation.isAllFloursAssigned || !selectedWaterId || !selectedSaltId || !selectedYeastId || (oilPercentage > 0 && !selectedOilId) || (usePreferment && maltPercentage > 0 && !selectedMaltId)}
                className={`w-full py-5 rounded-2xl font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 ${
                  recipeName.trim() && flourValidation.isAllFloursAssigned && selectedWaterId && selectedSaltId && selectedYeastId && (oilPercentage === 0 || selectedOilId) && (!usePreferment || maltPercentage === 0 || selectedMaltId)
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={!recipeName.trim() ? 'Inserisci un nome per la ricetta' : !flourValidation.isAllFloursAssigned ? 'Completa l\'assegnazione delle farine' : !selectedWaterId ? 'Seleziona acqua' : !selectedSaltId ? 'Seleziona sale' : !selectedYeastId ? 'Seleziona lievito' : (oilPercentage > 0 && !selectedOilId) ? 'Seleziona olio' : (usePreferment && maltPercentage > 0 && !selectedMaltId) ? 'Seleziona malto' : ''}
              >
                <Save size={20} />
                <span>Salva Ricetta</span>
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-gray-500 font-semibold mb-2">
            ⚠️ Configura la ricetta per vedere il riepilogo
          </p>
          {!flourValidation.isAllFloursAssigned && (
            <p className="text-sm text-blue-600 font-semibold mt-2">
              💡 Seleziona le farine per ogni fase attiva (pre-fermento, autolisi, chiusura)
            </p>
          )}
          {errors.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-red-500 font-semibold">Errori di validazione:</p>
              {errors.map((error, idx) => (
                <p key={idx} className="text-xs text-red-600">{error}</p>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Modal per aggiungere ingredienti - Sistema a due schermate */}
      {showAddIngredientModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-3xl bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[95vh] pb-12 scrollbar-hide relative">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
            
            {/* Header con navigazione tra schermate */}
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black tracking-tighter">
                {addIngredientModalScreen === 'search' ? 'Seleziona Ingrediente' : 'Nuovo Ingrediente'}
              </h3>
              <button 
                onClick={() => { 
                  setShowAddIngredientModal(false); 
                  setAddIngredientSearch(''); 
                  setAddIngredientModalScreen('search');
                  setNewIngredientForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
                  setIsAddingNewCategoryIng(false);
                }} 
                className="bg-gray-100 p-2 rounded-full text-gray-400 hover:bg-gray-200 transition-colors"
              >
                <X size={24}/>
              </button>
            </div>

            {/* PRIMA SCHERMATA: Lista ingredienti esistenti (stile LabView/MenuView) */}
            {addIngredientModalScreen === 'search' && (
              <div className="space-y-6">
                {/* Barra di ricerca */}
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Cerca ingrediente o semilavorato..." 
                    className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" 
                    value={addIngredientSearch} 
                    onChange={(e) => setAddIngredientSearch(e.target.value)} 
                  />
                </div>

                {/* Pulsante per passare al form nuovo ingrediente */}
                <button
                  onClick={() => setAddIngredientModalScreen('form')}
                  className="w-full p-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-bold text-sm flex items-center justify-center space-x-2 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <Plus size={20}/> <span>Nuovo Ingrediente</span>
                </button>

                {/* Lista ingredienti esistenti */}
                <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-hide">
                  {ingredients
                    .filter(ing => ing.name.toLowerCase().includes(addIngredientSearch.toLowerCase()))
                    .map(ing => (
                      <button
                        key={ing.id}
                        onClick={() => {
                          setShowAddIngredientModal(false);
                          setAddIngredientSearch('');
                          setAddIngredientModalScreen('search');
                        }}
                        className="w-full p-4 rounded-2xl text-left bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm active:scale-95 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black text-sm text-black">{ing.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{ing.category}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  
                  {/* Messaggio nessun risultato */}
                  {ingredients.filter(ing => ing.name.toLowerCase().includes(addIngredientSearch.toLowerCase())).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm font-bold">Nessun risultato trovato</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECONDA SCHERMATA: Form nuovo ingrediente (stile EconomatoView) */}
            {addIngredientModalScreen === 'form' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome Ingrediente</label>
                  <input 
                    placeholder="Esempio: Farina Tipo 0" 
                    className="w-full bg-gray-50 border-none rounded-2xl p-5 text-lg font-black" 
                    value={newIngredientForm.name || ''} 
                    onChange={e => setNewIngredientForm({...newIngredientForm, name: e.target.value})}
                    onBlur={e => setNewIngredientForm({...newIngredientForm, name: normalizeText(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Categoria</label>
                  <div className="flex flex-wrap gap-2">
                    {ingredientCategories.map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => { setNewIngredientForm({...newIngredientForm, category: cat}); setIsAddingNewCategoryIng(false); }}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newIngredientForm.category === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}
                      >
                        {cat}
                      </button>
                    ))}
                    <button 
                      onClick={() => setIsAddingNewCategoryIng(true)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center space-x-1 ${isAddingNewCategoryIng ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-400'}`}
                    >
                      <Plus size={12}/> <span>Nuova</span>
                    </button>
                  </div>
                  {isAddingNewCategoryIng && (
                    <input 
                      autoFocus
                      placeholder="Nome nuova categoria..." 
                      className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-blue-100 border mt-2" 
                      value={newIngredientForm.category || ''} 
                      onChange={e => setNewIngredientForm({...newIngredientForm, category: e.target.value})} 
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Costo (€)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-300">€</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        className="w-full bg-gray-50 border-none rounded-2xl p-5 pl-10 text-xl font-black" 
                        value={newIngredientForm.pricePerUnit || ''} 
                        onChange={e => setNewIngredientForm({...newIngredientForm, pricePerUnit: parseFloat(e.target.value) || 0})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Unità di Misura</label>
                    <div className="flex bg-gray-50 rounded-2xl p-1">
                      {(['kg', 'l', 'unit'] as Unit[]).map(u => (
                        <button 
                          key={u} 
                          onClick={() => setNewIngredientForm({...newIngredientForm, unit: u})}
                          className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${newIngredientForm.unit === u ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
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
                    {onAddSupplier && (
                      <button 
                        onClick={() => setShowSupModal(true)} 
                        className="text-blue-500 text-[10px] font-black uppercase flex items-center space-x-1"
                      >
                        <PlusCircle size={12}/> <span>Nuovo Fornitore</span>
                      </button>
                    )}
                  </div>
                  <select 
                    className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold appearance-none" 
                    value={newIngredientForm.supplierId || ''} 
                    onChange={e => setNewIngredientForm({...newIngredientForm, supplierId: e.target.value})}
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
                  <p className="text-3xl font-black text-black">€ {newIngredientForm.pricePerUnit?.toFixed(2) || '0.00'} <span className="text-sm text-gray-300">/ {newIngredientForm.unit?.toUpperCase() || 'KG'}</span></p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setAddIngredientModalScreen('search');
                      setNewIngredientForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
                      setIsAddingNewCategoryIng(false);
                    }}
                    className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-[2rem] font-black shadow-sm active:scale-95 transition-all"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={async () => {
                      if (!newIngredientForm.name || !newIngredientForm.category || !newIngredientForm.pricePerUnit) {
                        alert("Compila tutti i campi obbligatori");
                        return;
                      }
                      if (onAddIngredient) {
                        const ingredientToSave = { ...newIngredientForm, name: normalizeText(newIngredientForm.name || '') } as Ingredient;
                        const newId = await onAddIngredient(ingredientToSave);
                        if (newId) {
                          setShowAddIngredientModal(false);
                          setAddIngredientSearch('');
                          setAddIngredientModalScreen('search');
                          setNewIngredientForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
                          setIsAddingNewCategoryIng(false);
                        }
                      }
                    }}
                    className="flex-1 py-5 bg-black text-white rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2"
                  >
                    <Save size={20}/>
                    <span>Salva in Economato</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal nuovo fornitore */}
      {showSupModal && onAddSupplier && (
        <div className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4">
            <h4 className="font-black text-xl tracking-tight">Nuovo Fornitore Rapido</h4>
            <div className="space-y-3">
              <input 
                placeholder="Azienda" 
                className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" 
                value={supForm.name || ''} 
                onChange={e => setSupForm({...supForm, name: e.target.value})} 
                onBlur={e => setSupForm({...supForm, name: normalizeText(e.target.value)})}
              />
              <input 
                placeholder="Telefono" 
                className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" 
                value={supForm.phone || ''} 
                onChange={e => setSupForm({...supForm, phone: e.target.value})} 
              />
            </div>
            <div className="flex space-x-2 pt-2">
              <button 
                onClick={() => setShowSupModal(false)} 
                className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-400"
              >
                Annulla
              </button>
              <button 
                onClick={async () => {
                  if (!supForm.name) return;
                  setSupLoading(true);
                  try {
                    const newId = await onAddSupplier(supForm as Supplier);
                    if (newId) {
                      setNewIngredientForm({...newIngredientForm, supplierId: newId});
                      setShowSupModal(false);
                      setSupForm({ name: '', phone: '', category: '', deliveryDays: [] });
                    }
                  } finally {
                    setSupLoading(false);
                  }
                }}
                disabled={supLoading || !supForm.name}
                className="flex-1 py-4 bg-black text-white rounded-2xl font-black shadow-lg disabled:opacity-50"
              >
                {supLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal per selezionare ingrediente aggiuntivo - Stile come immagine 2 */}
      {showAdditionalIngredientModal && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => {
            // Click sul backdrop - chiedi conferma
            if (e.target === e.currentTarget) {
              if (window.confirm('Vuoi chiudere la selezione ingrediente e tornare alla ricetta?')) {
                setShowAdditionalIngredientModal(false);
                setAdditionalIngredientSearch('');
                setSelectedAdditionalCategory(null);
              }
            }
          }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black tracking-tight">Aggiungi Ingrediente</h3>
              <button
                onClick={() => {
                  setShowAdditionalIngredientModal(false);
                  setAdditionalIngredientSearch('');
                  setSelectedAdditionalCategory(null);
                }}
                className="bg-gray-100 p-2 rounded-full text-gray-400 hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Barra di ricerca */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cerca ingrediente o semilavorato..."
                className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                value={additionalIngredientSearch}
                onChange={(e) => setAdditionalIngredientSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Filtri categoria */}
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedAdditionalCategory(null)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  selectedAdditionalCategory === null
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                Tutti
              </button>
              {Array.from(new Set(availableIngredientsForSelect.map(i => i.category))).filter(Boolean).sort().map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedAdditionalCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    selectedAdditionalCategory === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Pulsante nuovo ingrediente */}
            <button
              onClick={() => {
                setShowAdditionalIngredientModal(false);
                setShowAddIngredientModal(true);
              }}
              className="w-full p-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-bold text-sm flex items-center justify-center space-x-2 hover:border-blue-300 hover:bg-blue-50 transition-all mb-4"
            >
              <Plus size={20} />
              <span>Nuovo Ingrediente</span>
            </button>

            {/* Lista ingredienti */}
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {(() => {
                const filtered = availableIngredientsForSelect.filter(ing => {
                  const matchesSearch = !additionalIngredientSearch ||
                    ing.name.toLowerCase().includes(additionalIngredientSearch.toLowerCase());
                  const matchesCategory = !selectedAdditionalCategory ||
                    ing.category === selectedAdditionalCategory;
                  return matchesSearch && matchesCategory;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-sm font-bold">Nessun ingrediente trovato</p>
                    </div>
                  );
                }

                return filtered.map(ing => (
                  <button
                    key={ing.id}
                    onClick={() => {
                      handleAddAdditionalIngredientWithValue(ing.id, 1.0);
                      setShowAdditionalIngredientModal(false);
                      setAdditionalIngredientSearch('');
                      setSelectedAdditionalCategory(null);
                    }}
                    className="w-full p-4 rounded-2xl text-left bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md active:scale-[0.98] transition-all"
                  >
                    <p className="font-black text-sm text-black">{ing.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{ing.category}</p>
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdvancedDoughCalculator;

