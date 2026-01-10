/**
 * Utility functions per calcoli avanzati di impasti da panificazione
 */

import { Ingredient } from '../types';
import { Preferment } from '../components/Views/PrefermentiView';

// Interfaccia per farina selezionata con percentuale
export interface FlourSelection {
  id: string;
  percentage: number;
}

// Interfaccia per ingrediente aggiuntivo
export interface AdditionalIngredient {
  id: string;
  percentage: number;
}

// Interfaccia per risultati pre-fermento
export interface PrefermentResult {
  flour: number;
  water: number;
  yeast: number;
  salt: number; // Sempre presente (0 se non usato)
  flourBreakdown: { flourId: string; amount: number }[];
}

// Interfaccia per risultati autolisi
export interface AutolysisResult {
  flour: number;
  water: number;
  salt: number; // Sempre presente (0 se non usato)
  flourBreakdown: { flourId: string; amount: number }[];
}

// Interfaccia per risultati chiusura
export interface ClosureResult {
  remainingFlour: number;
  water: number;
  salt: number;
  yeast: number;
  oil: number;
  malt: number;
  additionalIngredients: { ingredientId: string; amount: number }[];
  flourBreakdown: { flourId: string; amount: number }[];
}

// Interfaccia risultato completo
export interface DoughCalculationResult {
  preferment?: PrefermentResult;
  autolysis?: AutolysisResult;
  closure: ClosureResult;
  totalWeight: number;
  totalCost: number;
  costPerKg: number;
  costPerPortion?: number;
  errors: string[];
}

/**
 * Calcola il pre-fermento
 */
export function calculatePreferment(
  preferment: Preferment,
  prefermentFlourPercentage: number,
  totalFlour: number,
  flourSelections: FlourSelection[],
  ingredients: Ingredient[]
): PrefermentResult {
  // Farina totale per pre-fermento
  const prefermentFlour = (totalFlour * prefermentFlourPercentage) / 100;
  
  // Calcola breakdown delle farine
  const flourBreakdown = flourSelections.map(flour => ({
    flourId: flour.id,
    amount: (prefermentFlour * flour.percentage) / 100
  }));
  
  // Calcola acqua (idratazione del prefermento)
  const water = (prefermentFlour * preferment.waterPercentage) / 100;
  
  // Calcola lievito
  const yeast = (prefermentFlour * preferment.yeastPercentage) / 100;
  
  // Calcola sale (0 se non presente - Firebase non accetta undefined)
  const salt = (prefermentFlour * preferment.saltPercentage) / 100;

  return {
    flour: prefermentFlour,
    water,
    yeast,
    salt,
    flourBreakdown
  };
}

/**
 * Calcola l'autolisi
 * NOTA: autolysisFlourPercentage è ora sulla farina TOTALE, non sulla farina rimanente
 */
export function calculateAutolysis(
  autolysisFlourPercentage: number,
  totalFlour: number, // Farina totale (non più rimanente!)
  autolysisHydration: number,
  flourSelections: FlourSelection[],
  autolysisSaltPercentage: number = 0
): AutolysisResult {
  // Farina per autolisi (percentuale sulla farina TOTALE)
  const autolysisFlour = (totalFlour * autolysisFlourPercentage) / 100;
  
  // Calcola breakdown delle farine
  const flourBreakdown = flourSelections.map(flour => ({
    flourId: flour.id,
    amount: (autolysisFlour * flour.percentage) / 100
  }));
  
  // Calcola acqua
  const water = (autolysisFlour * autolysisHydration) / 100;
  
  // Calcola sale (0 se non presente - Firebase non accetta undefined)
  const salt = (autolysisFlour * autolysisSaltPercentage) / 100;

  return {
    flour: autolysisFlour,
    water,
    salt,
    flourBreakdown
  };
}

