
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
  deliveryEnabled?: boolean;
  deliveryIncidence?: number;
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

export interface Preparation extends SubRecipe {
  isActive: boolean; // Switch ON/OFF per attivare in magazzino
  minStock: number; // Soglia alert scorte basse
  currentStock: number; // Giacenza attuale
  unit: 'pz' | 'kg' | 'l';
}

export interface FifoLabel {
  id: string;
  preparationId: string;
  preparationName: string;
  qrCode: string; // Codice univoco per scan (formato: "FIFO:prepId_timestamp_idx")
  barcode: string; // Barcode numerico per alternative scan
  expiryDate: Date | any; // Data scadenza (può essere Timestamp Firebase)
  createdAt: Date | any;
  createdBy: string; // userId
  status: 'active' | 'consumed' | 'expired';
  consumedAt?: Date | any;
  consumedBy?: string; // userId + nome operatore
}

export interface StockMovement {
  id: string;
  type: 'load' | 'unload'; // Carico (da etichetta) o Scarico (da scan)
  preparationId: string;
  preparationName: string;
  quantity: number;
  userId: string;
  userName: string;
  timestamp: Date | any;
  notes?: string;
  labelId?: string; // Reference a etichetta se da scan
}

export interface StockAlert {
  preparationId: string;
  preparationName: string;
  currentStock: number;
  minStock: number;
  missingQuantity: number;
  ingredientsNeeded: {
    ingredientId: string;
    ingredientName: string;
    quantityNeeded: number;
    unit: string;
  }[];
}

export interface SubRecipe {
  id: string;
  name: string;
  components: ComponentUsage[];
  yieldWeight: number;
  initialWeight: number;
  procedure?: string;
  category: string;
  portionWeight?: number; // Peso porzione in grammi (per ricette laboratorio)
  shelfLife?: number; // Durata del prodotto in giorni una volta messo nei contenitori di linea
  fifoLabel?: boolean; // Flag per creare etichetta FIFO
}

export interface MenuItem {
  id: string;
  name: string;
  components: ComponentUsage[];
  sellingPrice: number;
  category: string;
  isDelivery?: boolean;
}

export type ViewType = 'dashboard' | 'economato' | 'lab' | 'menu' | 'laboratorio' | 'inventario' | 'inventario-magazzino' | 'inventario-etichette' | 'inventario-scan' | 'warehouse' | 'fifo-labels' | 'scan' | 'prep-settings' | 'settings' | 'settings-prefermenti' | 'settings-assets' | 'settings-staff' | 'settings-suppliers' | 'profile';
