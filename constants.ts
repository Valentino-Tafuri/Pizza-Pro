
import { Ingredient, SubRecipe, MenuItem, Supplier, Employee, UserData, ProductMix } from './types';

// Default Product Mix per Pricing Calculator
export const INITIAL_PRODUCT_MIX: ProductMix = {
  volumeMensile: 960, // Coperti al mese (circa 32 al giorno)
  categorie: [
    {
      id: 'pizza',
      nome: 'Pizza',
      emoji: '🍕',
      incidenzaFatturato: 55,
      prezzoMedio: 10.00,
      foodCostTarget: 20,
      costiVariabili: {
        packaging: true,
        sfrido: true,
        delivery: true
      },
      volumeUnitario: 1.0
    },
    {
      id: 'beverage',
      nome: 'Beverage',
      emoji: '🥤',
      incidenzaFatturato: 20,
      prezzoMedio: 3.50,
      foodCostTarget: 15,
      costiVariabili: {
        packaging: true,
        sfrido: true,
        delivery: false
      },
      volumeUnitario: 1.5
    },
    {
      id: 'coperto',
      nome: 'Coperto',
      emoji: '🍽️',
      incidenzaFatturato: 10,
      prezzoMedio: 2.50,
      foodCostTarget: 0,
      costiVariabili: {
        packaging: false,
        sfrido: false,
        delivery: false
      },
      volumeUnitario: 1.0
    },
    {
      id: 'fritti',
      nome: 'Fritti',
      emoji: '🍟',
      incidenzaFatturato: 10,
      prezzoMedio: 6.00,
      foodCostTarget: 25,
      costiVariabili: {
        packaging: true,
        sfrido: true,
        delivery: true
      },
      volumeUnitario: 0.5
    },
    {
      id: 'dessert',
      nome: 'Dessert & Altro',
      emoji: '🍰',
      incidenzaFatturato: 5,
      prezzoMedio: 5.00,
      foodCostTarget: 25,
      costiVariabili: {
        packaging: true,
        sfrido: true,
        delivery: false
      },
      volumeUnitario: 0.3
    }
  ]
};

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
    averageTicket: 15,
    deliveryEnabled: false,
    deliveryIncidence: 0,
    productMix: INITIAL_PRODUCT_MIX
  }
};

export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_EMPLOYEES: Employee[] = [];
export const INITIAL_INGREDIENTS: Ingredient[] = [];
export const INITIAL_SUB_RECIPES: SubRecipe[] = [];
export const INITIAL_MENU: MenuItem[] = [];