/**
 * Calcola la chiusura dell'impasto
 * IMPORTANTE: 
 * - Le percentuali (sale, lievito, olio, malto) sono sempre sulla farina TOTALE
 * - Solo il SALE viene sottratto dai pre-fermenti/autolisi (perché fa parte della ricetta finale)
 * - Lievito, Olio e Malto NON vengono sottratti dai pre-fermenti (il lievito nel pre-fermento
 *   è solo per la maturazione, non è parte del lievito totale della ricetta)
 */
export function calculateClosure(
  remainingFlour: number,
  totalWater: number,
  prefermentWater: number,
  autolysisWater: number,
  saltPercentage: number, // Sale totale ricetta (sulla farina totale)
  yeastPercentage: number, // Lievito totale ricetta (sulla farina totale) - NON sottrarre quello del pre-fermento
  oilPercentage: number, // Olio totale ricetta (sulla farina totale)
  maltPercentage: number, // Malto totale ricetta (sulla farina totale)
  additionalIngredients: AdditionalIngredient[],
  flourSelections: FlourSelection[],
  totalFlour: number, // Farina totale (per calcolare le percentuali corrette)
  prefermentSalt: number = 0, // Sale già usato nel pre-fermento (da sottrarre)
  prefermentYeast: number = 0, // Lievito già usato nel pre-fermento (NON sottrarre - solo per debug)
  autolysisSalt: number = 0, // Sale già usato nell'autolisi (da sottrarre)
  prefermentMalt: number = 0 // Malto già usato nel pre-fermento (NON sottrarre - non usato)
): ClosureResult {
  // Acqua residua
  const water = totalWater - prefermentWater - autolysisWater;
  
  // Calcola breakdown delle farine (solo se ci sono farine selezionate)
  const flourBreakdown = flourSelections.length > 0 
    ? flourSelections.map(flour => ({
        flourId: flour.id,
        amount: (remainingFlour * flour.percentage) / 100
      }))
    : [];
  
  // Calcola il totale necessario sulla farina TOTALE
  const totalSaltNeeded = (totalFlour * saltPercentage) / 100;
  const totalYeastNeeded = (totalFlour * yeastPercentage) / 100;
  const totalOilNeeded = (totalFlour * oilPercentage) / 100;
  const totalMaltNeeded = (totalFlour * maltPercentage) / 100;
  
  // IMPORTANTE: Solo il SALE viene sottratto dai pre-fermenti/autolisi
  // Lievito, Olio e Malto sono calcolati sulla farina totale senza sottrarre
  // quelli dei pre-fermenti (il lievito nel pre-fermento è solo per la maturazione,
  // non fa parte del lievito totale della ricetta)
  const salt = Math.max(0, totalSaltNeeded - prefermentSalt - autolysisSalt);
  const yeast = totalYeastNeeded; // Lievito totale sulla farina totale, NON sottrarre quello del pre-fermento
  const oil = totalOilNeeded; // Olio totale sulla farina totale
  const malt = totalMaltNeeded; // Malto totale sulla farina totale
  
  // Ingredienti aggiuntivi (percentuali sul totale farina)
  const additionalIngredientAmounts = additionalIngredients.map(ing => ({
    ingredientId: ing.id,
    amount: (totalFlour * ing.percentage) / 100
  }));
  
  return {
    remainingFlour,
    water,
    salt,
    yeast,
    oil,
    malt,
    additionalIngredients: additionalIngredientAmounts,
    flourBreakdown
  };
}

/**
 * Calcola i costi dell'impasto
 */
