import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, User, MapPin, Mail, Building2, FileText, Save, Loader2, Calendar, Users, Utensils, Plus, Minus, Package, ChefHat } from 'lucide-react';
import { Client, Quote, MenuItem, Ingredient, EventMenuItem, CustomEventDish, SubRecipe, UserData, Supplier } from '../../types';
import { fetchCRMClients } from '../../services/crm';
import { saveData } from '../../services/database';
import { Timestamp } from 'firebase/firestore';
import { calculateSubRecipeCostPerKg } from '../../services/calculator';

interface CreateQuoteViewProps {
  userId: string;
  menu?: MenuItem[];
  ingredients?: Ingredient[];
  subRecipes?: SubRecipe[];
  suppliers?: Supplier[];
  userData?: UserData;
  onSave?: (quote: Quote) => Promise<void>;
  onAddMenuItem?: (item: MenuItem) => void;
  onAddIngredient?: (ingredient: Ingredient) => Promise<string | undefined>;
  onAddSupplier?: (supplier: Supplier) => Promise<string | undefined>;
  onAddSubRecipe?: (subRecipe: SubRecipe) => void;
}

const CreateQuoteView: React.FC<CreateQuoteViewProps> = ({ 
  userId, 
  menu = [], 
  ingredients = [], 
  subRecipes = [], 
  suppliers = [],
  userData, 
  onSave,
  onAddMenuItem,
  onAddIngredient,
  onAddSupplier,
  onAddSubRecipe
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New Client Modal States
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'IT',
    vat_number: '',
  });
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Menu Evento States
  const [showEventMenu, setShowEventMenu] = useState(true);
  const [eventDate, setEventDate] = useState('');
  const [expectedPeople, setExpectedPeople] = useState<number>(0);
  const [eventMenuItems, setEventMenuItems] = useState<EventMenuItem[]>([]);
  const [customDishes, setCustomDishes] = useState<CustomEventDish[]>([]);
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [addDishSource, setAddDishSource] = useState<'menu' | 'topping' | 'economato' | null>(null);
  const [addDishSearch, setAddDishSearch] = useState('');
  const [showCustomDishModal, setShowCustomDishModal] = useState(false);
  const [showCreateRecipeModal, setShowCreateRecipeModal] = useState(false);
  const [newCustomDish, setNewCustomDish] = useState<Partial<CustomEventDish>>({
    name: '',
    description: '',
    ingredients: [],
    quantity: 1,
    unitPrice: 0,
  });

  // Fetch all clients on mount (solo per l'utente corrente)
  useEffect(() => {
    const loadClients = async () => {
      if (!userId) {
        console.warn('[CreateQuoteView] userId non disponibile');
        return;
      }
      
      setIsLoading(true);
      try {
        // Passa userId per caricare solo i clienti dell'utente
        const fetchedClients = await fetchCRMClients(undefined, userId);
        setClients(fetchedClients);
        setFilteredClients(fetchedClients);
      } catch (error) {
        console.error('Error loading clients:', error);
        alert('Errore nel caricamento dei clienti. Verifica la configurazione CRM.');
      } finally {
        setIsLoading(false);
      }
    };
    loadClients();
  }, [userId]);

  // Filter clients based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.vat_number?.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query)
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setSearchQuery(client.name);
    setIsSearchOpen(false);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleCreateNewClient = async () => {
    if (!newClient.name || !newClient.name.trim()) {
      alert('Il nome del cliente è obbligatorio.');
      return;
    }

    setIsSavingClient(true);
    try {
      const clientToSave: any = {
        id: `client_${Date.now()}`,
        name: newClient.name.trim(),
        email: newClient.email?.trim() || '',
        phone: newClient.phone?.trim() || '',
        address: newClient.address?.trim() || '',
        city: newClient.city?.trim() || '',
        postalCode: newClient.postalCode?.trim() || '',
        country: newClient.country || 'IT',
        vat_number: newClient.vat_number?.trim() || '',
        source: 'manual',
        importedAt: Timestamp.now(),
        userId: userId,
        updatedAt: Timestamp.now(),
      };

      // Salva il cliente in Firestore
      const savedId = await saveData(userId, 'crmClients', clientToSave);
      
      // Aggiorna la lista clienti
      const fetchedClients = await fetchCRMClients(undefined, userId);
      setClients(fetchedClients);
      setFilteredClients(fetchedClients);

      // Seleziona automaticamente il nuovo cliente
      const createdClient = { ...clientToSave, id: savedId };
      handleClientSelect(createdClient);

      // Reset form e chiudi modal
      setNewClient({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
        country: 'IT',
        vat_number: '',
      });
      setShowNewClientModal(false);

      alert('✅ Cliente creato con successo!');
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Errore nella creazione del cliente.');
    } finally {
      setIsSavingClient(false);
    }
  };

  // Menu Evento Handlers
  const handleAddMenuItem = (itemId: string, source: 'menu' | 'topping') => {
    let name = '';
    let price = 0;

    if (source === 'menu') {
      const menuItem = menu.find(m => m.id === itemId);
      if (menuItem) {
        name = menuItem.name;
        price = menuItem.sellingPrice;
      }
    } else if (source === 'topping') {
      const subRecipe = subRecipes.find(s => s.id === itemId);
      if (subRecipe) {
        name = subRecipe.name;
        // Per i topping potremmo non avere un prezzo diretto, usa 0 o calcola dal costo
        price = 0; // Potresti calcolare il prezzo dal costo del subRecipe se necessario
      }
    }

    if (name) {
      const menuItem = menu.find(m => m.id === itemId);
      const subRecipe = subRecipes.find(s => s.id === itemId);
      const newItem: EventMenuItem = {
        menuItemId: itemId,
        menuItemName: name,
        portion: 'full',
        quantity: expectedPeople || 1,
        unitPrice: price,
        total: price * (expectedPeople || 1)
      };

      // Controlla se già esiste
      if (!eventMenuItems.find(item => item.menuItemId === itemId)) {
        setEventMenuItems([...eventMenuItems, newItem]);
      }
      setShowAddDishModal(false);
      setAddDishSource(null);
      setAddDishSearch('');
    }
  };

  const handleRecipeSaved = (menuItem: MenuItem) => {
    // Aggiungi al menu se onAddMenuItem è disponibile
    if (onAddMenuItem) {
      onAddMenuItem(menuItem);
    }
    
    // Aggiungi automaticamente al menu evento
    const newItem: EventMenuItem = {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      portion: 'full',
      quantity: expectedPeople || 1,
      unitPrice: menuItem.sellingPrice || 0,
      total: (menuItem.sellingPrice || 0) * (expectedPeople || 1)
    };

    // Controlla se già esiste
    if (!eventMenuItems.find(item => item.menuItemId === menuItem.id)) {
      setEventMenuItems([...eventMenuItems, newItem]);
    }
    
    // Chiudi il form
    setShowCreateRecipeModal(false);
  };

  const handleRemoveMenuItem = (menuItemId: string) => {
    setEventMenuItems(eventMenuItems.filter(item => item.menuItemId !== menuItemId));
  };

  const handlePortionChange = (menuItemId: string, portion: 'full' | 'half' | 'quarter') => {
    setEventMenuItems(items => items.map(item => {
      if (item.menuItemId === menuItemId) {
        const menuItem = menu.find(m => m.id === menuItemId);
        const basePrice = menuItem?.sellingPrice || 0;
        let unitPrice = basePrice;
        if (portion === 'half') {
          unitPrice = basePrice / 2;
        } else if (portion === 'quarter') {
          unitPrice = basePrice / 4;
        }
        return {
          ...item,
          portion,
          unitPrice,
          total: unitPrice * item.quantity
        };
      }
      return item;
    }));
  };

  const handleQuantityChange = (menuItemId: string, quantity: number) => {
    setEventMenuItems(items => items.map(item => {
      if (item.menuItemId === menuItemId) {
        return {
          ...item,
          quantity: Math.max(1, quantity),
          total: item.unitPrice * Math.max(1, quantity)
        };
      }
      return item;
    }));
  };

  const handleAddCustomDish = () => {
    if (!newCustomDish.name || newCustomDish.ingredients?.length === 0) {
      alert('Inserisci nome e almeno un ingrediente per il piatto personalizzato.');
      return;
    }

    const dish: CustomEventDish = {
      id: `dish_${Date.now()}`,
      name: newCustomDish.name || '',
      description: newCustomDish.description,
      ingredients: newCustomDish.ingredients || [],
      quantity: newCustomDish.quantity || 1,
      unitPrice: newCustomDish.unitPrice || 0,
      total: (newCustomDish.unitPrice || 0) * (newCustomDish.quantity || 1)
    };

    setCustomDishes([...customDishes, dish]);
    setNewCustomDish({
      name: '',
      description: '',
      ingredients: [],
      quantity: 1,
      unitPrice: 0,
    });
    setShowCustomDishModal(false);
  };

  const handleRemoveCustomDish = (dishId: string) => {
    setCustomDishes(customDishes.filter(d => d.id !== dishId));
  };

  const handleSaveDraft = async () => {
    if (!selectedClient) {
      alert('Seleziona un cliente prima di salvare il preventivo.');
      return;
    }

    // Valida menu evento
    if (!eventDate) {
      alert('Inserisci la data dell\'evento.');
      return;
    }
    if (!expectedPeople || expectedPeople < 1) {
      alert('Inserisci il numero di persone previste.');
      return;
    }
      if (eventMenuItems.length === 0) {
        alert('Aggiungi almeno un piatto dal menu.');
        return;
      }

    setIsSaving(true);
    try {
      const draftQuote: Quote = {
        id: `quote_${Date.now()}`,
        clientId: selectedClient.id,
        client: selectedClient,
        status: 'draft',
        items: [],
        subtotal: 0,
        total: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
        eventDate: eventDate ? Timestamp.fromDate(new Date(eventDate)) : undefined,
        expectedPeople: expectedPeople || undefined,
        eventMenuItems: eventMenuItems.length > 0 ? eventMenuItems : undefined,
      };

      // Save to Firestore
      await saveData(userId, 'quotes', draftQuote);

      // Call optional onSave callback
      if (onSave) {
        await onSave(draftQuote);
      }

      alert('✅ Preventivo salvato come bozza con successo!');
      
      // Reset form
      handleClearClient();
      setEventDate('');
      setExpectedPeople(0);
      setEventMenuItems([]);
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Errore nel salvataggio del preventivo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      {/* Client Selection Section */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <div className="relative" ref={dropdownRef}>
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cerca cliente per nome, email, P.IVA o indirizzo..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-gray-300 focus:outline-none"
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            {searchQuery && (
              <button
                onClick={handleClearClient}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            )}
            <button 
              onClick={() => setShowNewClientModal(true)} 
              className="bg-black text-white p-2 rounded-xl shadow-lg active:scale-90 transition-transform"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Dropdown Results */}
        {isSearchOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-2" />
                  <p className="text-xs font-bold text-gray-400">Caricamento clienti...</p>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs font-bold text-gray-400">
                    {searchQuery ? 'Nessun cliente trovato' : 'Nessun cliente disponibile'}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {filteredClients.slice(0, 10).map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm uppercase">
                          {client.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-black truncate">{client.name}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {client.vat_number && (
                              <span className="text-[9px] font-black uppercase text-gray-400">
                                P.IVA: {client.vat_number}
                              </span>
                            )}
                            {client.city && (
                              <span className="text-[9px] font-black uppercase text-gray-400">
                                {client.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredClients.length > 10 && (
                    <div className="px-6 py-3 text-center">
                      <p className="text-[9px] font-black uppercase text-gray-300">
                        Mostrati 10 di {filteredClients.length} clienti
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Quote Header Card - Shows selected client details */}
      {selectedClient && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2.5rem] p-8 shadow-sm border border-blue-100 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-600/60 mb-1">
                  Dettagli Preventivo
                </h3>
                <p className="text-lg font-black text-black tracking-tight">
                  {selectedClient.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="bg-black text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Salva Bozza</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedClient.address && (
              <div className="flex items-start space-x-3">
                <MapPin className="text-blue-600 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">Indirizzo</p>
                  <p className="text-sm font-bold text-black">{selectedClient.address}</p>
                  {selectedClient.postalCode && selectedClient.city && (
                    <p className="text-xs font-bold text-gray-600 mt-1">
                      {selectedClient.postalCode} {selectedClient.city}
                      {selectedClient.country && selectedClient.country !== 'IT' && `, ${selectedClient.country}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedClient.vat_number && (
              <div className="flex items-start space-x-3">
                <Building2 className="text-blue-600 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">P.IVA / VAT Number</p>
                  <p className="text-sm font-black text-black">{selectedClient.vat_number}</p>
                </div>
              </div>
            )}

            {selectedClient.email && (
              <div className="flex items-start space-x-3">
                <Mail className="text-blue-600 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">Email</p>
                  <p className="text-sm font-bold text-black">{selectedClient.email}</p>
                </div>
              </div>
            )}

            {selectedClient.phone && (
              <div className="flex items-start space-x-3">
                <User className="text-blue-600 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">Telefono</p>
                  <p className="text-sm font-bold text-black">{selectedClient.phone}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-blue-200">
            <p className="text-[8px] font-black uppercase text-blue-600/40 tracking-widest">
              Questo preventivo sarà salvato come bozza. Potrai aggiungere prodotti e finalizzarlo in seguito.
            </p>
          </div>
        </div>
      )}

      {/* Event Menu Section - Always visible */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-[2.5rem] p-8 shadow-sm border border-purple-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Utensils className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-purple-600/60 mb-1">
                Menu Evento
              </h3>
              <p className="text-lg font-black text-black tracking-tight">
                Crea un menu personalizzato per l'evento
              </p>
            </div>
          </div>

          {/* Event Info Form */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-purple-600/60 mb-2 block flex items-center gap-2">
                  <Calendar size={12} />
                  Data Evento
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-purple-600/60 mb-2 block flex items-center gap-2">
                  <Users size={12} />
                  Persone Previste
                </label>
                <input
                  type="number"
                  min="1"
                  value={expectedPeople || ''}
                  onChange={(e) => {
                    const people = parseInt(e.target.value) || 0;
                    setExpectedPeople(people);
                    // Aggiorna quantità per tutti gli items
                    setEventMenuItems(items => items.map(item => ({
                      ...item,
                      quantity: people,
                      total: item.unitPrice * people
                    })));
                  }}
                  className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            {/* Add Dishes Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setAddDishSource('menu');
                  setShowAddDishModal(true);
                  setAddDishSearch('');
                }}
                className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-xl text-xs font-black flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <Utensils size={18} />
                <span>Menu</span>
              </button>
            </div>
          </div>

          {/* Menu Items List */}
          {eventMenuItems.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-black uppercase text-purple-600/60 mb-3">Piatti dal Menu</h4>
              <div className="bg-white rounded-xl p-4 space-y-3 border border-purple-100">
                {eventMenuItems.map((item) => {
                  const menuItem = menu.find(m => m.id === item.menuItemId);
                  return (
                    <div key={item.menuItemId} className="border-b border-purple-50 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-black">{item.menuItemName}</span>
                          <button
                            onClick={() => handleRemoveMenuItem(item.menuItemId)}
                            className="p-1 hover:bg-red-50 rounded text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <span className="text-sm font-black text-purple-600">€{item.total.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-gray-600">Porzione:</label>
                          <button
                            onClick={() => handlePortionChange(item.menuItemId, 'full')}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                              item.portion === 'full'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            Intera
                          </button>
                          <button
                            onClick={() => handlePortionChange(item.menuItemId, 'half')}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                              item.portion === 'half'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            1/2
                          </button>
                          <button
                            onClick={() => handlePortionChange(item.menuItemId, 'quarter')}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                              item.portion === 'quarter'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            1/4
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-gray-600">Qty:</label>
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg">
                            <button
                              onClick={() => handleQuantityChange(item.menuItemId, item.quantity - 1)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Minus size={16} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.menuItemId, parseInt(e.target.value) || 1)}
                              className="w-12 text-center text-sm font-black bg-transparent border-none focus:outline-none"
                            />
                            <button
                              onClick={() => handleQuantityChange(item.menuItemId, item.quantity + 1)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-gray-500 ml-auto">
                          €{item.unitPrice.toFixed(2)} {
                            item.portion === 'half' ? '/ 1/2' : 
                            item.portion === 'quarter' ? '/ 1/4' : 
                            '/ pz'
                          }
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

      </div>

      {/* Add Dish Modal (Menu) */}
      {showAddDishModal && addDishSource === 'menu' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-black">
                Aggiungi da Menu
              </h3>
              <button
                onClick={() => {
                  setShowAddDishModal(false);
                  setAddDishSource(null);
                  setAddDishSearch('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cerca piatto del menu..."
                value={addDishSearch}
                onChange={(e) => setAddDishSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {menu
                .filter(m => m.name.toLowerCase().includes(addDishSearch.toLowerCase()))
                .filter(m => !eventMenuItems.find(item => item.menuItemId === m.id))
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleAddMenuItem(m.id, 'menu')}
                    className="w-full bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-xl p-4 text-left transition-all active:scale-95"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-black">{m.name}</p>
                        <p className="text-xs font-semibold text-gray-500 mt-1">{m.category}</p>
                      </div>
                      <span className="text-sm font-black text-purple-600">€{m.sellingPrice.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Dish Modal */}
      {showCustomDishModal && (() => {
        // Calcola costo totale del piatto personalizzato
        const calculateCustomDishCost = (): number => {
          if (!newCustomDish.ingredients || newCustomDish.ingredients.length === 0) return 0;
          
          return newCustomDish.ingredients.reduce((total, ing) => {
            const ingredient = ingredients.find(i => i.id === ing.ingredientId);
            if (!ingredient) return total;
            
            // Converti quantità in base all'unità
            let quantityInKg = 0;
            if (ingredient.unit === 'kg' || ingredient.unit === 'l') {
              quantityInKg = ing.quantity;
            } else if (ingredient.unit === 'g' || ingredient.unit === 'ml') {
              // Per grammi e ml, converti a kg/l (dividi per 1000)
              quantityInKg = ing.quantity / 1000;
            } else {
              // Per unità (pz, etc.), usa direttamente la quantità (supponendo che il prezzo sia già per unità)
              quantityInKg = ing.quantity;
            }
            
            return total + (ingredient.pricePerUnit * quantityInKg);
          }, 0);
        };

        const totalCost = calculateCustomDishCost();
        const bepConfig = userData?.bepConfig || { foodCostIncidence: 30, serviceIncidence: 5, wasteIncidence: 2 };
        const foodCostIncidence = bepConfig.foodCostIncidence || 30;
        const serviceIncidence = bepConfig.serviceIncidence || 5;
        const wasteIncidence = bepConfig.wasteIncidence || 2;
        const totalVariableIncidence = foodCostIncidence + serviceIncidence + wasteIncidence;

        // Prezzo consigliato
        const recommendedPrice = totalCost > 0 && foodCostIncidence > 0
          ? totalCost / (foodCostIncidence / 100)
          : 0;

        // Food Cost attuale (solo se prezzo è impostato)
        const currentFoodCost = newCustomDish.unitPrice && newCustomDish.unitPrice > 0
          ? (totalCost / newCustomDish.unitPrice) * 100
          : 0;

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-black">Nuovo Piatto Personalizzato</h3>
                <button
                  onClick={() => setShowCustomDishModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Nome Piatto</label>
                <input
                  type="text"
                  value={newCustomDish.name || ''}
                  onChange={(e) => setNewCustomDish({...newCustomDish, name: e.target.value})}
                  placeholder="Es: Antipasto Misto"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Descrizione (opzionale)</label>
                <textarea
                  value={newCustomDish.description || ''}
                  onChange={(e) => setNewCustomDish({...newCustomDish, description: e.target.value})}
                  placeholder="Descrizione del piatto..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-gray-400 mb-3 block">INGREDIENTI DALL'ECONOMATO</label>
                
                {/* Ingredienti Aggiunti */}
                {newCustomDish.ingredients && newCustomDish.ingredients.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {newCustomDish.ingredients.map((ing, idx) => {
                      const ingredient = ingredients.find(i => i.id === ing.ingredientId);
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
                          <span className="text-sm font-bold text-black flex-1">{ingredient?.name || ing.ingredientName}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={ing.quantity}
                            onChange={(e) => {
                              const updated = [...(newCustomDish.ingredients || [])];
                              updated[idx] = {...ing, quantity: parseFloat(e.target.value) || 0};
                              setNewCustomDish({...newCustomDish, ingredients: updated});
                            }}
                            className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-center"
                          />
                          <span className="text-xs font-semibold text-gray-500">{ing.unit}</span>
                          <button
                            onClick={() => {
                              const updated = (newCustomDish.ingredients || []).filter((_, i) => i !== idx);
                              setNewCustomDish({...newCustomDish, ingredients: updated});
                            }}
                            className="p-1 hover:bg-red-50 rounded text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                  
                {/* Ingredienti Disponibili */}
                <div>
                  <label className="text-xs font-black uppercase text-gray-400 mb-3 block">Aggiungi Ingrediente</label>
                    <div className="max-h-64 overflow-y-auto bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      {ingredients
                        .filter(ing => !newCustomDish.ingredients?.find(i => i.ingredientId === ing.id))
                        .length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-xs font-bold text-gray-400">Tutti gli ingredienti sono stati aggiunti</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {ingredients
                            .filter(ing => !newCustomDish.ingredients?.find(i => i.ingredientId === ing.id))
                            .map((ing) => (
                              <button
                                key={ing.id}
                                onClick={() => {
                                  const updated = [...(newCustomDish.ingredients || []), {
                                    ingredientId: ing.id,
                                    ingredientName: ing.name,
                                    quantity: 0,
                                    unit: ing.unit
                                  }];
                                  setNewCustomDish({...newCustomDish, ingredients: updated});
                                }}
                                className="bg-indigo-600 text-white px-4 py-3 rounded-xl text-xs font-black flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-indigo-700"
                                title={ing.name}
                              >
                                <Package size={18} />
                                <span className="truncate w-full text-center leading-tight">{ing.name}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

              {/* Costo Totale e Prezzo Consigliato */}
              {newCustomDish.ingredients && newCustomDish.ingredients.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  {/* Costo Totale Portata */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Costo Totale Portata</span>
                      <span className="text-[10px] font-black uppercase text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        Materie Prime
                      </span>
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-black text-green-700 tracking-tight">
                        €{totalCost.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold mt-2">
                      Costo totale di tutti gli ingredienti utilizzati
                    </p>
                  </div>

                  {/* Prezzo Consigliato */}
                  {recommendedPrice > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Prezzo Consigliato</span>
                        <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                          Asset Cost {totalVariableIncidence}%
                        </span>
                      </div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-black text-black tracking-tight">
                          €{recommendedPrice.toFixed(2)}
                        </span>
                        <button
                          onClick={() => setNewCustomDish({
                            ...newCustomDish,
                            unitPrice: Math.round(recommendedPrice * 2) / 2,
                            total: Math.round(recommendedPrice * 2) / 2 * (newCustomDish.quantity || 1)
                          })}
                          className="ml-auto bg-purple-600 text-white px-3 py-1.5 rounded-xl text-xs font-black active:scale-95 transition-all"
                        >
                          Applica
                        </button>
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold mt-2">
                        Calcolato per rispettare Food Cost {foodCostIncidence}% (Asset totale: {totalVariableIncidence}%)
                      </p>
                    </div>
                  )}

                  {/* Prezzo Vendita e Food Cost Attuale */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-4 rounded-2xl text-center">
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Prezzo Vendita</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newCustomDish.unitPrice || ''}
                        onChange={(e) => {
                          const price = parseFloat(e.target.value) || 0;
                          setNewCustomDish({
                            ...newCustomDish,
                            unitPrice: price,
                            total: price * (newCustomDish.quantity || 1)
                          });
                        }}
                        className="w-full bg-transparent border-none text-xl font-black text-black text-center p-0 focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl text-center flex flex-col justify-center">
                      <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">Food Cost Attuale</span>
                      <p className={`text-xl font-black ${
                        currentFoodCost <= 25 ? 'text-green-600' : 
                        currentFoodCost <= 35 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {newCustomDish.unitPrice && newCustomDish.unitPrice > 0 ? `${currentFoodCost.toFixed(1)}%` : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddCustomDish}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all"
                >
                  Aggiungi Piatto
                </button>
                <button
                  onClick={() => setShowCustomDishModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-sm active:scale-95 transition-all"
                >
                  Annulla
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Empty State */}
      {!selectedClient && !isLoading && (
        <div className="bg-gray-50 rounded-[2.5rem] p-12 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="text-gray-400" size={32} />
          </div>
          <p className="text-sm font-bold text-gray-400 mb-4">
            Seleziona un cliente per iniziare a creare un preventivo
          </p>
          <button
            onClick={() => setShowNewClientModal(true)}
            className="bg-black text-white px-6 py-3 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all mx-auto"
          >
            <Plus size={18} />
            <span>Crea Nuovo Cliente</span>
          </button>
        </div>
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-black">Nuovo Cliente</h3>
              <button
                onClick={() => {
                  setShowNewClientModal(false);
                  setNewClient({
                    name: '',
                    email: '',
                    phone: '',
                    address: '',
                    city: '',
                    postal_code: '',
                    country: 'IT',
                    vat_number: '',
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-gray-400 mb-2 block">
                  Nome Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newClient.name || ''}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  placeholder="Es: Mario Rossi SRL"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Email</label>
                  <input
                    type="email"
                    value={newClient.email || ''}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    placeholder="mario@example.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Telefono</label>
                  <input
                    type="tel"
                    value={newClient.phone || ''}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    placeholder="+39 123 456 7890"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Indirizzo</label>
                <input
                  type="text"
                  value={newClient.address || ''}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                  placeholder="Via Roma, 123"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-gray-400 mb-2 block">CAP</label>
                  <input
                    type="text"
                    value={newClient.postalCode || ''}
                    onChange={(e) => setNewClient({...newClient, postalCode: e.target.value})}
                    placeholder="00100"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Città</label>
                  <input
                    type="text"
                    value={newClient.city || ''}
                    onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                    placeholder="Roma"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Paese</label>
                  <input
                    type="text"
                    value={newClient.country || 'IT'}
                    onChange={(e) => setNewClient({...newClient, country: e.target.value})}
                    placeholder="IT"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-gray-400 mb-2 block">P.IVA / VAT Number</label>
                <input
                  type="text"
                  value={newClient.vat_number || ''}
                  onChange={(e) => setNewClient({...newClient, vat_number: e.target.value})}
                  placeholder="IT12345678901"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateNewClient}
                  disabled={isSavingClient || !newClient.name?.trim()}
                  className="flex-1 bg-black text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingClient ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Salvataggio...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Salva Cliente</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowNewClientModal(false);
                    setNewClient({
                      name: '',
                      email: '',
                      phone: '',
                      address: '',
                      city: '',
                      postal_code: '',
                      country: 'IT',
                      vat_number: '',
                    });
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-sm active:scale-95 transition-all"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Recipe Modal */}
      {showCreateRecipeModal && onAddMenuItem && onAddIngredient && onAddSupplier && onAddSubRecipe && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white rounded-t-[3rem] shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[95vh] pb-12 scrollbar-hide relative">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 mt-4" />
            
            <header className="flex justify-between items-center mb-8 px-8">
              <h3 className="text-3xl font-black tracking-tighter">Nuova Ricetta</h3>
              <button 
                onClick={() => setShowCreateRecipeModal(false)} 
                className="bg-gray-100 p-2 rounded-full text-gray-400 hover:bg-gray-200 transition-colors"
              >
                <X size={24}/>
              </button>
            </header>

            <div className="px-8 pb-8">
              <p className="text-sm text-gray-600 font-semibold mb-6">
                Crea una nuova ricetta che verrà aggiunta automaticamente al menu e al menu evento corrente.
              </p>
              
              {/* Button to navigate to MenuView */}
              <button
                onClick={() => {
                  // Qui possiamo aprire MenuView in una nuova vista o modal
                  // Per ora, suggeriamo all'utente di creare la ricetta nel menu e poi tornare
                  setShowCreateRecipeModal(false);
                  // TODO: Implementare la navigazione a MenuView o creare il form inline
                  alert('Funzionalità in sviluppo: il form di creazione ricetta verrà implementato qui. Per ora, crea la ricetta nella sezione Menu e poi aggiungila al menu evento.');
                }}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all mb-4"
              >
                Vai alla Creazione Ricetta
              </button>
              
              <button
                onClick={() => setShowCreateRecipeModal(false)}
                className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black active:scale-95 transition-all"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateQuoteView;

