
import { Ingredient, SubRecipe, MenuItem, Supplier, Employee, UserData } from './types';

export const INITIAL_USER: UserData = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  foodCostThreshold: 30,
  bepConfig: {
    fixedCosts: [],
    foodCostIncidence: 30,
    serviceIncidence: 5,
    wasteIncidence: 2,
    averageTicket: 15
  }
};

export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_EMPLOYEES: Employee[] = [];
export const INITIAL_INGREDIENTS: Ingredient[] = [];
export const INITIAL_SUB_RECIPES: SubRecipe[] = [];
export const INITIAL_MENU: MenuItem[] = [];
