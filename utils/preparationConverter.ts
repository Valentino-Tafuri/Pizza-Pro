import { SubRecipe, Preparation } from '../types';

export const convertSubRecipeToPreparation = (
  subRecipe: SubRecipe,
  isActive: boolean = false,
  minStock: number = 5,
  currentStock: number = 0
): Preparation => {
  return {
    ...subRecipe,
    isActive,
    minStock,
    currentStock,
    unit: 'pz' as const
  };
};

export interface PreparationSettings {
  id: string;
  isActive: boolean;
  minStock: number;
  currentStock: number;
}

export const getActivePreparations = (
  subRecipes: SubRecipe[],
  preparationSettings: Map<string, PreparationSettings>
): Preparation[] => {
  return subRecipes.map(sr => {
    const settings = preparationSettings.get(sr.id) || { 
      id: sr.id,
      isActive: false, 
      minStock: 5, 
      currentStock: 0 
    };
    return convertSubRecipeToPreparation(sr, settings.isActive, settings.minStock, settings.currentStock);
  });
};

