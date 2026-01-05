
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

  // Calcola il costo totale di tutti i componenti
  const totalCost = subRecipe.components.reduce((acc, comp) => {
    if (comp.type === 'ingredient') {
      const ing = ingredients.find(i => i.id === comp.id);
      if (!ing) return acc;
      // Quantità in grammi, prezzo al kg/l -> moltiplicatore 0.001
      // Per unità diverse (pz, ml, etc.) il prezzo è già per unità
      const multiplier = (ing.unit === 'kg' || ing.unit === 'l') ? 0.001 : 1;
      const componentCost = ing.pricePerUnit * comp.quantity * multiplier;
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
  
  // Il costo al kg è il costo totale diviso per la resa finale (in kg)
  // yieldWeight è già in kg, quindi dividiamo direttamente
  if (subRecipe.yieldWeight > 0) {
    return totalCost / subRecipe.yieldWeight;
  }
  
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
