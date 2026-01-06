import { Preparation, Ingredient, StockAlert, ComponentUsage } from '../types';

export const calculateIngredientsNeeded = (
  preparation: Preparation,
  targetStock: number,
  ingredients: Ingredient[]
): { ingredientId: string; ingredientName: string; quantityNeeded: number; unit: string }[] => {
  const missingUnits = targetStock - preparation.currentStock;
  if (missingUnits <= 0) return [];
  
  return preparation.components
    .filter(c => c.type === 'ingredient')
    .map(comp => {
      const ingredient = ingredients.find(i => i.id === comp.id);
      if (!ingredient) return null;
      
      return {
        ingredientId: comp.id,
        ingredientName: ingredient.name,
        quantityNeeded: comp.quantity * missingUnits,
        unit: ingredient.unit
      };
    })
    .filter(Boolean) as { ingredientId: string; ingredientName: string; quantityNeeded: number; unit: string }[];
};

export const aggregateIngredientOrders = (
  alerts: StockAlert[],
  ingredients: Ingredient[]
): { ingredient: Ingredient; totalQuantity: number }[] => {
  const aggregated = new Map<string, number>();
  
  alerts.forEach(alert => {
    alert.ingredientsNeeded.forEach(ing => {
      const current = aggregated.get(ing.ingredientId) || 0;
      aggregated.set(ing.ingredientId, current + ing.quantityNeeded);
    });
  });
  
  return Array.from(aggregated.entries())
    .map(([id, qty]) => {
      const ingredient = ingredients.find(i => i.id === id);
      if (!ingredient) return null;
      return {
        ingredient,
        totalQuantity: qty
      };
    })
    .filter(Boolean) as { ingredient: Ingredient; totalQuantity: number }[];
};

export const calculateStockAlerts = (
  preparations: Preparation[],
  ingredients: Ingredient[]
): StockAlert[] => {
  return preparations
    .filter(p => p.isActive && p.currentStock <= p.minStock)
    .map(prep => {
      const missingQuantity = prep.minStock - prep.currentStock;
      const ingredientsNeeded = calculateIngredientsNeeded(
        prep,
        prep.minStock,
        ingredients
      );
      
      return {
        preparationId: prep.id,
        preparationName: prep.name,
        currentStock: prep.currentStock,
        minStock: prep.minStock,
        missingQuantity,
        ingredientsNeeded
      };
    });
};

