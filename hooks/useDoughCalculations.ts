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
    let prefermentYeast = 0;
    
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
      prefermentYeast = prefermentResult.yeast;
    }
    
    // 2. Calcola autolisi (sulla farina rimanente)
    let autolysisFlour = 0;
    let autolysisWater = 0;
    const remainingFlourAfterPreferment = flourTotal - prefermentFlour;
    
    if (useAutolysis && remainingFlourAfterPreferment > 0) {
      autolysisResult = calculateAutolysis(
        autolysisFlourPercentage,
        remainingFlourAfterPreferment,
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
    
    // Se remainingFlourForClosure è 0 o negativo, usa flourTotal come base per calcolare
    // sale, lievito, olio, malto (per evitare valori 0 quando le percentuali sono impostate)
    // Questo gestisce il caso in cui tutta la farina è usata in pre-fermento/autolisi
    // ma comunque vogliamo calcolare gli ingredienti della chiusura
    const baseFlourForClosureIngredients = remainingFlourForClosure > 0 
      ? remainingFlourForClosure 
      : flourTotal;
    
    // 4. Calcola chiusura
    // Usa remainingFlourForClosure per le farine, ma baseFlourForClosureIngredients
    // per sale, lievito, olio, malto se remainingFlourForClosure è 0
    // Passa anche autolysisSaltPercentage per sottrarlo dal sale totale
    const closureResult = calculateClosure(
      remainingFlourForClosure,
      totalWater,
      prefermentWater,
      autolysisWater,
      saltPercentage, // Sale totale ricetta
      yeastPercentage,
      oilPercentage,
      maltPercentage,
      additionalIngredients,
      closureFlourSelections,
      baseFlourForClosureIngredients, // Base per calcolare sale, lievito, olio, malto
      autolysisSaltPercentage // Sale nell'autolisi da sottrarre
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
    const getIngredientPrice = (ingredientId: string): number => {
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
    
    // Nota: Sale, olio, malto, lievito dovrebbero essere aggiunti come ingredienti aggiuntivi
    // se si vuole calcolare il loro costo
    
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
    ingredients
  ]);
}

