
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

// Product Mix Types per Pricing Calculator
export interface ProductCategory {
  id: string;
  nome: string;
  emoji: string;
  incidenzaFatturato: number;  // % del fatturato totale (somma deve essere 100)
  prezzoMedio: number;         // Prezzo medio di vendita
  foodCostTarget: number;      // % food cost target per categoria
  costiVariabili: {
    packaging: boolean;        // Applica costo packaging
    sfrido: boolean;           // Applica costo sfrido
    delivery: boolean;         // Applica costo delivery (se abilitato)
  };
  volumeUnitario: number;      // Unità vendute per coperto (es: 1.0 pizza, 1.5 beverage)
}

export interface ProductMix {
  volumeMensile: number;       // Numero coperti al mese
  categorie: ProductCategory[];
}

export interface BepConfig {
  fixedCosts: FixedCost[];
  foodCostIncidence: number;
  serviceIncidence: number;
  wasteIncidence: number;
  averageTicket: number;
  deliveryEnabled?: boolean;
  deliveryIncidence?: number;
  productMix?: ProductMix;     // Configurazione product mix per pricing
}

export interface BusinessConfig {
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  googlePlaceId?: string;
  tripadvisorId?: string;
  tripadvisorUrl?: string;
  googleUrl?: string;
  website?: string;
}

export interface UserData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  foodCostThreshold: number;
  bepConfig: BepConfig;
  businessConfig?: BusinessConfig;
  telegramChatId?: string; // Chat ID Telegram per notifiche bot
}

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  pricePerUnit: number;
  category: string;
  supplierId?: string;
  currentStock?: number; // Stock attuale (opzionale per retrocompatibilità)
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
  cassetteInfo?: string; // Info cassetta per impasti (es: "Cassetta 1/3 - 12 pz")
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
  // Dati completi del calcolatore avanzato (opzionale, solo per ricette create con AdvancedDoughCalculator)
  advancedCalculatorData?: {
    hydration: number;
    calculation: any; // DoughCalculationResult
    management?: any; // Management data (preferment, autolysis, mixing, puntata, appretto, cooking)
    preferment?: any; // Preferment data
  };
}

export interface MenuItem {
  id: string;
  name: string;
  components: ComponentUsage[];
  sellingPrice: number;
  category: string;
  isDelivery?: boolean;
}

// Marketing & Reviews Types
export type ReviewPlatform = 'tripadvisor' | 'google';

export interface Review {
  id: string;
  platform: ReviewPlatform;
  author: string;
  authorAvatar?: string;
  rating: number; // 1-5 stelle
  date: Date | any;
  title?: string; // Solo TripAdvisor
  text: string;
  language: string;
  reply?: ReviewReply;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[]; // Estratti da AI
}

export interface ReviewReply {
  text: string;
  date: Date | any;
  author: string; // Nome ristorante/owner
}

export interface RestaurantSearchResult {
  id: string;
  name: string;
  address: string;
  city: string;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  platform: 'tripadvisor' | 'google';
}

export interface PlatformConnection {
  id: string;
  platform: ReviewPlatform;
  isConnected: boolean;
  restaurantId?: string; // TripAdvisor location ID o Google Place ID
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantCity?: string;
  lastSync?: Date | any;
  totalReviews?: number;
  averageRating?: number;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  replyRate: number; // Percentuale recensioni con risposta
  lastUpdate: Date | any;
}

export interface AIReviewResponse {
  suggestedText: string;
  tone: 'formal' | 'friendly' | 'apologetic';
  keyPoints: string[];
  sentiment: string;
}

// Quotes & CRM Types
export interface Client {
  id: string;
  name: string;
  address?: string;
  email?: string;
  vat_number?: string; // P.IVA
  phone?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string; // e.g., 'pz', 'kg', 'h'
  total: number;
}

export interface Quote {
  id: string;
  quoteNumber?: string; // Numero preventivo (es. PREV-2024-001)
  clientId: string;
  client: Client; // Snapshot dei dati cliente al momento della creazione
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  items: QuoteItem[];
  subtotal: number;
  taxRate?: number; // Percentuale IVA (es. 22%)
  taxAmount?: number;
  total: number;
  notes?: string;
  validUntil?: Date | any; // Data di scadenza del preventivo
  createdAt: Date | any;
  updatedAt: Date | any;
  createdBy: string; // userId
}

export type ViewType = 'dashboard' | 'economato' | 'lab' | 'menu' | 'laboratorio' | 'inventario' | 'inventario-magazzino' | 'inventario-etichette' | 'inventario-scan' | 'warehouse' | 'fifo-labels' | 'custom-labels' | 'scan' | 'prep-settings' | 'settings' | 'settings-prefermenti' | 'settings-assets' | 'settings-staff' | 'settings-suppliers' | 'profile' | 'marketing' | 'marketing-overview' | 'marketing-google' | 'quotes' | 'create-quote' | 'import-clients' | 'clients';
