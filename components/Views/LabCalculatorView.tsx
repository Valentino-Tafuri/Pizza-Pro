import React, { useState, useEffect, useMemo } from 'react';
import { Printer, Calculator, Search, Plus, X, Edit2, Trash2, AlertTriangle, Check } from 'lucide-react';
import { Ingredient, SubRecipe, ComponentUsage, Supplier, Unit } from '../../types';
import { normalizeText } from '../../utils/textUtils';
import { calculateSubRecipeCostPerKg } from '../../services/calculator';

interface LabCalculatorViewProps {
  ingredients: Ingredient[];
  subRecipes: SubRecipe[];
  suppliers: Supplier[];
  onAdd: (sub: SubRecipe) => void;
  onUpdate?: (sub: SubRecipe) => void;
  onDelete?: (id: string) => void;
  onAddIngredient?: (ing: Ingredient) => Promise<string | undefined>;
  onAddSupplier?: (sup: Supplier) => Promise<string | undefined>;
}

interface RecipeResult {
  prefFlour: number;
  prefWater: number;
  prefYeast: number;
  mainFlour: number;
  mainWater: number;
  autolyseWater?: number;
  salt: number;
  oil: number;
  mainYeast: number;
  malt: number;
  totalWeight: number;
}

const LabCalculatorView: React.FC<LabCalculatorViewProps> = ({ ingredients, subRecipes, suppliers, onAdd, onUpdate, onDelete, onAddIngredient, onAddSupplier }) => {
  const totalFlour = 1000; // Base fissa
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('Pizza');
  const [portionWeight, setPortionWeight] = useState(250); // Peso porzione in grammi (default 250g)
  const [selectedFlourId, setSelectedFlourId] = useState<string | null>(null); // ID della farina selezionata (per retrocompatibilità)
  
  // Gestione farine multiple con percentuali
  interface FlourSelection {
    id: string;
    percentage: number;
  }
  const [flourSelections, setFlourSelections] = useState<FlourSelection[]>([]);
  const [showAddFlourModal, setShowAddFlourModal] = useState(false);
  const [showFlourSelectModal, setShowFlourSelectModal] = useState<'preferment' | 'autolyse' | 'remaining' | null>(null);
  const [flourSelectSearch, setFlourSelectSearch] = useState('');
  const [showNewFlourForm, setShowNewFlourForm] = useState(false);
  const [newFlourForm, setNewFlourForm] = useState<Partial<Ingredient>>({ 
    name: '', 
    unit: 'kg', 
    pricePerUnit: 0, 
    category: 'Farine', 
    supplierId: '' 
  });
  const [isAddingNewCategoryFlour, setIsAddingNewCategoryFlour] = useState(false);
  
  // Form manuale
  const [form, setForm] = useState<Partial<SubRecipe>>({ 
    components: [], 
    initialWeight: 0, 
    yieldWeight: 0,
    category: '',
    portionWeight: 250
  });
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
  const [isAddingNewCategoryForm, setIsAddingNewCategoryForm] = useState(false);
  const [isAddingNewCategoryIng, setIsAddingNewCategoryIng] = useState(false);
  
  // Wizard per ingredienti mancanti
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);
  const [currentMissingIdx, setCurrentMissingIdx] = useState(-1);
  const [wizardIng, setWizardIng] = useState<Partial<Ingredient>>({ unit: 'kg' });
  const [showSupModal, setShowSupModal] = useState(false);
  const [supForm, setSupForm] = useState<Partial<Supplier>>({ deliveryDays: [] });
  const [supLoading, setSupLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Calcolatore state
  const [hydrationTotal, setHydrationTotal] = useState(70);
  const [usePreferment, setUsePreferment] = useState(false);
  const [prefType, setPrefType] = useState<'biga' | 'poolish'>('biga');
  const [prefPercentage, setPrefPercentage] = useState(30);
  // Farine per prefermento (multiple con percentuali)
  interface FlourSelectionWithPct {
    id: string;
    percentage: number;
  }
  const [prefFlourSelections, setPrefFlourSelections] = useState<FlourSelectionWithPct[]>([]);
  const [useAutolyse, setUseAutolyse] = useState(false);
  // Farine per autolisi (multiple con percentuali)
  const [autolyseFlourSelections, setAutolyseFlourSelections] = useState<FlourSelectionWithPct[]>([]);
  // Farine rimanenti per chiusura impasto
  const [remainingFlourSelections, setRemainingFlourSelections] = useState<FlourSelectionWithPct[]>([]);
  const [autolyseHydration, setAutolyseHydration] = useState(60); // Idratazione autolisi
  const [autolysePercentage, setAutolysePercentage] = useState(100); // Percentuale farina per autolisi (sulla farina rimanente)
  const [saltPercent, setSaltPercent] = useState(2.5);
  
  // Rimuovi farine duplicate quando si attiva prefermento/autolisi
  useEffect(() => {
    const prefFlourIds = prefFlourSelections.map(f => f.id);
    setFlourSelections(prev => prev.filter(f => !prefFlourIds.includes(f.id)));
  }, [prefFlourSelections]);
  
  useEffect(() => {
    const autolyseFlourIds = autolyseFlourSelections.map(f => f.id);
    setFlourSelections(prev => prev.filter(f => !autolyseFlourIds.includes(f.id)));
  }, [autolyseFlourSelections]);
  
  useEffect(() => {
    const remainingFlourIds = remainingFlourSelections.map(f => f.id);
    setFlourSelections(prev => prev.filter(f => !remainingFlourIds.includes(f.id)));
  }, [remainingFlourSelections]);
  const [oilPercent, setOilPercent] = useState(2);
  const [yeastPercent, setYeastPercent] = useState(0.7);
  const [maltPercent, setMaltPercent] = useState(0);
  
  // Ingredienti aggiuntivi
  interface AdditionalIngredient {
    id: string;
    quantity: number; // in grammi
    unit: string;
  }
  const [additionalIngredients, setAdditionalIngredients] = useState<AdditionalIngredient[]>([]);
  const [showAddIngredientModalCalc, setShowAddIngredientModalCalc] = useState(false);

  // Categorie predefinite
  const categories = ['Pizza', 'Pane', 'Dolci'];
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);

  // Trova le farine disponibili
  const availableFlours = useMemo(() => {
    return ingredients.filter(i => {
      const name = i.name.toLowerCase();
      const cat = i.category.toLowerCase();
      return name.includes('farina') || name.includes('flour') || cat.includes('farina') || cat.includes('farine');
    });
  }, [ingredients]);

  // Calcola la farina totale in base alle selezioni
  const totalFlourFromSelections = useMemo(() => {
    if (flourSelections.length === 0) return totalFlour; // Se non ci sono selezioni, usa il totale fisso
    const totalPercentage = flourSelections.reduce((sum, f) => sum + f.percentage, 0);
    if (totalPercentage !== 100) return totalFlour; // Se non somma a 100%, usa il totale fisso
    return totalFlour; // Il totale è sempre 1000g, le percentuali determinano le quantità
  }, [flourSelections]);

  // Trova gli ingredienti necessari (usa la prima farina selezionata o quella trovata automaticamente)
  const flourIngredient = flourSelections.length > 0
    ? ingredients.find(i => i.id === flourSelections[0].id)
    : selectedFlourId 
      ? ingredients.find(i => i.id === selectedFlourId)
      : ingredients.find(i => {
          const name = i.name.toLowerCase();
          return name.includes('farina') || name.includes('flour') || i.category.toLowerCase().includes('farina');
        });
  const waterIngredient = ingredients.find(i => {
    const name = i.name.toLowerCase();
    return name.includes('acqua') || name.includes('water') || i.category.toLowerCase().includes('acqua');
  });
  const saltIngredient = ingredients.find(i => {
    const name = i.name.toLowerCase();
    return name.includes('sale') || name.includes('salt') || i.category.toLowerCase().includes('sale');
  });
  const oilIngredient = ingredients.find(i => {
    const name = i.name.toLowerCase();
    return name.includes('olio') || name.includes('oil') || name.includes('evo') || i.category.toLowerCase().includes('olio');
  });
  const yeastIngredient = ingredients.find(i => {
    const name = i.name.toLowerCase();
    return name.includes('lievito') || name.includes('yeast') || i.category.toLowerCase().includes('lievito');
  });
  const maltIngredient = ingredients.find(i => {
    const name = i.name.toLowerCase();
    return name.includes('malto') || name.includes('malt') || i.category.toLowerCase().includes('malto');
  });

  const calculateRecipe = useMemo((): RecipeResult => {
    let prefFlour = 0;
    let prefWater = 0;
    let prefYeast = 0;
    let autolyseFlour = 0;
    let autolyseWater = 0;
    let mainFlour = totalFlour;

    // Calcola prefermento se attivo (con multiple farine)
    if (usePreferment && prefFlourSelections.length > 0 && prefPercentage > 0) {
      const prefPct = prefPercentage / 100;
      prefFlour = totalFlour * prefPct;
      mainFlour = mainFlour - prefFlour;

      if (prefType === 'biga') {
        prefWater = prefFlour * 0.45;
        prefYeast = prefFlour * 0.01;
      } else {
        prefWater = prefFlour * 1.0;
        prefYeast = prefFlour * 0.01;
      }
    }

    // Calcola autolisi se attiva (con multiple farine, proporzionale alla percentuale del prefermento)
    if (useAutolyse && autolyseFlourSelections.length > 0 && autolysePercentage > 0) {
      const autolyseFlourPct = usePreferment && prefPercentage > 0 ? prefPercentage : 100;
      autolyseFlour = (totalFlour * autolyseFlourPct * autolysePercentage) / 10000;
      autolyseWater = (autolyseFlour * autolyseHydration) / 100;
      mainFlour = mainFlour - autolyseFlour;
    }
    
    // Sottrai le farine rimanenti dalla farina principale
    const remainingFlourTotal = remainingFlourSelections.reduce((sum, f) => sum + (totalFlour * f.percentage / 100), 0);
    mainFlour = mainFlour - remainingFlourTotal;

    // Calcola acqua principale (escludendo prefermento e autolisi)
    const totalWaterNeeded = totalFlour * (hydrationTotal / 100);
    let mainWater = totalWaterNeeded - prefWater - autolyseWater;
    if (mainWater < 0) mainWater = 0;

    const salt = totalFlour * (saltPercent / 100);
    const oil = totalFlour * (oilPercent / 100);
    const mainYeast = totalFlour * (yeastPercent / 100);
    const malt = usePreferment ? totalFlour * (maltPercent / 100) : 0;

    // Calcola peso totale includendo ingredienti aggiuntivi
    const additionalWeight = additionalIngredients.reduce((sum, ing) => {
      const ingredient = ingredients.find(i => i.id === ing.id);
      if (!ingredient) return sum;
      const multiplier = (ingredient.unit === 'kg' || ingredient.unit === 'l') ? 1 : 0.001;
      return sum + (ing.quantity * multiplier);
    }, 0);

    const totalWeight = totalFlour + prefWater + mainWater + autolyseWater + salt + oil + mainYeast + malt + prefYeast + additionalWeight;

    return {
      prefFlour,
      prefWater,
      prefYeast,
      mainFlour,
      mainWater,
      autolyseWater: useAutolyse ? autolyseWater : undefined,
      salt,
      oil,
      mainYeast,
      malt,
      totalWeight
    };
  }, [usePreferment, prefType, prefPercentage, prefFlourSelections, useAutolyse, autolyseFlourSelections, autolyseHydration, autolysePercentage, remainingFlourSelections, hydrationTotal, saltPercent, oilPercent, yeastPercent, maltPercent, totalFlour, additionalIngredients, ingredients]);

  const calculateCost = (ingredient: Ingredient | undefined, quantity: number): number => {
    if (!ingredient) return 0;
    const multiplier = (ingredient.unit === 'kg' || ingredient.unit === 'l') ? 0.001 : 1;
    return ingredient.pricePerUnit * quantity * multiplier;
  };

  const totalCost = useMemo(() => {
    let cost = 0;
    
    // Calcola il costo della farina principale in base alle selezioni multiple
    if (flourSelections.length > 0) {
      const totalPercentage = flourSelections.reduce((sum, f) => sum + f.percentage, 0);
      if (totalPercentage === 100) {
        flourSelections.forEach(flourSel => {
          const flour = ingredients.find(i => i.id === flourSel.id);
          if (flour) {
            const flourQuantity = (totalFlour * flourSel.percentage) / 100;
            cost += calculateCost(flour, flourQuantity);
          }
        });
      }
    }
    
    // Costo farina prefermento (multiple farine con percentuali)
    if (usePreferment && prefFlourSelections.length > 0) {
      const prefPct = prefPercentage / 100;
      prefFlourSelections.forEach(flourSel => {
        const flour = ingredients.find(i => i.id === flourSel.id);
        if (flour) {
          const flourQty = (totalFlour * prefPct * flourSel.percentage) / 100;
          cost += calculateCost(flour, flourQty);
        }
      });
    }
    
    // Costo farina autolisi (multiple farine con percentuali)
    if (useAutolyse && autolyseFlourSelections.length > 0) {
      const autolyseFlourPct = usePreferment && prefPercentage > 0 ? prefPercentage : 100;
      autolyseFlourSelections.forEach(flourSel => {
        const flour = ingredients.find(i => i.id === flourSel.id);
        if (flour) {
          const flourQty = (totalFlour * autolyseFlourPct * autolysePercentage * flourSel.percentage) / 1000000;
          cost += calculateCost(flour, flourQty);
        }
      });
    }
    
    // Costo farine rimanenti per chiusura impasto
    remainingFlourSelections.forEach(flourSel => {
      const flour = ingredients.find(i => i.id === flourSel.id);
      if (flour) {
        const flourQty = (totalFlour * flourSel.percentage) / 100;
        cost += calculateCost(flour, flourQty);
      }
    });
    
    cost += calculateCost(waterIngredient, calculateRecipe.prefWater + calculateRecipe.mainWater);
    cost += calculateCost(saltIngredient, calculateRecipe.salt);
    cost += calculateCost(oilIngredient, calculateRecipe.oil);
    cost += calculateCost(yeastIngredient, calculateRecipe.prefYeast + calculateRecipe.mainYeast);
    if (usePreferment) {
      cost += calculateCost(maltIngredient, calculateRecipe.malt);
    }
    
    // Costo ingredienti aggiuntivi
    additionalIngredients.forEach(ing => {
      const ingredient = ingredients.find(i => i.id === ing.id);
      if (ingredient) {
        cost += calculateCost(ingredient, ing.quantity);
      }
    });
    
    return cost;
  }, [calculateRecipe, flourSelections, totalFlour, prefFlourSelections, autolyseFlourSelections, remainingFlourSelections, prefPercentage, autolysePercentage, usePreferment, useAutolyse, ingredients, waterIngredient, saltIngredient, oilIngredient, yeastIngredient, maltIngredient, additionalIngredients]);

  const costPerKg = calculateRecipe.totalWeight > 0 ? (totalCost / (calculateRecipe.totalWeight / 1000)) : 0;

  const filteredSubRecipes = useMemo(() => {
    return subRecipes.filter(s => {
      // Mostra solo ricette con categoria Pizza, Pane o Dolci (ricette del laboratorio)
      const isLabRecipe = categories.includes(s.category);
      if (!isLabRecipe) return false;
      
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? s.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [subRecipes, searchTerm, selectedCategory, categories]);

  const checkMissingIngredients = (): string[] => {
    const missing: string[] = [];
    // Verifica le farine selezionate
    if (flourSelections.length > 0) {
      const totalPercentage = flourSelections.reduce((sum, f) => sum + f.percentage, 0);
      if (totalPercentage !== 100) {
        missing.push('Farina (percentuali devono sommare a 100%)');
      } else {
        // Verifica che tutte le farine selezionate esistano
        flourSelections.forEach(flourSel => {
          const flour = ingredients.find(i => i.id === flourSel.id);
          if (!flour) missing.push(`Farina ${flourSel.id}`);
        });
      }
    } else {
      // Verifica la farina selezionata o quella trovata automaticamente
      const currentFlour = selectedFlourId 
        ? ingredients.find(i => i.id === selectedFlourId)
        : flourIngredient;
      if (!currentFlour) missing.push('Farina');
    }
    if (!waterIngredient) missing.push('Acqua');
    if (!saltIngredient) missing.push('Sale');
    if (calculateRecipe.oil > 0 && !oilIngredient) missing.push('Olio');
    if (!yeastIngredient) missing.push('Lievito');
    if (usePreferment && calculateRecipe.malt > 0 && !maltIngredient) missing.push('Malto');
    return missing;
  };

  const handleEdit = (recipe: SubRecipe) => {
    setEditingId(recipe.id);
    setShowCalculator(false);
    setShowManualForm(true);
    setForm({
      name: recipe.name,
      category: recipe.category,
      components: recipe.components || [],
      initialWeight: recipe.initialWeight || 0,
      yieldWeight: recipe.yieldWeight || 0,
      portionWeight: recipe.portionWeight || 250,
      procedure: recipe.procedure
    });
  };

  const handleCreateRecipe = () => {
    if (!recipeName.trim()) {
      alert('Inserisci un nome per la ricetta');
      return;
    }

    // Verifica che ci siano farine selezionate
    if (flourSelections.length === 0) {
      alert('Aggiungi almeno una farina alla composizione');
      return;
    }

    // Verifica che le percentuali sommino a 100%
    const totalPercentage = flourSelections.reduce((sum, f) => sum + f.percentage, 0);
    if (totalPercentage !== 100) {
      alert(`Le percentuali delle farine devono sommare esattamente a 100% (attuale: ${totalPercentage}%)`);
      return;
    }

    // Verifica che tutte le farine selezionate esistano
    const missingFlours = flourSelections.filter(fs => !ingredients.find(i => i.id === fs.id));
    if (missingFlours.length > 0 && onAddIngredient) {
      setMissingIngredients(['Farina']);
      setCurrentMissingIdx(0);
      setWizardIng({ name: 'Farina', unit: 'kg', category: 'Farine' });
      return;
    }

    // Verifica altri ingredienti mancanti
    const missing = checkMissingIngredients();
    if (missing.length > 0 && onAddIngredient) {
      setMissingIngredients(missing);
      setCurrentMissingIdx(0);
      setWizardIng({ name: missing[0], unit: 'kg' });
      return;
    }

    saveRecipe();
  };

  const saveRecipe = () => {
    // Crea i componenti dalla ricetta calcolata
    const components: ComponentUsage[] = [];
    
    // Aggiungi farine principali (composizione)
    if (flourSelections.length > 0) {
      const totalPercentage = flourSelections.reduce((sum, f) => sum + f.percentage, 0);
      if (totalPercentage === 100) {
        flourSelections.forEach(flourSel => {
          const flour = ingredients.find(i => i.id === flourSel.id);
          if (flour) {
            const flourQuantity = ((calculateRecipe.prefFlour + calculateRecipe.mainFlour) * flourSel.percentage) / 100;
            components.push({
              id: flour.id,
              type: 'ingredient',
              quantity: flourQuantity
            });
          }
        });
      }
    }
    
    // Aggiungi farine prefermento (multiple con percentuali)
    if (usePreferment && prefFlourSelections.length > 0) {
      const prefPct = prefPercentage / 100;
      prefFlourSelections.forEach(flourSel => {
        const flour = ingredients.find(i => i.id === flourSel.id);
        if (flour) {
          const flourQty = (totalFlour * prefPct * flourSel.percentage) / 100;
          components.push({
            id: flour.id,
            type: 'ingredient',
            quantity: flourQty
          });
        }
      });
    }
    
    // Aggiungi farine autolisi (multiple con percentuali)
    if (useAutolyse && autolyseFlourSelections.length > 0) {
      const autolyseFlourPct = usePreferment && prefPercentage > 0 ? prefPercentage : 100;
      autolyseFlourSelections.forEach(flourSel => {
        const flour = ingredients.find(i => i.id === flourSel.id);
        if (flour) {
          const flourQty = (totalFlour * autolyseFlourPct * autolysePercentage * flourSel.percentage) / 1000000;
          components.push({
            id: flour.id,
            type: 'ingredient',
            quantity: flourQty
          });
        }
      });
    }
    
    // Aggiungi farine rimanenti per chiusura impasto
    remainingFlourSelections.forEach(flourSel => {
      const flour = ingredients.find(i => i.id === flourSel.id);
      if (flour) {
        const flourQty = (totalFlour * flourSel.percentage) / 100;
        components.push({
          id: flour.id,
          type: 'ingredient',
          quantity: flourQty
        });
      }
    });
    
    // Acqua
    const currentWaterIng = ingredients.find(i => i.id === waterIngredient?.id || (i.name.toLowerCase().includes('acqua') || i.name.toLowerCase().includes('water')));
    if (currentWaterIng) {
      components.push({
        id: currentWaterIng.id,
        type: 'ingredient',
        quantity: calculateRecipe.prefWater + calculateRecipe.mainWater
      });
    }
    
    // Sale
    const currentSaltIng = ingredients.find(i => i.id === saltIngredient?.id || (i.name.toLowerCase().includes('sale') || i.name.toLowerCase().includes('salt')));
    if (currentSaltIng) {
      components.push({
        id: currentSaltIng.id,
        type: 'ingredient',
        quantity: calculateRecipe.salt
      });
    }
    
    // Olio
    const currentOilIng = ingredients.find(i => i.id === oilIngredient?.id || (i.name.toLowerCase().includes('olio') || i.name.toLowerCase().includes('oil')));
    if (currentOilIng && calculateRecipe.oil > 0) {
      components.push({
        id: currentOilIng.id,
        type: 'ingredient',
        quantity: calculateRecipe.oil
      });
    }
    
    // Lievito
    const currentYeastIng = ingredients.find(i => i.id === yeastIngredient?.id || (i.name.toLowerCase().includes('lievito') || i.name.toLowerCase().includes('yeast')));
    if (currentYeastIng) {
      components.push({
        id: currentYeastIng.id,
        type: 'ingredient',
        quantity: calculateRecipe.prefYeast + calculateRecipe.mainYeast
      });
    }
    
    // Malto
    const currentMaltIng = ingredients.find(i => i.id === maltIngredient?.id || (i.name.toLowerCase().includes('malto') || i.name.toLowerCase().includes('malt')));
    if (currentMaltIng && usePreferment && calculateRecipe.malt > 0) {
      components.push({
        id: currentMaltIng.id,
        type: 'ingredient',
        quantity: calculateRecipe.malt
      });
    }
    
    // Ingredienti aggiuntivi
    additionalIngredients.forEach(ing => {
      components.push({
        id: ing.id,
        type: 'ingredient',
        quantity: ing.quantity
      });
    });

    // Genera procedura
    let procedure = '';
    if (usePreferment && prefFlourSelections.length > 0) {
      const prefFlourNames = prefFlourSelections.map(f => {
        const flour = ingredients.find(i => i.id === f.id);
        return `${f.percentage}% ${flour?.name || 'farina'}`;
      }).join(', ');
      procedure += `Pre-fermento ${prefType === 'biga' ? 'Biga' : 'Poolish'}: ${Math.round(calculateRecipe.prefFlour)}g (${prefFlourNames}), ${Math.round(calculateRecipe.prefWater)}g acqua, ${calculateRecipe.prefYeast.toFixed(1)}g lievito. `;
    }
    if (useAutolyse && autolyseFlourSelections.length > 0) {
      const autFlourNames = autolyseFlourSelections.map(f => {
        const flour = ingredients.find(i => i.id === f.id);
        const autolyseFlourPct = usePreferment && prefPercentage > 0 ? prefPercentage : 100;
        const flourQty = (totalFlour * autolyseFlourPct * autolysePercentage * f.percentage) / 1000000;
        return `${Math.round(flourQty)}g ${flour?.name || 'farina'} (${f.percentage}%)`;
      }).join(', ');
      const autFlourQty = (totalFlour * (usePreferment && prefPercentage > 0 ? prefPercentage : 100) * autolysePercentage) / 10000;
      const autWaterQty = (autFlourQty * autolyseHydration) / 100;
      procedure += `Autolisi: ${autFlourNames}, ${Math.round(autWaterQty)}g acqua (${autolyseHydration}% idratazione). `;
    }
    procedure += `Chiusura: ${Math.round(calculateRecipe.mainFlour)}g farina, ${Math.round(calculateRecipe.mainWater)}g acqua, ${Math.round(calculateRecipe.salt)}g sale, ${Math.round(calculateRecipe.oil)}g olio, ${calculateRecipe.mainYeast.toFixed(1)}g lievito`;
    if (usePreferment && calculateRecipe.malt > 0) {
      procedure += `, ${calculateRecipe.malt.toFixed(1)}g malto`;
    }
    procedure += '.';
    if (additionalIngredients.length > 0) {
      procedure += ' Ingredienti aggiuntivi: ';
      additionalIngredients.forEach((ing, idx) => {
        const ingredient = ingredients.find(i => i.id === ing.id);
        if (ingredient) {
          procedure += `${ing.quantity}${ingredient.unit} ${ingredient.name}`;
          if (idx < additionalIngredients.length - 1) procedure += ', ';
        }
      });
      procedure += '.';
    }

    const subRecipe: SubRecipe = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: recipeName,
      category: recipeCategory,
      components: components,
      initialWeight: calculateRecipe.totalWeight / 1000,
      yieldWeight: calculateRecipe.totalWeight / 1000,
      portionWeight: portionWeight,
      procedure: procedure
    };

    if (editingId && onUpdate) {
      onUpdate(subRecipe);
    } else {
      onAdd(subRecipe);
    }
    
    resetCalculator();
  };

  const saveWizardIngredient = async () => {
    if (!wizardIng.name || !wizardIng.pricePerUnit || !wizardIng.category) {
      alert('Compila tutti i campi obbligatori');
      return;
    }
    if (!wizardIng.supplierId) {
      alert('Seleziona un fornitore obbligatorio');
      return;
    }
    if (!onAddIngredient) return;
    
    const newId = await onAddIngredient(wizardIng as Ingredient);
    if (newId) {
      // Se la farina è stata aggiunta, aggiungila alle selezioni se siamo nel calcolatore
      if (wizardIng.name.toLowerCase().includes('farina') || wizardIng.category.toLowerCase().includes('farina') || wizardIng.category.toLowerCase().includes('farine')) {
        if (showCalculator) {
          // Se siamo nel calcolatore, aggiungi la farina alle selezioni
          const totalPercentage = flourSelections.reduce((sum, f) => sum + f.percentage, 0);
          const remainingPercentage = 100 - totalPercentage;
          setFlourSelections([...flourSelections, { id: newId, percentage: remainingPercentage > 0 ? remainingPercentage : 0 }]);
        } else {
          // Altrimenti usa il sistema vecchio
          setSelectedFlourId(newId);
        }
      }
      
      if (currentMissingIdx < missingIngredients.length - 1) {
        const nextIdx = currentMissingIdx + 1;
        setCurrentMissingIdx(nextIdx);
        setWizardIng({ name: missingIngredients[nextIdx], unit: 'kg' });
      } else {
        setMissingIngredients([]);
        setCurrentMissingIdx(-1);
        // Continua con il salvataggio della ricetta
        if (showCalculator) {
          saveRecipe();
        }
      }
    }
  };

  const handleQuickSup = async () => {
    if (!supForm.name || !onAddSupplier) return;
    setSupLoading(true);
    try {
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
    } finally {
      setSupLoading(false);
    }
  };

  const resetCalculator = () => {
    setShowCalculator(false);
    setEditingId(null);
    setRecipeName('');
    setRecipeCategory('Pizza');
    setPortionWeight(250);
    setSelectedFlourId(null);
    setHydrationTotal(70);
    setUsePreferment(false);
    setPrefType('biga');
    setPrefPercentage(30);
    setSaltPercent(2.5);
    setOilPercent(2);
    setYeastPercent(0.7);
    setMaltPercent(0);
    setMissingIngredients([]);
    setCurrentMissingIdx(-1);
  };

  const resetForm = () => {
    setEditingId(null);
    setShowManualForm(false);
    setForm({ 
      components: [], 
      initialWeight: 0, 
      yieldWeight: 0,
      category: 'Pizza',
      portionWeight: 250
    });
    setIsAddingNewCategoryForm(false);
    setShowAddIngredientModal(false);
    setAddIngredientSearch('');
    setShowNewIngredientForm(false);
    setNewIngredientForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
    setIsAddingNewCategoryIng(false);
  };

  const handleSaveForm = () => {
    if (!form.name?.trim()) {
      alert('Inserisci un nome per la ricetta');
      return;
    }
    if (!form.category?.trim()) {
      alert('Seleziona una categoria');
      return;
    }
    if (!form.components || form.components.length === 0) {
      alert('Aggiungi almeno un ingrediente');
      return;
    }

    const totalWeight = form.components.reduce((acc, comp) => acc + (comp.quantity / 1000), 0);
    const subRecipe: SubRecipe = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: form.name,
      category: form.category,
      components: form.components,
      initialWeight: totalWeight,
      yieldWeight: totalWeight * (1 - (form.wastePercentage || 0) / 100),
      portionWeight: form.portionWeight || 250,
      procedure: form.procedure || ''
    };

    if (editingId && onUpdate) {
      onUpdate(subRecipe);
    } else {
      onAdd(subRecipe);
    }
    
    resetForm();
  };

  const ingredientCategories = useMemo(() => {
    return Array.from(new Set(ingredients.map(i => i.category))).filter(Boolean);
  }, [ingredients]);

  // Calcola automaticamente il peso iniziale quando cambiano i componenti
  useEffect(() => {
    if (editingId !== null || form.name) {
      const calculatedInitialWeight = form.components?.reduce((acc, comp) => {
        return acc + (comp.quantity / 1000); // converte da grammi a kg
      }, 0) || 0;
      
      if (Math.abs((form.initialWeight || 0) - calculatedInitialWeight) > 0.001) {
        setForm(prev => ({ ...prev, initialWeight: calculatedInitialWeight, yieldWeight: calculatedInitialWeight }));
      }
    }
  }, [form.components, editingId, form.name]);

  const renderForm = () => {
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

    const costPerKg = (form.yieldWeight || 0) > 0 ? totalCost / (form.yieldWeight || 1) : 0;

    return (
      <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
        <div className="px-6 pt-12 pb-4 flex justify-between items-center border-b border-gray-50">
          <h3 className="font-black text-2xl tracking-tight">{editingId ? 'Modifica Impasto' : 'Nuovo Impasto'}</h3>
          <button onClick={resetForm} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-40 scrollbar-hide">
          <input 
            type="text" 
            className="w-full bg-gray-50 border-none rounded-2xl p-5 text-2xl font-black" 
            value={form.name || ''} 
            onChange={e => setForm({...form, name: e.target.value})} 
            onBlur={e => setForm({...form, name: normalizeText(e.target.value)})} 
            placeholder="Nome Impasto" 
          />
          
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
                value={form.category || ''} 
                onChange={e => setForm({...form, category: e.target.value})} 
              />
            )}
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">Peso Porzione (g)</label>
            <input 
              type="number" 
              step="1"
              min="1"
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold" 
              value={form.portionWeight || 250} 
              onChange={e => setForm({...form, portionWeight: Math.max(1, parseInt(e.target.value) || 250)})} 
              placeholder="250"
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Ingredienti (g)</h4>
            {form.components?.map(c => {
              const item = ingredients.find(i => i.id === c.id) || subRecipes.find(s => s.id === c.id);
              let componentCost = 0;
              let costPerKgItem = 0;
              
              if (c.type === 'ingredient') {
                const ing = ingredients.find(i => i.id === c.id);
                if (ing) {
                  const multiplier = (ing.unit === 'kg' || ing.unit === 'l') ? 0.001 : 1;
                  componentCost = ing.pricePerUnit * c.quantity * multiplier;
                  costPerKgItem = ing.pricePerUnit;
                }
              } else if (c.type === 'subrecipe') {
                const nestedSub = subRecipes.find(s => s.id === c.id);
                if (nestedSub) {
                  const nestedCostPerKg = calculateSubRecipeCostPerKg(nestedSub, ingredients, subRecipes);
                  componentCost = nestedCostPerKg * (c.quantity / 1000);
                  costPerKgItem = nestedCostPerKg;
                }
              }
              
              const incidence = totalCost > 0 ? (componentCost / totalCost) * 100 : 0;
              
              return (
                <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="font-bold text-sm text-black block">{item?.name || 'Sync...'}</span>
                      <span className="text-[10px] text-gray-400 font-bold">€{costPerKgItem.toFixed(2)}/kg</span>
                    </div>
                    <div className="flex items-center bg-gray-50 px-3 py-2 rounded-xl">
                      <input 
                        type="number" 
                        step="0.1"
                        className="w-16 bg-transparent text-center font-black text-xs" 
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
              <Plus size={14}/> <span>Aggiungi Ingrediente</span>
            </button>
          </div>

          {form.components && form.components.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-gray-600">Peso Totale</span>
                <span className="text-xl font-black text-black">{(form.initialWeight || 0).toFixed(3)} kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-gray-600">Costo Totale</span>
                <span className="text-xl font-black text-black">€{totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-gray-600">Costo al Kg</span>
                <span className="text-xl font-black text-blue-600">€{costPerKg.toFixed(2)}</span>
              </div>
              {form.portionWeight && form.portionWeight > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm font-black text-gray-600">Costo per Porzione ({form.portionWeight}g)</span>
                  <span className="text-xl font-black text-purple-600">€{((costPerKg * form.portionWeight) / 1000).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          <button 
            onClick={handleSaveForm}
            className="w-full bg-black text-white py-5 rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all"
          >
            {editingId ? 'Salva Modifiche' : 'Crea Impasto'}
          </button>
        </div>
      </div>
    );
  };

  const renderCalculator = () => (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-2xl tracking-tight">{editingId ? 'Modifica Impasto' : 'Calcolatore Impasti'}</h3>
          <button onClick={() => resetCalculator()} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:bg-gray-200 transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* Nome e Categoria */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">Nome Ricetta</label>
            <input 
              type="text" 
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold" 
              value={recipeName} 
              onChange={e => setRecipeName(e.target.value)} 
              onBlur={e => setRecipeName(normalizeText(e.target.value))}
              placeholder="Es: Impasto Napoletano"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setRecipeCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    recipeCategory === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button 
                onClick={() => setIsAddingNewCategory(true)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center space-x-1 ${
                  isAddingNewCategory ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-400'
                }`}
              >
                <Plus size={12}/> <span>Nuova</span>
              </button>
            </div>
            {isAddingNewCategory && (
              <input 
                autoFocus
                placeholder="Nome nuova categoria..." 
                className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-blue-100 border mt-2" 
                value={recipeCategory} 
                onChange={e => { setRecipeCategory(e.target.value); setIsAddingNewCategory(false); }} 
              />
            )}
          </div>
          
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">Peso Porzione (g)</label>
            <input 
              type="number" 
              step="1"
              min="1"
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold" 
              value={portionWeight} 
              onChange={e => setPortionWeight(Math.max(1, parseInt(e.target.value) || 250))} 
              placeholder="250"
            />
            <p className="text-[9px] text-gray-400 font-bold mt-1 px-1">
              Peso di una singola porzione in grammi (es. 250g per una pizza)
            </p>
          </div>
        </div>

        {/* Calcolatore */}
        <div className="space-y-6">
          {/* 1. Pre-fermento */}
          <div>
            <h4 className="text-sm font-black text-black uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
              1. Pre-fermento
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                <input 
                  type="checkbox" 
                  id="usePreferment"
                  checked={usePreferment}
                  onChange={(e) => setUsePreferment(e.target.checked)}
                  className="w-5 h-5 accent-black cursor-pointer"
                />
                <label htmlFor="usePreferment" className="text-sm font-black text-black uppercase tracking-widest cursor-pointer flex-1">
                  Utilizza Pre-fermento
                </label>
              </div>

              {usePreferment && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <div>
                    <label className="block text-sm font-black text-black mb-2">Tipologia</label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setPrefType('biga')}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${prefType === 'biga' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        Biga (45% Idro, 1% Lievito)
                      </button>
                      <button
                        onClick={() => setPrefType('poolish')}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${prefType === 'poolish' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        Poolish (100% Idro, 1% Lievito)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-black mb-2">Farine per Pre-fermento</label>
                    <div className="space-y-2">
                      {prefFlourSelections.map((flourSel, idx) => {
                        const flour = ingredients.find(i => i.id === flourSel.id);
                        return (
                          <div key={idx} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-black text-black">{flour?.name || 'Farina...'}</p>
                              <p className="text-[10px] text-gray-400 font-bold">€{flour?.pricePerUnit.toFixed(2) || '0.00'}/kg</p>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={flourSel.percentage}
                              onChange={(e) => {
                                const newSelections = [...prefFlourSelections];
                                newSelections[idx].percentage = parseInt(e.target.value) || 0;
                                setPrefFlourSelections(newSelections);
                              }}
                              className="w-20 bg-gray-50 border-none rounded-xl p-2 text-sm font-bold text-center"
                            />
                            <span className="text-xs font-black text-gray-400">%</span>
                            <button
                              onClick={() => setPrefFlourSelections(prefFlourSelections.filter((_, i) => i !== idx))}
                              className="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-100 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => setShowFlourSelectModal('preferment')}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-gray-400">Aggiungi farina...</span>
                        <Plus size={18} className="text-gray-400" />
                      </button>
                      {prefFlourSelections.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 font-bold">Totale:</span>
                          <span className={`font-black ${prefFlourSelections.reduce((sum, f) => sum + f.percentage, 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {prefFlourSelections.reduce((sum, f) => sum + f.percentage, 0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-black mb-2">Percentuale Pre-fermento (%)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        step="5" 
                        value={prefPercentage}
                        onChange={(e) => setPrefPercentage(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-100 rounded-full appearance-none accent-black"
                      />
                      <span className="text-lg font-black text-black min-w-[60px] text-right">{prefPercentage}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Autolisi */}
          <div>
            <h4 className="text-sm font-black text-black uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
              2. Autolisi
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                <input 
                  type="checkbox" 
                  id="useAutolyse"
                  checked={useAutolyse}
                  onChange={(e) => setUseAutolyse(e.target.checked)}
                  className="w-5 h-5 accent-black cursor-pointer"
                />
                <label htmlFor="useAutolyse" className="text-sm font-black text-black uppercase tracking-widest cursor-pointer flex-1">
                  Utilizza Autolisi
                </label>
              </div>

              {useAutolyse && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <div>
                    <label className="block text-sm font-black text-black mb-2">Farine per Autolisi</label>
                    <div className="space-y-2">
                      {autolyseFlourSelections.map((flourSel, idx) => {
                        const flour = ingredients.find(i => i.id === flourSel.id);
                        return (
                          <div key={idx} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-black text-black">{flour?.name || 'Farina...'}</p>
                              <p className="text-[10px] text-gray-400 font-bold">€{flour?.pricePerUnit.toFixed(2) || '0.00'}/kg</p>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={flourSel.percentage}
                              onChange={(e) => {
                                const newSelections = [...autolyseFlourSelections];
                                newSelections[idx].percentage = parseInt(e.target.value) || 0;
                                setAutolyseFlourSelections(newSelections);
                              }}
                              className="w-20 bg-gray-50 border-none rounded-xl p-2 text-sm font-bold text-center"
                            />
                            <span className="text-xs font-black text-gray-400">%</span>
                            <button
                              onClick={() => setAutolyseFlourSelections(autolyseFlourSelections.filter((_, i) => i !== idx))}
                              className="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-100 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => setShowFlourSelectModal('autolyse')}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-gray-400">Aggiungi farina...</span>
                        <Plus size={18} className="text-gray-400" />
                      </button>
                      {autolyseFlourSelections.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 font-bold">Totale:</span>
                          <span className={`font-black ${autolyseFlourSelections.reduce((sum, f) => sum + f.percentage, 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {autolyseFlourSelections.reduce((sum, f) => sum + f.percentage, 0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-black mb-2">Percentuale Farina Autolisi (%)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5" 
                        value={autolysePercentage}
                        onChange={(e) => setAutolysePercentage(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-100 rounded-full appearance-none accent-black"
                      />
                      <span className="text-lg font-black text-black min-w-[60px] text-right">{autolysePercentage}%</span>
                    </div>
                    <p className="text-xs text-gray-400 font-bold mt-1">
                      {usePreferment && prefPercentage > 0 
                        ? `Proporzionale alla farina del prefermento (${prefPercentage}% della farina totale)`
                        : 'Calcolata sulla farina totale'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-black mb-2">Idratazione Autolisi (%)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="50" 
                        max="100" 
                        step="5" 
                        value={autolyseHydration}
                        onChange={(e) => setAutolyseHydration(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-100 rounded-full appearance-none accent-black"
                      />
                      <span className="text-lg font-black text-black min-w-[60px] text-right">{autolyseHydration}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Farina Totale e Composizione */}
          <div>
            <h4 className="text-sm font-black text-black uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
              3. Farina Totale
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-black mb-2">Farina Totale (g)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    value={totalFlour} 
                    readOnly 
                    className="flex-1 bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-600 cursor-not-allowed"
                  />
                  <span className="text-xs text-gray-400 font-bold">Base fissa</span>
                </div>
                
                {/* Selettore Farine Multiple */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Composizione Farine</label>
                    <span className={`text-xs font-black ${flourSelections.reduce((sum, f) => sum + f.percentage, 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {flourSelections.reduce((sum, f) => sum + f.percentage, 0)}%
                    </span>
                  </div>
                  
                  {flourSelections.map((flourSel, idx) => {
                    const flour = ingredients.find(i => i.id === flourSel.id);
                    const remainingPercentage = 100 - flourSelections.reduce((sum, f, i) => i !== idx ? sum + f.percentage : sum, 0);
                    
                    return (
                      <div key={flourSel.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <select
                            value={flourSel.id}
                            onChange={(e) => {
                              const newSelections = [...flourSelections];
                              newSelections[idx].id = e.target.value;
                              setFlourSelections(newSelections);
                            }}
                            className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-sm font-bold"
                          >
                            <option value="">Seleziona farina...</option>
                            {availableFlours.map(flour => (
                              <option key={flour.id} value={flour.id}>
                                {flour.name} - €{flour.pricePerUnit.toFixed(2)}/kg
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              setFlourSelections(flourSelections.filter((_, i) => i !== idx));
                            }}
                            className="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-100 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max={remainingPercentage}
                            step="0.1"
                            value={flourSel.percentage}
                            onChange={(e) => {
                              const newPercentage = Math.max(0, Math.min(remainingPercentage, parseFloat(e.target.value) || 0));
                              const newSelections = [...flourSelections];
                              newSelections[idx].percentage = newPercentage;
                              setFlourSelections(newSelections);
                            }}
                            className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-center"
                          />
                          <span className="text-xs font-black text-gray-400 w-8">%</span>
                          {flour && (
                            <span className="text-xs font-bold text-gray-500">
                              = {Math.round((totalFlour * flourSel.percentage) / 100)}g
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {prefFlourSelections.length === 0 && autolyseFlourSelections.length === 0 && (
                    <button
                      onClick={() => {
                        if (availableFlours.length === 0 && onAddIngredient) {
                          setMissingIngredients(['Farina']);
                          setCurrentMissingIdx(0);
                          setWizardIng({ name: 'Farina', unit: 'kg', category: 'Farine' });
                        } else {
                          setShowAddFlourModal(true);
                        }
                      }}
                      className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold text-sm flex items-center justify-center space-x-2 hover:border-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <Plus size={16} /> <span>Aggiungi Farina</span>
                    </button>
                  )}
                  
                  {flourSelections.reduce((sum, f) => sum + f.percentage, 0) !== 100 && flourSelections.length > 0 && (
                    <p className="text-xs text-red-500 font-bold text-center">
                      Le percentuali devono sommare a 100% (attuale: {flourSelections.reduce((sum, f) => sum + f.percentage, 0)}%)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Farine Rimanenti per Chiusura Impasto */}
          {(usePreferment || useAutolyse) && (
            <div>
              <h4 className="text-sm font-black text-black uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
                4. Farine Rimanenti (Chiusura Impasto)
              </h4>
              <div className="space-y-2">
                {remainingFlourSelections.map((flourSel, idx) => {
                  const flour = ingredients.find(i => i.id === flourSel.id);
                  return (
                    <div key={idx} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-black text-black">{flour?.name || 'Farina...'}</p>
                        <p className="text-[10px] text-gray-400 font-bold">€{flour?.pricePerUnit.toFixed(2) || '0.00'}/kg</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={flourSel.percentage}
                        onChange={(e) => {
                          const newSelections = [...remainingFlourSelections];
                          newSelections[idx].percentage = parseInt(e.target.value) || 0;
                          setRemainingFlourSelections(newSelections);
                        }}
                        className="w-20 bg-gray-50 border-none rounded-xl p-2 text-sm font-bold text-center"
                      />
                      <span className="text-xs font-black text-gray-400">%</span>
                      <button
                        onClick={() => setRemainingFlourSelections(remainingFlourSelections.filter((_, i) => i !== idx))}
                        className="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => setShowFlourSelectModal('remaining')}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-400">Aggiungi farina rimanente...</span>
                  <Plus size={18} className="text-gray-400" />
                </button>
                {remainingFlourSelections.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-bold">Totale:</span>
                    <span className="font-black text-gray-600">
                      {remainingFlourSelections.reduce((sum, f) => sum + f.percentage, 0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Parametri Impasto */}
          <div>
            <h4 className="text-sm font-black text-black uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
              {usePreferment || useAutolyse ? '5. Parametri Impasto' : '4. Parametri Impasto'}
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-black mb-2">Idratazione Totale Desiderata (%)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="50" 
                    max="90" 
                    step="1" 
                    value={hydrationTotal}
                    onChange={(e) => setHydrationTotal(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-100 rounded-full appearance-none accent-black"
                  />
                  <span className="text-lg font-black text-black min-w-[60px] text-right">{hydrationTotal}%</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => setHydrationTotal(60)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${hydrationTotal === 60 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>60% Classica</button>
                  <button onClick={() => setHydrationTotal(70)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${hydrationTotal === 70 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>70% Contemp.</button>
                  <button onClick={() => setHydrationTotal(80)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${hydrationTotal === 80 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>80% Alta Idr.</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-black mb-2">Sale (%)</label>
                <div className="flex items-center gap-4">
                  <input type="range" min="2.2" max="3.0" step="0.1" value={saltPercent} onChange={(e) => setSaltPercent(parseFloat(e.target.value))} className="flex-1 h-2 bg-gray-100 rounded-full appearance-none accent-black" />
                  <span className="text-lg font-black text-black min-w-[60px] text-right">{saltPercent.toFixed(1)}%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-black mb-2">Lievito di Birra Fresco in chiusura (%)</label>
                <div className="flex items-center gap-4">
                  <input type="range" min="0.1" max="2.0" step="0.1" value={yeastPercent} onChange={(e) => setYeastPercent(parseFloat(e.target.value))} className="flex-1 h-2 bg-gray-100 rounded-full appearance-none accent-black" />
                  <span className="text-lg font-black text-black min-w-[60px] text-right">{yeastPercent.toFixed(1)}%</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => setYeastPercent(0.3)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${yeastPercent === 0.3 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>0.3% Frigo</button>
                  <button onClick={() => setYeastPercent(0.7)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${yeastPercent === 0.7 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>0.7% 24h</button>
                  <button onClick={() => setYeastPercent(1.0)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${yeastPercent === 1.0 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>1% 12h</button>
                  <button onClick={() => setYeastPercent(2.0)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${yeastPercent === 2.0 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>2% 6h</button>
                </div>
              </div>

              {usePreferment && (
                <div>
                  <label className="block text-sm font-black text-black mb-2">Malto Diastasico (%)</label>
                  <div className="flex items-center gap-4">
                    <input type="range" min="0" max="0.5" step="0.1" value={maltPercent} onChange={(e) => setMaltPercent(parseFloat(e.target.value))} className="flex-1 h-2 bg-gray-100 rounded-full appearance-none accent-black" />
                    <span className="text-lg font-black text-black min-w-[60px] text-right">{maltPercent.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-gray-400 font-bold mt-2">*Consigliato in presenza di pre-fermenti</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-black text-black mb-2">Olio EVO (%)</label>
                <div className="flex items-center gap-4">
                  <input type="range" min="0" max="8" step="0.5" value={oilPercent} onChange={(e) => setOilPercent(parseFloat(e.target.value))} className="flex-1 h-2 bg-gray-100 rounded-full appearance-none accent-black" />
                  <span className="text-lg font-black text-black min-w-[60px] text-right">{oilPercent.toFixed(1)}%</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => setOilPercent(0)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${oilPercent === 0 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>0% Napoletana</button>
                  <button onClick={() => setOilPercent(2)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${oilPercent === 2 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>2% Contemporanea</button>
                  <button onClick={() => setOilPercent(4)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${oilPercent === 4 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>4% Teglia</button>
                  <button onClick={() => setOilPercent(8)} className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${oilPercent === 8 ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>8% Focaccia</button>
                </div>
              </div>
            </div>
          </div>

          {/* Risultati */}
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-black text-black uppercase tracking-widest">Anteprima Ricetta</h4>
            
            {usePreferment && prefFlourSelections.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">1° Step: Pre-fermento ({prefType === 'biga' ? 'Biga' : 'Poolish'})</div>
                <div className="space-y-2 text-sm">
                  <div className="space-y-1">
                    {prefFlourSelections.map((flourSel, idx) => {
                      const flour = ingredients.find(i => i.id === flourSel.id);
                      const prefPct = prefPercentage / 100;
                      const flourQty = (totalFlour * prefPct * flourSel.percentage) / 100;
                      return (
                        <div key={idx} className="flex justify-between">
                          <span className="text-gray-600">{flour?.name || 'Farina...'} ({flourSel.percentage}%)</span>
                          <span className="font-black">{Math.round(flourQty)} g</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between"><span className="text-gray-600">Acqua</span><span className="font-black">{Math.round(calculateRecipe.prefWater)} g</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Lievito</span><span className="font-black">{calculateRecipe.prefYeast.toFixed(1)} g</span></div>
                </div>
              </div>
            )}

            {useAutolyse && autolyseFlourSelections.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Autolisi</div>
                <div className="space-y-2 text-sm">
                  <div className="space-y-1">
                    {autolyseFlourSelections.map((flourSel, idx) => {
                      const flour = ingredients.find(i => i.id === flourSel.id);
                      const autolyseFlourPct = usePreferment && prefPercentage > 0 ? prefPercentage : 100;
                      const flourQty = (totalFlour * autolyseFlourPct * autolysePercentage * flourSel.percentage) / 1000000;
                      return (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{flour?.name || 'Farina...'} ({flourSel.percentage}%)</span>
                          <span className="font-black">{Math.round(flourQty)} g</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between"><span className="text-gray-600">Acqua</span><span className="font-black">{Math.round(calculateRecipe.autolyseWater || 0)} g</span></div>
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{usePreferment ? '2° Step: Chiusura' : useAutolyse ? 'Dopo Autolisi' : 'Impasto Diretto'}</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Farina</span><span className="font-black">{Math.round(calculateRecipe.mainFlour)} g</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Acqua Totale</span>
                  <span className="font-black">{Math.round(calculateRecipe.prefWater + calculateRecipe.mainWater + (calculateRecipe.autolyseWater || 0))} g</span>
                </div>
                <div className="pl-4 text-xs text-gray-500 space-y-1">
                  {calculateRecipe.prefWater > 0 && (
                    <div className="flex justify-between"><span>Acqua Prefermento</span><span>{Math.round(calculateRecipe.prefWater)} g</span></div>
                  )}
                  {(calculateRecipe.autolyseWater || 0) > 0 && (
                    <div className="flex justify-between"><span>Acqua Autolisi</span><span>{Math.round(calculateRecipe.autolyseWater || 0)} g</span></div>
                  )}
                  <div className="flex justify-between"><span>Acqua Restante</span><span>{Math.round(calculateRecipe.mainWater)} g</span></div>
                </div>
                <div className="flex justify-between"><span className="text-gray-600">Sale</span><span className="font-black">{Math.round(calculateRecipe.salt)} g</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Olio</span><span className="font-black">{Math.round(calculateRecipe.oil)} g</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Lievito</span><span className="font-black">{calculateRecipe.mainYeast.toFixed(1)} g</span></div>
                {usePreferment && calculateRecipe.malt > 0 && (
                  <div className="flex justify-between"><span className="text-gray-600">Malto</span><span className="font-black">{calculateRecipe.malt.toFixed(1)} g</span></div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-black">Peso Totale</span>
                <span className="text-xl font-black">{Math.round(calculateRecipe.totalWeight)} g</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-black text-blue-600">Costo al Kg</span>
                <span className="text-xl font-black text-blue-600">€{costPerKg.toFixed(2)}</span>
              </div>
              {portionWeight > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm font-black text-purple-600">Costo per Porzione ({portionWeight}g)</span>
                  <span className="text-xl font-black text-purple-600">€{((costPerKg * portionWeight) / 1000).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 5. Ingredienti Aggiuntivi */}
          <div>
            <h4 className="text-sm font-black text-black uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
              5. Ingredienti Aggiuntivi
            </h4>
            
            <div className="space-y-3">
              {additionalIngredients.map((ing, idx) => {
                const ingredient = ingredients.find(i => i.id === ing.id);
                return (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-sm text-black">{ingredient?.name || 'Ingrediente...'}</p>
                        <p className="text-xs text-gray-400 font-bold">{ingredient?.category || ''}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={ing.quantity}
                        onChange={(e) => {
                          const newIngredients = [...additionalIngredients];
                          newIngredients[idx].quantity = parseFloat(e.target.value) || 0;
                          setAdditionalIngredients(newIngredients);
                        }}
                        className="w-24 bg-gray-50 border-none rounded-xl p-2 text-sm font-bold text-center"
                      />
                      <span className="text-xs font-black text-gray-400 w-8">{ingredient?.unit || 'g'}</span>
                      <button
                        onClick={() => {
                          setAdditionalIngredients(additionalIngredients.filter((_, i) => i !== idx));
                        }}
                        className="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              <button
                onClick={() => setShowAddIngredientModalCalc(true)}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold text-sm flex items-center justify-center space-x-2 hover:border-gray-300 hover:text-gray-500 transition-colors"
              >
                <Plus size={16} /> <span>Aggiungi Ingrediente</span>
              </button>
            </div>
          </div>

          <button 
            onClick={handleCreateRecipe}
            className="w-full bg-black text-white py-5 rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Calculator size={20} />
            <span>{editingId ? 'Modifica Ricetta' : 'Crea Ricetta'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Cerca impasto..." 
          className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button 
            onClick={() => { 
              setEditingId(null);
              setRecipeName('');
              setRecipeCategory('Pizza');
              setPortionWeight(250);
              setHydrationTotal(70);
              setUsePreferment(false);
              setPrefType('biga');
              setPrefPercentage(30);
              setSaltPercent(2.5);
              setOilPercent(2);
              setYeastPercent(0.7);
              setMaltPercent(0);
              setSelectedFlourId(null);
              setShowCalculator(true);
            }} 
            className="bg-black text-white p-2 rounded-xl shadow-sm hover:bg-gray-800 transition-colors"
            title="Crea con Calcolatore"
          >
            <Calculator size={16} />
          </button>
          <button 
            onClick={() => { 
              setEditingId(null);
              setShowCalculator(false);
              setShowManualForm(true);
              setForm({ 
                components: [], 
                initialWeight: 0, 
                yieldWeight: 0,
                category: 'Pizza',
                portionWeight: 250,
                name: ''
              });
            }} 
            className="bg-black text-white p-2 rounded-xl shadow-sm hover:bg-gray-800 transition-colors"
            title="Crea Manualmente"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setSelectedCategory(null)}
          className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${
            !selectedCategory ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'
          }`}
        >
          Tutti
        </button>
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${
              selectedCategory === cat ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista Ricette */}
      <div className="space-y-3">
        {filteredSubRecipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[2.5rem] border border-gray-100">
            <Calculator className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-sm font-black text-gray-400 mb-2">Nessun impasto trovato</p>
            <p className="text-xs text-gray-300 font-bold">Crea il tuo primo impasto con il calcolatore</p>
          </div>
        ) : (
          filteredSubRecipes.map(recipe => (
            <div 
              key={recipe.id} 
              className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
              onClick={() => handleEdit(recipe)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-black text-lg tracking-tight mb-1">{recipe.name}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase">{recipe.category}</p>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {onUpdate && (
                    <button onClick={() => handleEdit(recipe)} className="bg-gray-50 p-3 rounded-2xl text-gray-400 border border-gray-100 hover:bg-gray-100 hover:text-black transition-colors">
                      <Edit2 size={18} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => setConfirmDeleteId(recipe.id)} className="bg-gray-50 p-3 rounded-2xl text-gray-400 border border-gray-100 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Calcolatore Popup */}
      {showCalculator && renderCalculator()}

      {/* Form Manuale */}
      {showManualForm && !showCalculator && renderForm()}

      {/* Modal Aggiungi Ingrediente per Calcolatore */}
      {showAddIngredientModalCalc && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tight">Aggiungi Ingrediente</h3>
              <button onClick={() => { setShowAddIngredientModalCalc(false); }} className="bg-gray-100 p-2 rounded-full text-gray-400">
                <X size={20}/>
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cerca ingrediente..." 
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" 
                value={addIngredientSearch} 
                onChange={(e) => setAddIngredientSearch(e.target.value)} 
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {ingredients
                .filter(ing => ing.name.toLowerCase().includes(addIngredientSearch.toLowerCase()))
                .map(ing => {
                  const alreadyAdded = additionalIngredients.some(a => a.id === ing.id);
                  return (
                    <button
                      key={ing.id}
                      onClick={() => {
                        if (!alreadyAdded) {
                          setAdditionalIngredients([...additionalIngredients, { id: ing.id, quantity: 100, unit: ing.unit }]);
                          setShowAddIngredientModalCalc(false);
                          setAddIngredientSearch('');
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
                          <Check className="text-gray-300" size={20}/>
                        )}
                      </div>
                    </button>
                  );
                })}
              
              <button
                onClick={() => {
                  setShowAddIngredientModalCalc(false);
                  if (onAddIngredient) {
                    setMissingIngredients(['Ingrediente']);
                    setCurrentMissingIdx(0);
                    setWizardIng({ name: '', unit: 'g' });
                  }
                }}
                className="w-full p-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-bold text-sm flex items-center justify-center space-x-2 hover:border-blue-300 hover:bg-blue-50 transition-all mt-4"
              >
                <Plus size={16}/> <span>Nuovo Ingrediente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aggiungi Ingrediente */}
      {showAddIngredientModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tight">Aggiungi Ingrediente</h3>
              <button onClick={() => { setShowAddIngredientModal(false); setAddIngredientSearch(''); setShowNewIngredientForm(false); }} className="bg-gray-100 p-2 rounded-full text-gray-400">
                <X size={20}/>
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cerca ingrediente..." 
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" 
                value={addIngredientSearch} 
                onChange={(e) => setAddIngredientSearch(e.target.value)} 
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {!showNewIngredientForm && (
                <button
                  onClick={() => setShowNewIngredientForm(true)}
                  className="w-full p-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-bold text-sm flex items-center justify-center space-x-2 hover:border-blue-300 hover:bg-blue-50 transition-all mb-4"
                >
                  <Plus size={16}/> <span>Nuovo Ingrediente</span>
                </button>
              )}

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
                        onChange={e => setNewIngredientForm({...newIngredientForm, unit: e.target.value as any})}
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="l">l</option>
                        <option value="ml">ml</option>
                        <option value="pz">pz</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fornitore *</label>
                    <div className="flex space-x-2">
                      <select 
                        className="flex-1 bg-white border-none rounded-2xl p-4 text-sm font-bold" 
                        value={newIngredientForm.supplierId || ''} 
                        onChange={e => setNewIngredientForm({...newIngredientForm, supplierId: e.target.value})}
                      >
                        <option value="">Seleziona fornitore...</option>
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
                      if (!newIngredientForm.supplierId) {
                        alert("Seleziona un fornitore obbligatorio");
                        return;
                      }
                      if (onAddIngredient) {
                        const id = await onAddIngredient(newIngredientForm as Ingredient);
                        if (id) {
                          setForm({...form, components: [...(form.components || []), { id, type: 'ingredient', quantity: 100 }]});
                          setShowNewIngredientForm(false);
                          setNewIngredientForm({ name: '', unit: 'kg', pricePerUnit: 0, category: '', supplierId: '' });
                          setIsAddingNewCategoryIng(false);
                        }
                      }
                    }}
                    className="w-full bg-black text-white py-4 rounded-2xl font-black active:scale-95 transition-all"
                  >
                    Aggiungi
                  </button>
                </div>
              )}

              {ingredients
                .filter(ing => ing.name.toLowerCase().includes(addIngredientSearch.toLowerCase()))
                .map(ing => {
                  const alreadyAdded = form.components?.some(c => c.id === ing.id && c.type === 'ingredient');
                  return (
                    <button
                      key={ing.id}
                      onClick={() => {
                        if (!alreadyAdded) {
                          setForm({...form, components: [...(form.components || []), { id: ing.id, type: 'ingredient', quantity: 100 }]});
                          setShowAddIngredientModal(false);
                          setAddIngredientSearch('');
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
                          <Check className="text-gray-300" size={20}/>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Conferma Cancellazione */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32}/>
              </div>
              <h3 className="text-2xl font-black">Conferma Eliminazione</h3>
              <p className="text-gray-400 text-sm mt-2">
                Sei sicuro di voler eliminare questa ricetta? L'azione non può essere annullata.
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setConfirmDeleteId(null)} 
                className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-[2rem] font-black active:scale-95 transition-all"
              >
                Annulla
              </button>
              <button 
                onClick={() => {
                  if (onDelete) onDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }} 
                className="flex-1 py-4 bg-red-600 text-white rounded-[2rem] font-black shadow-xl active:scale-95 transition-all"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Ingredienti Mancanti */}
      {missingIngredients.length > 0 && currentMissingIdx >= 0 && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32}/>
              </div>
              <h3 className="text-2xl font-black">Ingrediente Mancante</h3>
              <p className="text-gray-400 text-sm mt-1">
                Aggiungi <span className="text-black font-black underline decoration-blue-500 underline-offset-4">"{missingIngredients[currentMissingIdx]}"</span> all'economato
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Ingrediente</label>
                <input 
                  className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none" 
                  value={wizardIng.name || ''} 
                  onChange={e => setWizardIng({...wizardIng, name: e.target.value})}
                  onBlur={e => setWizardIng({...wizardIng, name: normalizeText(e.target.value)})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Prezzo (€/kg)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full bg-black text-white rounded-2xl p-4 text-sm font-black text-center" 
                    value={wizardIng.pricePerUnit || ''} 
                    onChange={e => setWizardIng({...wizardIng, pricePerUnit: parseFloat(e.target.value)})} 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoria</label>
                  <input 
                    placeholder="Es: Farine" 
                    className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none" 
                    value={wizardIng.category || ''} 
                    onChange={e => setWizardIng({...wizardIng, category: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fornitore *</label>
                <div className="flex space-x-2">
                  <select 
                    className="flex-1 bg-gray-50 rounded-2xl p-4 text-sm font-bold appearance-none border-none" 
                    value={wizardIng.supplierId || ''} 
                    onChange={e => setWizardIng({...wizardIng, supplierId: e.target.value})}
                  >
                    <option value="">Seleziona fornitore...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button 
                    onClick={() => setShowSupModal(true)} 
                    className="bg-black text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-transform"
                  >
                    <Plus size={20}/>
                  </button>
                </div>
                {!wizardIng.supplierId && (
                  <p className="text-[9px] text-red-500 font-bold px-1">Il fornitore è obbligatorio</p>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={() => { setMissingIngredients([]); setCurrentMissingIdx(-1); }} 
                className="flex-1 py-5 bg-gray-100 text-gray-400 rounded-[2rem] font-black active:scale-95 transition-all"
              >
                Salta
              </button>
              <button 
                onClick={saveWizardIngredient} 
                className="flex-[2] bg-black text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <Check size={18}/> <span>Conferma e Continua</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal per selezionare farina */}
      {showFlourSelectModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tight">Seleziona Farina</h3>
              <button onClick={() => { 
                setShowFlourSelectModal(null); 
                setFlourSelectSearch(''); 
                setShowNewFlourForm(false);
                setNewFlourForm({ name: '', unit: 'kg', pricePerUnit: 0, category: 'Farine', supplierId: '' });
                setIsAddingNewCategoryFlour(false);
              }} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:bg-gray-200 transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cerca farina..." 
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" 
                value={flourSelectSearch} 
                onChange={(e) => setFlourSelectSearch(e.target.value)} 
              />
            </div>
            
            {!showNewFlourForm && (
              <>
                <button
                  onClick={() => setShowNewFlourForm(true)}
                  className="w-full py-3 border-2 border-dashed border-blue-200 rounded-2xl text-blue-500 font-bold text-sm flex items-center justify-center space-x-2 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  <Plus size={16} /> <span>Nuovo Ingrediente</span>
                </button>
                
                <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">FARINE</p>
                  {availableFlours
                    .filter(flour => {
                      const searchLower = flourSelectSearch.toLowerCase();
                      const nameMatch = flour.name.toLowerCase().includes(searchLower);
                      // Escludi farine già selezionate
                      // Escludi farine già selezionate in altri contesti solo se non stiamo selezionando per quello stesso contesto
                      const alreadyInPref = showFlourSelectModal !== 'preferment' && prefFlourSelections.some(f => f.id === flour.id);
                      const alreadyInAutolyse = showFlourSelectModal !== 'autolyse' && autolyseFlourSelections.some(f => f.id === flour.id);
                      const alreadyInRemaining = showFlourSelectModal !== 'remaining' && remainingFlourSelections.some(f => f.id === flour.id);
                      const alreadyInCurrent = showFlourSelectModal === 'preferment' && prefFlourSelections.some(f => f.id === flour.id) ||
                                             showFlourSelectModal === 'autolyse' && autolyseFlourSelections.some(f => f.id === flour.id) ||
                                             showFlourSelectModal === 'remaining' && remainingFlourSelections.some(f => f.id === flour.id);
                      return nameMatch && !alreadyInPref && !alreadyInAutolyse && !alreadyInRemaining && !alreadyInCurrent;
                    })
                    .map(flour => (
                      <button
                        key={flour.id}
                        onClick={() => {
                          if (showFlourSelectModal === 'preferment') {
                            setPrefFlourSelections([...prefFlourSelections, { id: flour.id, percentage: 0 }]);
                          } else if (showFlourSelectModal === 'autolyse') {
                            setAutolyseFlourSelections([...autolyseFlourSelections, { id: flour.id, percentage: 0 }]);
                          } else if (showFlourSelectModal === 'remaining') {
                            setRemainingFlourSelections([...remainingFlourSelections, { id: flour.id, percentage: 0 }]);
                          }
                          setShowFlourSelectModal(null);
                          setFlourSelectSearch('');
                        }}
                        className="w-full p-4 rounded-2xl text-left bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm active:scale-95 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black text-sm text-black">{flour.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">€{flour.pricePerUnit.toFixed(2)}/kg</p>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </>
            )}

            {showNewFlourForm && (
              <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Ingrediente</label>
                  <input 
                    placeholder="Es: Farina Tipo 0" 
                    className="w-full bg-white border-none rounded-2xl p-4 text-sm font-bold" 
                    value={newFlourForm.name || ''} 
                    onChange={e => setNewFlourForm({...newFlourForm, name: e.target.value})}
                    onBlur={e => setNewFlourForm({...newFlourForm, name: normalizeText(e.target.value)})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Prezzo (€/kg)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full bg-black text-white rounded-2xl p-4 text-sm font-black text-center" 
                      value={newFlourForm.pricePerUnit || ''} 
                      onChange={e => setNewFlourForm({...newFlourForm, pricePerUnit: parseFloat(e.target.value)})} 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoria</label>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(ingredients.map(i => i.category))).filter(Boolean).slice(0, 3).map(cat => (
                        <button
                          key={cat}
                          onClick={() => setNewFlourForm({...newFlourForm, category: cat})}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                            newFlourForm.category === cat 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-50 text-blue-400'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                      <button
                        onClick={() => setIsAddingNewCategoryFlour(true)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center space-x-1 ${
                          isAddingNewCategoryFlour 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-blue-50 text-blue-400'
                        }`}
                      >
                        <Plus size={12}/> <span>Nuova</span>
                      </button>
                    </div>
                    {isAddingNewCategoryFlour && (
                      <input 
                        placeholder="Nuova categoria" 
                        className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-blue-100 border mt-2" 
                        value={newFlourForm.category || ''} 
                        onChange={e => setNewFlourForm({...newFlourForm, category: e.target.value})} 
                        onBlur={() => setIsAddingNewCategoryFlour(false)}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fornitore *</label>
                  <div className="flex space-x-2">
                    <select 
                      className="flex-1 bg-gray-50 rounded-2xl p-4 text-sm font-bold appearance-none border-none" 
                      value={newFlourForm.supplierId || ''} 
                      onChange={e => setNewFlourForm({...newFlourForm, supplierId: e.target.value})}
                    >
                      <option value="">Seleziona fornitore...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button 
                      onClick={() => setShowSupModal(true)} 
                      className="bg-black text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-transform"
                    >
                      <Plus size={20}/>
                    </button>
                  </div>
                  {!newFlourForm.supplierId && (
                    <p className="text-[9px] text-red-500 font-bold px-1">Il fornitore è obbligatorio</p>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button 
                    onClick={() => {
                      setShowNewFlourForm(false);
                      setNewFlourForm({ name: '', unit: 'kg', pricePerUnit: 0, category: 'Farine', supplierId: '' });
                      setIsAddingNewCategoryFlour(false);
                    }} 
                    className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black"
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={async () => {
                      if (!newFlourForm.name || !newFlourForm.pricePerUnit || !newFlourForm.supplierId) return;
                      const newIng: Ingredient = {
                        id: '',
                        name: newFlourForm.name!,
                        unit: 'kg' as Unit,
                        pricePerUnit: newFlourForm.pricePerUnit!,
                        category: newFlourForm.category || 'Farine',
                        supplierId: newFlourForm.supplierId!
                      };
                      const id = await onAddIngredient(newIng);
                      if (id) {
                        if (showFlourSelectModal === 'preferment') {
                          setPrefFlourSelections([...prefFlourSelections, { id, percentage: 0 }]);
                        } else if (showFlourSelectModal === 'autolyse') {
                          setAutolyseFlourSelections([...autolyseFlourSelections, { id, percentage: 0 }]);
                        } else if (showFlourSelectModal === 'remaining') {
                          setRemainingFlourSelections([...remainingFlourSelections, { id, percentage: 0 }]);
                        }
                        setShowNewFlourForm(false);
                        setNewFlourForm({ name: '', unit: 'kg', pricePerUnit: 0, category: 'Farine', supplierId: '' });
                        setIsAddingNewCategoryFlour(false);
                        setShowFlourSelectModal(null);
                        setFlourSelectSearch('');
                      }
                    }}
                    disabled={!newFlourForm.name || !newFlourForm.pricePerUnit || !newFlourForm.supplierId}
                    className="flex-[2] bg-black text-white py-4 rounded-2xl font-black shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Salva e Seleziona
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-modal per nuovo fornitore */}
      {showSupModal && (
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
                onClick={handleQuickSup}
                disabled={supLoading}
                className="flex-1 py-4 bg-black text-white rounded-2xl font-black shadow-lg disabled:opacity-50"
              >
                {supLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabCalculatorView;