export function calculateCosts(
  result: DoughCalculationResult,
  ingredients: Ingredient[],
  multiplier: number = 1
): { totalCost: number; costPerKg: number; costPerPortion?: number; portionWeight?: number } {
  let totalCost = 0;
  
  // Funzione helper per trovare prezzo ingrediente
  const getIngredientPrice = (ingredientId: string): number => {
    const ing = ingredients.find(i => i.id === ingredientId);
    return ing ? ing.pricePerUnit : 0;
  };
  
  // Costi pre-fermento
  if (result.preferment) {
    // Farine pre-fermento
    result.preferment.flourBreakdown.forEach(flour => {
      totalCost += (flour.amount / 1000) * getIngredientPrice(flour.flourId) * multiplier;
    });
    
    // Acqua (assumiamo costo 0, ma può essere personalizzato)
    // Lievito (calcolato dal prezzo farina base o lievito)
    // Sale (se presente)
  }
  
  // Costi autolisi
  if (result.autolysis) {
    result.autolysis.flourBreakdown.forEach(flour => {
      totalCost += (flour.amount / 1000) * getIngredientPrice(flour.flourId) * multiplier;
    });
  }
  
  // Costi chiusura
  result.closure.flourBreakdown.forEach(flour => {
    totalCost += (flour.amount / 1000) * getIngredientPrice(flour.flourId) * multiplier;
  });
  
  // Sale, olio, malto, lievito
  // Assumiamo che siano ingredienti dell'economato
  // Nota: per ora calcoliamo solo le farine, gli altri ingredienti potrebbero essere aggiunti
  
  const totalWeight = result.totalWeight * multiplier;
  const costPerKg = totalWeight > 0 ? totalCost / (totalWeight / 1000) : 0;
  
  return {
    totalCost,
    costPerKg
  };
}

/**
 * Valida le configurazioni dell'impasto
 */
export function validateDoughConfiguration(
  usePreferment: boolean,
  prefermentFlourPercentage: number,
  useAutolysis: boolean,
  autolysisFlourPercentage: number,
  prefermentFlourSelections: FlourSelection[],
  autolysisFlourSelections: FlourSelection[],
  closureFlourSelections: FlourSelection[]
): string[] {
  const errors: string[] = [];
  
  // Valida percentuali farine pre-fermento
  if (usePreferment) {
    if (prefermentFlourPercentage < 0 || prefermentFlourPercentage > 100) {
      errors.push('Percentuale farina pre-fermento deve essere tra 0% e 100%');
    }
    
    const prefFlourTotal = prefermentFlourSelections.reduce((sum, f) => sum + f.percentage, 0);
    if (Math.abs(prefFlourTotal - 100) > 0.01) {
      errors.push(`Percentuali farine pre-fermento devono sommare al 100% (attuale: ${prefFlourTotal.toFixed(1)}%)`);
    }
  }
  
  // Valida percentuali farine autolisi
  if (useAutolysis) {
    if (autolysisFlourPercentage < 0 || autolysisFlourPercentage > 100) {
      errors.push('Percentuale farina autolisi deve essere tra 0% e 100%');
    }
    
    const autFlourTotal = autolysisFlourSelections.reduce((sum, f) => sum + f.percentage, 0);
    if (Math.abs(autFlourTotal - 100) > 0.01) {
      errors.push(`Percentuali farine autolisi devono sommare al 100% (attuale: ${autFlourTotal.toFixed(1)}%)`);
    }
  }
  
  // Valida somma pre-fermento + autolisi (entrambe su farina totale)
  const totalFlourUsed = (usePreferment ? prefermentFlourPercentage : 0) +
                         (useAutolysis ? autolysisFlourPercentage : 0);
  if (totalFlourUsed > 100) {
    errors.push(`La somma delle percentuali (${totalFlourUsed.toFixed(1)}%) supera il 100% della farina totale`);
  }
  
  // Valida percentuali farine chiusura (solo se ci sono farine selezionate)
  if (closureFlourSelections.length > 0) {
    const closureFlourTotal = closureFlourSelections.reduce((sum, f) => sum + f.percentage, 0);
    if (Math.abs(closureFlourTotal - 100) > 0.01) {
      errors.push(`Percentuali farine chiusura devono sommare al 100% (attuale: ${closureFlourTotal.toFixed(1)}%)`);
    }
  }
  // Se non ci sono farine selezionate per la chiusura, va bene (userà tutta la farina residua)
  
  return errors;
}

