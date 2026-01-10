/**
 * Hook personalizzato per calcoli avanzati impasti
 */

import { useMemo } from 'react';
import { Ingredient } from '../types';
import { Preferment } from '../components/Views/PrefermentiView';
import {
  FlourSelection,
  AdditionalIngredient,
  DoughCalculationResult,
  calculatePreferment,
  calculateAutolysis,
  calculateClosure,
  validateDoughConfiguration
} from '../utils/doughCalculator';

interface UseDoughCalculationsParams {
  // Parametri generali
  totalFlour: number; // Sempre 1000g (1kg) di base
  totalHydration: number; // 50-90%
  multiplier: number; // Moltiplicatore ricetta
  
  // Pre-fermento
  usePreferment: boolean;
  selectedPreferment: Preferment | null;
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
  
  // ID ingredienti selezionati (per calcolo costi)
  selectedSaltId?: string | null;
  selectedYeastId?: string | null;
  selectedOilId?: string | null;
  selectedMaltId?: string | null;
  
  // Dati esterni
  ingredients: Ingredient[];
}

export function useDoughCalculations(params: UseDoughCalculationsParams): {
  result: DoughCalculationResult | null;
  errors: string[];
  isValid: boolean;
} {
  const {
    totalFlour,
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
    additionalIngredients,
    closureFlourSelections,
    saltPercentage,
    yeastPercentage,
    oilPercentage,
    maltPercentage,
    selectedSaltId,
    selectedYeastId,
    selectedOilId,
    selectedMaltId,
    ingredients
  } = params;

  return useMemo(() => {
    // Calcola farina totale (considerando moltiplicatore)
    const flourTotal = totalFlour * multiplier;
    
    // Calcola acqua totale
    const totalWater = (flourTotal * totalHydration) / 100;
    
    // Validazione (non blocca il calcolo, ma mostra errori)
    const validationErrors = validateDoughConfiguration(
      usePreferment,
      prefermentFlourPercentage,
      useAutolysis,
      autolysisFlourPercentage,
      prefermentFlourSelections,
      autolysisFlourSelections,
      closureFlourSelections
    );
    
    // Procedi con calcoli anche se ci sono errori di validazione
    // (così l'utente può vedere il riepilogo e correggere)
    const errors: string[] = [...validationErrors];
    let prefermentResult;
    let autolysisResult;
    
    // 1. Calcola pre-fermento
    let prefermentFlour = 0;
    let prefermentWater = 0;
    
    if (usePreferment && selectedPreferment) {
      prefermentResult = calculatePreferment(
        selectedPreferment,
        prefermentFlourPercentage,
        flourTotal,
        prefermentFlourSelections,
        ingredients
      );
      prefermentFlour = prefermentResult.flour;
      prefermentWater = prefermentResult.water;
    }
    
    // 2. Calcola autolisi (percentuale sulla farina TOTALE, non sulla rimanente)
    let autolysisFlour = 0;
    let autolysisWater = 0;

    if (useAutolysis && autolysisFlourPercentage > 0) {
      autolysisResult = calculateAutolysis(
        autolysisFlourPercentage,
        flourTotal, // Usa farina totale, non rimanente!
        autolysisHydration,
        autolysisFlourSelections,
        autolysisSaltPercentage
      );
      autolysisFlour = autolysisResult.flour;
      autolysisWater = autolysisResult.water;
    }
    
    // 3. Calcola farina rimanente per chiusura
    let remainingFlourForClosure = flourTotal - prefermentFlour - autolysisFlour;
    
    if (remainingFlourForClosure < 0) {
      errors.push('Errore: farina residua negativa. Verifica le percentuali di pre-fermento e autolisi.');
      remainingFlourForClosure = 0; // Previene calcoli con valori negativi
    }
    
    // Prepara i valori degli ingredienti già usati nel pre-fermento e nell'autolisi
    const prefermentSalt = prefermentResult?.salt || 0;
    const prefermentYeast = prefermentResult?.yeast || 0;
    const autolysisSalt = autolysisResult?.salt || 0;
    // Nota: il malto non viene tipicamente usato nel pre-fermento, ma se necessario può essere aggiunto
    const prefermentMalt = 0; // Attualmente non gestito nel pre-fermento
    
    // 4. Calcola chiusura
    // IMPORTANTE: Le percentuali (sale, lievito, olio, malto) sono sulla farina TOTALE.
    // Il calcolo sottrae automaticamente gli ingredienti già usati nel pre-fermento e nell'autolisi.
    const closureResult = calculateClosure(
      remainingFlourForClosure,
      totalWater,
      prefermentWater,
      autolysisWater,
      saltPercentage, // Sale totale ricetta (sulla farina totale)
      yeastPercentage, // Lievito totale ricetta (sulla farina totale)
      oilPercentage, // Olio totale ricetta (sulla farina totale)
      maltPercentage, // Malto totale ricetta (sulla farina totale)
      additionalIngredients,
      closureFlourSelections,
      flourTotal, // Farina totale (per calcolare le percentuali corrette)
      prefermentSalt, // Sale già usato nel pre-fermento
      prefermentYeast, // Lievito già usato nel pre-fermento
      autolysisSalt, // Sale già usato nell'autolisi
      prefermentMalt // Malto già usato nel pre-fermento (se presente)
    );
    
    // 5. Calcola peso totale
    let totalWeight = flourTotal + totalWater;
    
    // Aggiungi sale, olio, malto, lievito dalla chiusura
    totalWeight += closureResult.salt + closureResult.oil + closureResult.malt + closureResult.yeast;
    
    // Aggiungi ingredienti aggiuntivi (assumendo stessa densità della farina)
    closureResult.additionalIngredients.forEach(ing => {
      totalWeight += ing.amount;
    });
    
    // Aggiungi lievito dal pre-fermento
    if (prefermentResult) {
      totalWeight += prefermentResult.yeast;
      if (prefermentResult.salt) {
        totalWeight += prefermentResult.salt;
      }
    }
    
    // Aggiungi sale dall'autolisi se presente
    if (autolysisResult && autolysisResult.salt) {
      totalWeight += autolysisResult.salt;
    }
    
    // 6. Calcola costi
    const result: DoughCalculationResult = {
      preferment: prefermentResult,
      autolysis: autolysisResult,
      closure: closureResult,
      totalWeight,
      totalCost: 0, // Sarà calcolato separatamente
      costPerKg: 0,
      errors: [...validationErrors, ...errors]
    };
    
    // Calcola costi (moltiplicati per il moltiplicatore)
    let totalCost = 0;
    const getIngredientPrice = (ingredientId: string | null | undefined): number => {
      if (!ingredientId) return 0;
      const ing = ingredients.find(i => i.id === ingredientId);
      if (!ing) return 0;
      
      // Il prezzo è sempre al kg/l dall'economato
      return ing.pricePerUnit || 0;
    };
    
    // Costi farine pre-fermento
    if (prefermentResult) {
      prefermentResult.flourBreakdown.forEach(flour => {
        // Converti grammi in kg e moltiplica per prezzo al kg
        const kgAmount = (flour.amount * multiplier) / 1000;
        const price = getIngredientPrice(flour.flourId);
        totalCost += kgAmount * price;
      });
    }
    
    // Costi farine autolisi
    if (autolysisResult) {
      autolysisResult.flourBreakdown.forEach(flour => {
        const kgAmount = (flour.amount * multiplier) / 1000;
        const price = getIngredientPrice(flour.flourId);
        totalCost += kgAmount * price;
      });
    }
    
    // Costi farine chiusura
    closureResult.flourBreakdown.forEach(flour => {
      const kgAmount = (flour.amount * multiplier) / 1000;
      const price = getIngredientPrice(flour.flourId);
      totalCost += kgAmount * price;
    });
    
    // Costi ingredienti aggiuntivi
    closureResult.additionalIngredients.forEach(ing => {
      const kgAmount = (ing.amount * multiplier) / 1000;
      const price = getIngredientPrice(ing.ingredientId);
      totalCost += kgAmount * price;
    });
    
    // Costi sale, lievito, olio, malto (dalla chiusura)
    if (closureResult.salt > 0 && selectedSaltId) {
      const kgAmount = (closureResult.salt * multiplier) / 1000;
      const price = getIngredientPrice(selectedSaltId);
      totalCost += kgAmount * price;
    }
    
    if (closureResult.yeast > 0 && selectedYeastId) {
      const kgAmount = (closureResult.yeast * multiplier) / 1000;
      const price = getIngredientPrice(selectedYeastId);
      totalCost += kgAmount * price;
    }
    
    if (closureResult.oil > 0 && selectedOilId) {
      const kgAmount = (closureResult.oil * multiplier) / 1000;
      const price = getIngredientPrice(selectedOilId);
      totalCost += kgAmount * price;
    }
    
    if (closureResult.malt > 0 && selectedMaltId) {
      const kgAmount = (closureResult.malt * multiplier) / 1000;
      const price = getIngredientPrice(selectedMaltId);
      totalCost += kgAmount * price;
    }
    
    // Costi sale e lievito dal pre-fermento (se presente)
    if (prefermentResult && prefermentResult.salt > 0 && selectedSaltId) {
      const kgAmount = (prefermentResult.salt * multiplier) / 1000;
      const price = getIngredientPrice(selectedSaltId);
      totalCost += kgAmount * price;
    }
    
    if (prefermentResult && prefermentResult.yeast > 0 && selectedYeastId) {
      const kgAmount = (prefermentResult.yeast * multiplier) / 1000;
      const price = getIngredientPrice(selectedYeastId);
      totalCost += kgAmount * price;
    }
    
    // Costi sale dall'autolisi (se presente)
    if (autolysisResult && autolysisResult.salt > 0 && selectedSaltId) {
      const kgAmount = (autolysisResult.salt * multiplier) / 1000;
      const price = getIngredientPrice(selectedSaltId);
      totalCost += kgAmount * price;
    }
    
    result.totalCost = totalCost;
    // totalWeight è già moltiplicato per multiplier (perché flourTotal lo è)
    const totalWeightKg = totalWeight / 1000;
    result.costPerKg = totalWeightKg > 0 ? totalCost / totalWeightKg : 0;
    
    return {
      result,
      errors: result.errors,
      isValid: result.errors.length === 0
    };
  }, [
    totalFlour,
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
    closureFlourSelections,
    saltPercentage,
    yeastPercentage,
    oilPercentage,
    maltPercentage,
    additionalIngredients,
    selectedSaltId,
    selectedYeastId,
    selectedOilId,
    selectedMaltId,
    ingredients
  ]);
}

