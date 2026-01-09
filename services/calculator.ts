
import { Ingredient, SubRecipe, MenuItem, ComponentUsage } from '../types';

export const getIngredientPrice = (id: string, ingredients: Ingredient[]): number => {
  const ing = ingredients.find(i => i.id === id);
  return ing ? ing.pricePerUnit : 0;
};

/**
 * Calcola il costo al Kg di un semilavorato.
 * Supporta ora la nidificazione di altri semilavorati (trattati in grammi).
 */
export const calculateSubRecipeCostPerKg = (
  subRecipe: SubRecipe, 
  ingredients: Ingredient[],
  subRecipes: SubRecipe[] = [],
  depth: number = 0
): number => {
  if (depth > 5) return 0;

  // Verifica che ci siano componenti
  if (!subRecipe.components || subRecipe.components.length === 0) {
    console.log(`[calculateSubRecipeCost] ${subRecipe.name}: Nessun componente`);
    return 0;
  }

  // Calcola il costo totale di tutti i componenti
  const totalCost = subRecipe.components.reduce((acc, comp) => {
    if (comp.type === 'ingredient') {
      const ing = ingredients.find(i => i.id === comp.id);
      if (!ing) {
        console.log(`[calculateSubRecipeCost] ${subRecipe.name}: Ingrediente ${comp.id} non trovato`);
        return acc;
      }
      // Quantità in grammi, prezzo al kg/l -> moltiplicatore 0.001
      // Per unità diverse (pz, ml, etc.) il prezzo è già per unità
      const multiplier = (ing.unit === 'kg' || ing.unit === 'l') ? 0.001 : 1;
      const componentCost = ing.pricePerUnit * comp.quantity * multiplier;
      if (componentCost > 0) {
        console.log(`[calculateSubRecipeCost] ${subRecipe.name}: ${ing.name} - ${comp.quantity}g - €${componentCost.toFixed(4)}`);
      }
      return acc + componentCost;
    } 
    else if (comp.type === 'subrecipe') {
      const nestedSub = subRecipes.find(s => s.id === comp.id);
      if (!nestedSub || nestedSub.id === subRecipe.id) return acc;
      // Calcola ricorsivamente il costo al kg del semilavorato nidificato
      const nestedCostPerKg = calculateSubRecipeCostPerKg(nestedSub, ingredients, subRecipes, depth + 1);
      // I semilavorati usati come componenti sono in grammi -> / 1000 per convertire a kg
      const componentCost = nestedCostPerKg * (comp.quantity / 1000);
      return acc + componentCost;
    }
    return acc;
  }, 0);
  
  console.log(`[calculateSubRecipeCost] ${subRecipe.name}: Costo totale componenti = €${totalCost.toFixed(4)}`);
  console.log(`[calculateSubRecipeCost] ${subRecipe.name}: yieldWeight = ${subRecipe.yieldWeight}, initialWeight = ${subRecipe.initialWeight}`);
  
  // Calcola il peso totale dai componenti (in kg) come fallback
  const totalWeightFromComponents = subRecipe.components.reduce((acc, comp) => {
    // Assumiamo che le quantità siano in grammi
    return acc + (comp.quantity / 1000);
  }, 0);
  
  console.log(`[calculateSubRecipeCost] ${subRecipe.name}: Peso totale da componenti = ${totalWeightFromComponents.toFixed(4)} kg`);
  
  // Usa yieldWeight se disponibile, altrimenti initialWeight, altrimenti calcola dai componenti
  let totalWeight = subRecipe.yieldWeight || subRecipe.initialWeight || totalWeightFromComponents;
  
  // Se ancora non abbiamo un peso valido, calcolalo dalla somma dei componenti
  if (totalWeight <= 0 && totalWeightFromComponents > 0) {
    totalWeight = totalWeightFromComponents;
    console.log(`[calculateSubRecipeCost] ${subRecipe.name}: Usato peso da componenti come fallback = ${totalWeight.toFixed(4)} kg`);
  }
  
  // Il costo al kg è il costo totale diviso per il peso totale (in kg)
  if (totalWeight > 0 && totalCost > 0) {
    const costPerKg = totalCost / totalWeight;
    console.log(`[calculateSubRecipeCost] ${subRecipe.name}: Costo al kg = €${totalCost.toFixed(4)} / ${totalWeight.toFixed(4)}kg = €${costPerKg.toFixed(4)}/kg`);
    return costPerKg;
  }
  
  // Se non c'è peso ma c'è un costo, usa almeno il peso dai componenti per calcolare il costo al kg
  if (totalCost > 0 && totalWeightFromComponents > 0) {
    const costPerKg = totalCost / totalWeightFromComponents;
    console.log(`[calculateSubRecipeCost] ${subRecipe.name}: Costo al kg (fallback peso componenti) = €${costPerKg.toFixed(4)}/kg`);
    return costPerKg;
  }
  
  console.log(`[calculateSubRecipeCost] ${subRecipe.name}: ⚠️ Nessun costo calcolato (costo=${totalCost}, peso=${totalWeight})`);
  return 0;
};

/**
 * Calcola il costo totale di un MenuItem (Pizza).
 * Tratta i semilavorati (subrecipe) come quantità in grammi (/1000).
 */
export const calculateMenuItemCost = (
  item: MenuItem,
  ingredients: Ingredient[],
  subRecipes: SubRecipe[],
  menu: MenuItem[] = [],
  depth: number = 0
): number => {
  if (depth > 5) return 0;

  return item.components.reduce((acc, comp) => {
    if (comp.type === 'ingredient') {
      const ing = ingredients.find(i => i.id === comp.id);
      if (!ing) return acc;
      const multiplier = (ing.unit === 'kg' || ing.unit === 'l') ? 0.001 : 1;
      return acc + (ing.pricePerUnit * comp.quantity * multiplier);
    } 
    else if (comp.type === 'subrecipe') {
      const sub = subRecipes.find(s => s.id === comp.id);
      if (!sub) return acc;
      const costPerKg = calculateSubRecipeCostPerKg(sub, ingredients, subRecipes);
      
      // Se la ricetta ha un peso porzione definito (ricette laboratorio), usa quello
      // altrimenti usa la quantità in grammi come prima
      if (sub.portionWeight && sub.portionWeight > 0) {
        // comp.quantity è il numero di porzioni (es. 1, 0.5, 2)
        const costPerPortion = (costPerKg * sub.portionWeight) / 1000;
        return acc + (costPerPortion * comp.quantity);
      } else {
        // Comportamento originale: quantità in grammi
        return acc + (costPerKg * (comp.quantity / 1000));
      }
    } 
    else if (comp.type === 'menuitem') {
      const nestedItem = menu.find(m => m.id === comp.id);
      if (!nestedItem || nestedItem.id === item.id) return acc;
      const costOfNested = calculateMenuItemCost(nestedItem, ingredients, subRecipes, menu, depth + 1);
      return acc + (costOfNested * comp.quantity);
    }
    return acc;
  }, 0);
};

export const getFoodCostColor = (percentage: number): string => {
  if (percentage <= 25) return 'bg-green-100 text-green-700';
  if (percentage <= 35) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};
