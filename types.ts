
export type Unit = 'kg' | 'g' | 'l' | 'ml' | 'unit' | 'pz';

export type Department = 'Pizzeria' | 'Cucina' | 'Sala' | 'Bar' | 'Lavaggio' | 'Amministrazione';

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: string;
  deliveryDays: string[];
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  monthlySalary: number;
  contributionPercentage: number;
  department: Department;
}

export interface FixedCost {
  id: string;
  label: string;
  amount: number;
  category: string;
}

export interface BepConfig {
  fixedCosts: FixedCost[];
  foodCostIncidence: number;
  serviceIncidence: number;
  wasteIncidence: number;
  averageTicket: number;
}

export interface UserData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  foodCostThreshold: number;
  bepConfig: BepConfig;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  pricePerUnit: number;
  category: string;
  supplierId?: string;
}

export interface ComponentUsage {
  id: string;
  type: 'ingredient' | 'subrecipe' | 'menuitem';
  quantity: number;
}

export interface SubRecipe {
  id: string;
  name: string;
  components: ComponentUsage[];
  yieldWeight: number;
  initialWeight: number;
  procedure?: string;
  category: string;
}

export interface MenuItem {
  id: string;
  name: string;
  components: ComponentUsage[];
  sellingPrice: number;
  category: string;
}

export type ViewType = 'dashboard' | 'economato' | 'lab' | 'menu' | 'suppliers' | 'staff' | 'assets' | 'profile';
