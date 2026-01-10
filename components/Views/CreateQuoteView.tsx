import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, User, MapPin, Mail, Building2, FileText, Save, Loader2, Calendar, Users, Utensils, Plus, Minus, Package, ChefHat, Coffee, Printer, Edit2, Phone } from 'lucide-react';
import { Client, Quote, MenuItem, Ingredient, EventMenuItem, EventBeverage, CustomEventDish, SubRecipe, UserData, Supplier } from '../../types';
import { fetchCRMClients } from '../../services/crm';
import { saveData } from '../../services/database';
import { Timestamp } from 'firebase/firestore';
import { calculateSubRecipeCostPerKg } from '../../services/calculator';
import ConfirmationModal, { AlertModal } from '../ConfirmationModal';

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
  onNavigateToHistory?: () => void;
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
  onAddSubRecipe,
  onNavigateToHistory
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
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
    variant?: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onClose: () => {},
  });

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
  const [expectedPeople, setExpectedPeople] = useState<number>(1);
  const [coverCost, setCoverCost] = useState<number>(2);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [eventMenuItems, setEventMenuItems] = useState<EventMenuItem[]>([]);
  const [eventBeverages, setEventBeverages] = useState<EventBeverage[]>([]);
  const [customDishes, setCustomDishes] = useState<CustomEventDish[]>([]);
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [addDishSource, setAddDishSource] = useState<'menu' | 'topping' | 'beverage' | null>(null);
  const [addDishSearch, setAddDishSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCustomDishModal, setShowCustomDishModal] = useState(false);
  const [showCreateRecipeModal, setShowCreateRecipeModal] = useState(false);
  const [showManualProductModal, setShowManualProductModal] = useState(false);
  const [newCustomDish, setNewCustomDish] = useState<Partial<CustomEventDish>>({
    name: '',
    description: '',
    ingredients: [],
    quantity: 1,
    unitPrice: 0,
  });
  const [manualProduct, setManualProduct] = useState({
    name: '',
    price: 0,
    portion: 'full' as 'full' | 'half' | 'quarter',
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
        showAlert('Errore', 'Errore nel caricamento dei clienti. Verifica la configurazione CRM.', () => {}, 'danger');
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
      // Non chiudere se c'è un cliente selezionato
      if (selectedClient) return;
      
      // Verifica se il click è dentro il dropdown
      const target = event.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }
      
      // Verifica se il click è dentro l'input di ricerca
      if (searchInputRef.current && searchInputRef.current.contains(target)) {
        return;
      }
      
      // Verifica se il click è dentro il dropdown dei risultati
      const dropdownResults = document.querySelector('[data-dropdown-results]');
      if (dropdownResults && dropdownResults.contains(target)) {
        return;
      }
      
      // Chiudi il dropdown solo se il click è fuori da tutto
      setIsSearchOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedClient]);

  // Helper functions per mostrare modali
  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Conferma', cancelText = 'Annulla', variant: 'danger' | 'warning' | 'info' = 'warning') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm();
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
      variant,
    });
  };

  const showAlert = (title: string, message: string, onClose = () => {}, variant: 'danger' | 'warning' | 'info' | 'success' = 'info') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      buttonText: 'Ok',
      onClose: () => {
        onClose();
        setAlertModal({ ...alertModal, isOpen: false });
      },
      variant,
    });
  };

  const handleClientSelect = (client: Client) => {
    console.log('Selecting client:', client);
    // Usa una funzione per assicurarsi che lo stato venga aggiornato correttamente
    setSelectedClient(() => client);
    setSearchQuery(() => '');
    setIsSearchOpen(() => false);
    // Piccolo delay per assicurarsi che lo stato sia aggiornato prima di fare altre operazioni
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.blur();
        searchInputRef.current.value = '';
      }
    }, 0);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleCreateNewClient = async () => {
    if (!newClient.name || !newClient.name.trim()) {
      showAlert('Campo Obbligatorio', 'Il nome del cliente è obbligatorio.', () => {}, 'warning');
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

      showAlert('Cliente Creato', 'Cliente creato con successo!', () => {}, 'success');
    } catch (error) {
      console.error('Error creating client:', error);
      showAlert('Errore', 'Errore nella creazione del cliente.', () => {}, 'danger');
    } finally {
      setIsSavingClient(false);
    }
  };

  // Menu Evento Handlers
  const handleAddBeverage = (ingredientId: string) => {
    const beverage = ingredients.find(i => i.id === ingredientId);
    if (!beverage) return;

    // Calcola quantità: 1 bevuta per persona = 20cl = 0.2 litri
    const quantityInLiters = (expectedPeople || 1) * 0.2;
    
    // Converti il prezzo dell'ingrediente (che è per unità, probabilmente per litro o per unità)
    // Se l'unità è 'l' o 'ml', usa direttamente il prezzo per unità
    // Se l'unità è 'pz' o altro, potrebbe essere necessario adattare
    let pricePerLiter = beverage.pricePerUnit || 0;
    
    // Se l'unità è ml, il prezzo è per ml, quindi per litro è pricePerUnit * 1000
    if (beverage.unit === 'ml') {
      pricePerLiter = beverage.pricePerUnit * 1000;
    } else if (beverage.unit === 'g') {
      // Se è in grammi, assumiamo che sia simile (ma non dovrebbe essere per bevande)
      pricePerLiter = beverage.pricePerUnit;
    }
    // Se l'unità è 'l' o 'pz', usa direttamente il prezzo

    const newBeverage: EventBeverage = {
      beverageId: ingredientId,
      beverageName: beverage.name,
      quantity: quantityInLiters,
      unitPrice: pricePerLiter,
      total: pricePerLiter * quantityInLiters
    };

    // Controlla se già esiste
    if (!eventBeverages.find(b => b.beverageId === ingredientId)) {
      setEventBeverages([...eventBeverages, newBeverage]);
    }
    
    setShowAddDishModal(false);
    setAddDishSource(null);
    setAddDishSearch('');
  };

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
      
      // Controlla se è un beverage (per categoria)
      const isBeverage = menuItem?.category?.toLowerCase() === 'beverage' || 
                         menuItem?.category?.toLowerCase() === 'bevande' ||
                         menuItem?.category?.toLowerCase() === 'bevande/beverage';
      
      // Controlla se è un topping (source === 'topping' o categoria === 'topping')
      const isTopping = source === 'topping' || 
                        menuItem?.category?.toLowerCase() === 'topping';
      
      // Per i topping, calcola il prezzo dal costo del subRecipe se disponibile
      let finalPrice = price;
      if (isTopping && subRecipe && ingredients) {
        const costPerKg = calculateSubRecipeCostPerKg(subRecipe, ingredients, subRecipes);
        // Se c'è un portionWeight, calcola il prezzo per porzione
        if (subRecipe.portionWeight) {
          finalPrice = (costPerKg * subRecipe.portionWeight) / 1000; // portionWeight è in grammi
        } else {
          // Fallback: usa un prezzo basato sul costo
          finalPrice = costPerKg * 0.1; // Assumiamo 100g come porzione standard
        }
      }
      
      // Per beverage e topping, usa sempre porzione 1/2 e calcola il prezzo di conseguenza
      const portion = (isBeverage || isTopping) ? 'half' : 'full';
      const unitPrice = (isBeverage || isTopping) ? finalPrice / 2 : finalPrice;
      
      const newItem: EventMenuItem = {
        menuItemId: itemId,
        menuItemName: name,
        portion: portion,
        quantity: expectedPeople || 1,
        unitPrice: unitPrice,
        total: unitPrice * (expectedPeople || 1)
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
    
    // Controlla se è un beverage o topping
    const isBeverage = menuItem.category?.toLowerCase() === 'beverage' || 
                       menuItem.category?.toLowerCase() === 'bevande' ||
                       menuItem.category?.toLowerCase() === 'bevande/beverage';
    const isTopping = menuItem.category?.toLowerCase() === 'topping';
    const portion = (isBeverage || isTopping) ? 'half' : 'full';
    const basePrice = menuItem.sellingPrice || 0;
    const unitPrice = (isBeverage || isTopping) ? basePrice / 2 : basePrice;
    
    // Aggiungi automaticamente al menu evento
    const newItem: EventMenuItem = {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      portion: portion,
      quantity: expectedPeople || 1,
      unitPrice: unitPrice,
      total: unitPrice * (expectedPeople || 1)
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

  const handleAddManualProduct = () => {
    if (!manualProduct.name || !manualProduct.price || manualProduct.price <= 0) {
      showAlert('Campo Obbligatorio', 'Inserisci nome e prezzo validi per il prodotto.', () => {}, 'warning');
      return;
    }

    let unitPrice = manualProduct.price;
    if (manualProduct.portion === 'half') {
      unitPrice = manualProduct.price / 2;
    } else if (manualProduct.portion === 'quarter') {
      unitPrice = manualProduct.price / 4;
    }

    const newItem: EventMenuItem = {
      menuItemId: `manual_${Date.now()}`,
      menuItemName: manualProduct.name,
      portion: manualProduct.portion,
      quantity: expectedPeople || 1,
      unitPrice: unitPrice,
      total: unitPrice * (expectedPeople || 1)
    };

    setEventMenuItems([...eventMenuItems, newItem]);
    setShowManualProductModal(false);
    setManualProduct({
      name: '',
      price: 0,
      portion: 'full',
    });
  };

  const calculateEventMenuTotal = () => {
    const menuTotal = eventMenuItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const beveragesTotal = eventBeverages.reduce((sum, beverage) => sum + (beverage.total || 0), 0);
    const customDishesTotal = customDishes.reduce((sum, dish) => sum + (dish.total || 0), 0);
    // NON includere il costo del coperto nel totale, solo mostrarlo come voce separata
    const total = menuTotal + beveragesTotal + customDishesTotal;
    return total;
  };

  // Calcola il totale finale (menu + costo coperto) - usa finalPrice se modificato manualmente
  const calculateFinalTotal = () => {
    if (finalPrice !== null) {
      return finalPrice;
    }
    const menuTotal = calculateEventMenuTotal();
    const coverCostValue = coverCost !== null && coverCost !== undefined ? parseFloat(String(coverCost)) || 0 : 0;
    const expectedPeopleValue = expectedPeople !== null && expectedPeople !== undefined ? parseInt(String(expectedPeople)) || 0 : 0;
    const coverTotal = coverCostValue * expectedPeopleValue;
    return menuTotal + coverTotal;
  };

  const handlePrintQuote = () => {
    if (!selectedClient) {
      showAlert('Cliente Mancante', 'Seleziona un cliente prima di stampare il preventivo.', () => {}, 'warning');
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showAlert('Avviso', 'Impossibile aprire la finestra di stampa. Verifica che i popup non siano bloccati.', () => {}, 'warning');
        return;
      }

    const menuItemsHtml = eventMenuItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.menuItemName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const beveragesHtml = eventBeverages.map(beverage => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${beverage.beverageName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${beverage.quantity.toFixed(2)}l</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${beverage.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const coverCostHtml = coverCost && expectedPeople ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">Costo Coperto</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${expectedPeople} pz</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${((coverCost || 0) * (expectedPeople || 0)).toFixed(2)}</td>
      </tr>
    ` : '';

    const total = calculateFinalTotal();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Preventivo - ${selectedClient.name}</title>
          <style>
            @media print {
              body { margin: 0; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 24px; margin-bottom: 10px; }
            h2 { font-size: 18px; color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: bold; }
            .total { font-size: 20px; font-weight: bold; margin-top: 20px; text-align: right; }
            .client-info { margin-bottom: 30px; }
            .client-info p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <h1>PREVENTIVO</h1>
          <div class="client-info">
            <h2>Cliente</h2>
            <p><strong>${selectedClient.name}</strong></p>
            ${selectedClient.address ? `<p>${selectedClient.address}</p>` : ''}
            ${selectedClient.city ? `<p>${selectedClient.city}${selectedClient.postalCode ? ' ' + selectedClient.postalCode : ''}</p>` : ''}
            ${selectedClient.vat_number ? `<p>P.IVA: ${selectedClient.vat_number}</p>` : ''}
          </div>
          ${eventDate ? `<p><strong>Data Evento:</strong> ${new Date(eventDate).toLocaleDateString('it-IT')}</p>` : ''}
          ${expectedPeople ? `<p><strong>Persone Previste:</strong> ${expectedPeople}</p>` : ''}
          <table>
            <thead>
              <tr>
                <th>Descrizione</th>
                <th style="text-align: center;">Quantità</th>
                <th style="text-align: right;">Totale</th>
              </tr>
            </thead>
            <tbody>
              ${menuItemsHtml}
              ${beveragesHtml}
              ${coverCostHtml}
            </tbody>
          </table>
          <div class="total">
            <strong>TOTALE: €${total.toFixed(2)}</strong>
          </div>
        </body>
      </html>
    `);
      printWindow.document.close();
      
      // Usa requestAnimationFrame per assicurarsi che il contenuto sia caricato prima di stampare
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          try {
            printWindow.print();
          } catch (err) {
            console.error('Errore durante la stampa:', err);
            showAlert('Errore Stampa', 'Errore durante la stampa. Prova a utilizzare la funzione di stampa del browser manualmente.', () => {}, 'danger');
          }
        }, 500);
      });

      // Fallback per browser che non supportano l'evento load
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (err) {
          console.error('Errore durante la stampa:', err);
        }
      }, 1000);
    } catch (error) {
      console.error('Errore durante la creazione della finestra di stampa:', error);
      showAlert('Errore Stampa', 'Errore durante la stampa. Prova a utilizzare la funzione di stampa del browser manualmente.', () => {}, 'danger');
    }
  };

  const handlePortionChange = (menuItemId: string, portion: 'full' | 'half' | 'quarter') => {
    setEventMenuItems(items => items.map(item => {
      if (item.menuItemId === menuItemId) {
        const menuItem = menu.find(m => m.id === menuItemId);
        const subRecipe = subRecipes.find(s => s.id === menuItemId);
        // Se è un beverage o topping, non permettere il cambio di porzione
        const isBeverage = menuItem?.category?.toLowerCase() === 'beverage' || 
                           menuItem?.category?.toLowerCase() === 'bevande' ||
                           menuItem?.category?.toLowerCase() === 'bevande/beverage';
        const isTopping = subRecipe !== undefined || 
                          menuItem?.category?.toLowerCase() === 'topping';
        if (isBeverage || isTopping) {
          return item; // Mantieni la porzione a 1/2
        }
        
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
      showAlert('Campo Obbligatorio', 'Inserisci nome e almeno un ingrediente per il piatto personalizzato.', () => {}, 'warning');
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
      showAlert('Cliente Mancante', 'Seleziona un cliente prima di salvare il preventivo.', () => {}, 'warning');
      return;
    }

    // Valida menu evento
    if (!eventDate) {
      showAlert('Campo Obbligatorio', 'Inserisci la data dell\'evento.', () => {}, 'warning');
      return;
    }
    if (!expectedPeople || expectedPeople < 1) {
      showAlert('Campo Obbligatorio', 'Inserisci il numero di persone previste.', () => {}, 'warning');
      return;
    }
      if (eventMenuItems.length === 0) {
        showAlert('Menu Vuoto', 'Aggiungi almeno un piatto dal menu.', () => {}, 'warning');
        return;
      }

    setIsSaving(true);
    try {
      const finalTotal = finalPrice !== null ? finalPrice : calculateFinalTotal();
      
      const draftQuote: Quote = {
        id: `quote_${Date.now()}`,
        clientId: selectedClient.id,
        client: selectedClient,
        status: 'draft',
        items: [],
        subtotal: calculateEventMenuTotal(),
        total: finalTotal,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
        eventDate: eventDate ? Timestamp.fromDate(new Date(eventDate)) : undefined,
        expectedPeople: expectedPeople || undefined,
        coverCost: coverCost || undefined,
        eventMenuItems: eventMenuItems.length > 0 ? eventMenuItems : undefined,
        eventBeverages: eventBeverages.length > 0 ? eventBeverages : undefined,
      };

      // Save to Firestore
      await saveData(userId, 'quotes', draftQuote);

      // Call optional onSave callback
      if (onSave) {
        await onSave(draftQuote);
      }

      showAlert('Preventivo Salvato', 'Preventivo salvato come bozza con successo!', () => {}, 'success');
      
      // Reset form
      handleClearClient();
      setEventDate('');
      setExpectedPeople(0);
      setCoverCost(0);
      setEventMenuItems([]);
      setEventBeverages([]);
    } catch (error) {
      console.error('Error saving quote:', error);
      showAlert('Errore', 'Errore nel salvataggio del preventivo.', () => {}, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      {/* Header con pulsante Storico Preventivi */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => {
            if (onNavigateToHistory) {
              onNavigateToHistory();
            } else {
              console.warn('onNavigateToHistory not provided');
            }
          }}
          className="flex items-center gap-2 px-4 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg"
        >
          <FileText size={18} />
          <span>Storico Preventivi</span>
        </button>
      </div>

      {/* Client Selection Section */}
      {!selectedClient ? (
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
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
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
          {isSearchOpen && searchQuery && filteredClients.length > 0 && !isLoading && !selectedClient && (
            <div 
              data-dropdown-results
              className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-96 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="py-2">
                {filteredClients.slice(0, 10).map((client) => (
                  <button
                    key={client.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Client clicked:', client);
                      // Usa un timeout per assicurarsi che l'evento venga gestito prima del click outside
                      setTimeout(() => {
                        handleClientSelect(client);
                      }, 0);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    type="button"
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 active:bg-gray-100"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-base uppercase shadow-sm">
                        {client.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-black truncate">{client.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {client.city && (
                            <span className="text-xs font-medium text-gray-500">
                              {client.city}
                            </span>
                          )}
                          {client.vat_number && (
                            <span className="text-xs font-medium text-gray-500">
                              P.IVA: {client.vat_number}
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
            </div>
          )}
        </div>
      ) : (
        /* Cliente Selezionato - Stile Apple */
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-lg uppercase shadow-sm">
                {selectedClient.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-base font-black text-black">{selectedClient.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  {selectedClient.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="text-gray-400" size={12} />
                      <span className="text-xs font-medium text-gray-500">{selectedClient.city}</span>
                    </div>
                  )}
                  {selectedClient.vat_number && (
                    <span className="text-xs font-medium text-gray-500">
                      P.IVA: {selectedClient.vat_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClearClient();
                // Piccolo delay per assicurarsi che lo stato sia aggiornato
                setTimeout(() => {
                  setIsSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }, 0);
              }}
              type="button"
              className="ml-4 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-black text-gray-600 transition-all flex items-center gap-2 border border-gray-200"
            >
              <Edit2 size={14} />
              <span>Cambia</span>
            </button>
          </div>
        </div>
      )}

      {/* Quote Header Card - Shows selected client details */}
      {selectedClient && (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 animate-in slide-in-from-top duration-300">
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
              PREVENTIVO
            </h3>
            <p className="text-2xl font-black text-black tracking-tight">
              Menu Evento
            </p>
          </div>

          {/* Cliente Info - Nome, Telefono */}
          {selectedClient.phone && (
            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-base uppercase shadow-sm flex-shrink-0">
                  {selectedClient.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">INTESTATARIO</p>
                  <p className="text-base font-black text-black mb-3">{selectedClient.name}</p>
                  <div className="flex items-center gap-2">
                    <Phone className="text-gray-400" size={14} />
                    <span className="text-sm font-bold text-gray-700">{selectedClient.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block flex items-center gap-2">
                    <Calendar size={12} />
                    Data Evento
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block flex items-center gap-2">
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
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block flex items-center gap-2">
                    <FileText size={12} />
                    Costo Coperto
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={coverCost !== null && coverCost !== undefined ? coverCost : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === null) {
                        setCoverCost(0);
                      } else {
                        const numValue = parseFloat(value);
                        setCoverCost(isNaN(numValue) ? 0 : numValue);
                      }
                    }}
                    placeholder="0.00"
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/5"
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
                  setSelectedCategory(null);
                }}
                className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-xl text-xs font-black flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <Utensils size={18} />
                <span>Menu</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Opening manual product modal');
                  setShowManualProductModal(true);
                  setManualProduct({
                    name: '',
                    price: 0,
                    portion: 'full',
                  });
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all border border-gray-200"
                type="button"
              >
                <Plus size={18} />
                <span>Manuale</span>
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
                  const subRecipe = subRecipes.find(s => s.id === item.menuItemId);
                  const isBeverage = menuItem?.category?.toLowerCase() === 'beverage' || 
                                   menuItem?.category?.toLowerCase() === 'bevande' ||
                                   menuItem?.category?.toLowerCase() === 'bevande/beverage';
                  const isTopping = subRecipe !== undefined || 
                                   menuItem?.category?.toLowerCase() === 'topping';
                  
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
                        {!(isBeverage || isTopping) ? (
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
                        ) : (
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-600">Porzione:</label>
                            <span className="px-3 py-1 rounded-lg text-xs font-black bg-purple-600 text-white">
                              1/2
                            </span>
                          </div>
                        )}
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
                            (isBeverage || isTopping) ? '/ 1/2' :
                            item.portion === 'half' ? '/ 1/2' : 
                            item.portion === 'quarter' ? '/ 1/4' : 
                            '/ pz'
                          }
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {/* Pulsante + per aggiungere prodotto manuale */}
                <div className="pt-3 border-t border-purple-50 mt-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Opening manual product modal from list');
                      setShowManualProductModal(true);
                      setManualProduct({
                        name: '',
                        price: 0,
                        portion: 'full',
                      });
                    }}
                    type="button"
                    className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all border border-gray-200 active:scale-95"
                  >
                    <Plus size={18} />
                    <span>Aggiungi Prodotto Manuale</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Beverages Section */}
          {eventBeverages.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-black uppercase text-blue-600/60 mb-3">Bevande</h4>
              <div className="bg-white rounded-xl p-4 space-y-3 border border-blue-100">
                {eventBeverages.map((beverage) => (
                  <div key={beverage.beverageId} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-black text-black">{beverage.beverageName}</p>
                        <p className="text-xs font-semibold text-gray-500">
                          {beverage.quantity.toFixed(2)}l ({(beverage.quantity / 0.2).toFixed(0)} persone × 20cl)
                        </p>
                      </div>
                      <button
                        onClick={() => setEventBeverages(eventBeverages.filter(b => b.beverageId !== beverage.beverageId))}
                        className="p-1 hover:bg-red-100 rounded-full text-red-500 transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-600">Qty (l):</label>
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200">
                          <button
                            onClick={() => {
                              const newQuantity = Math.max(0.2, beverage.quantity - 0.2);
                              setEventBeverages(eventBeverages.map(b => 
                                b.beverageId === beverage.beverageId 
                                  ? { ...b, quantity: newQuantity, total: b.unitPrice * newQuantity }
                                  : b
                              ));
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            min="0.2"
                            step="0.2"
                            value={beverage.quantity.toFixed(2)}
                            onChange={(e) => {
                              const newQuantity = Math.max(0.2, parseFloat(e.target.value) || 0.2);
                              setEventBeverages(eventBeverages.map(b => 
                                b.beverageId === beverage.beverageId 
                                  ? { ...b, quantity: newQuantity, total: b.unitPrice * newQuantity }
                                  : b
                              ));
                            }}
                            className="w-16 text-center text-sm font-black bg-transparent border-none focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const newQuantity = beverage.quantity + 0.2;
                              setEventBeverages(eventBeverages.map(b => 
                                b.beverageId === beverage.beverageId 
                                  ? { ...b, quantity: newQuantity, total: b.unitPrice * newQuantity }
                                  : b
                              ));
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      <span className="text-sm font-black text-blue-600">
                        €{beverage.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totale Menu Evento */}
          {(eventMenuItems.length > 0 || eventBeverages.length > 0 || coverCost || expectedPeople) && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-gray-600">Totale Menu Evento</span>
                <span className="text-lg font-black text-green-600">
                  €{calculateEventMenuTotal().toFixed(2)}
                </span>
              </div>
              <div className="pt-3 border-t border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-gray-600">Totale Finale</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={finalPrice !== null ? finalPrice : calculateFinalTotal()}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === null) {
                          setFinalPrice(null);
                        } else {
                          const numValue = parseFloat(value);
                          setFinalPrice(isNaN(numValue) ? null : numValue);
                        }
                      }}
                      className="w-32 bg-white border-2 border-green-300 rounded-xl px-4 py-2 text-2xl font-black text-green-700 text-right focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    <button
                      onClick={() => {
                        const currentTotal = finalPrice !== null ? finalPrice : calculateFinalTotal();
                        setFinalPrice(Math.round(currentTotal));
                      }}
                      className="px-3 py-2 bg-green-200 hover:bg-green-300 text-green-700 rounded-lg text-xs font-black transition-all active:scale-95"
                      title="Arrotonda all'intero"
                    >
                      ≈
                    </button>
                    <button
                      onClick={() => {
                        setFinalPrice(null);
                      }}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-black transition-all active:scale-95"
                      title="Ripristina totale calcolato"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                {finalPrice !== null && finalPrice !== calculateFinalTotal() && (
                  <div className="text-[10px] text-gray-500 font-semibold mt-2">
                    Totale calcolato: €{calculateFinalTotal().toFixed(2)} | Differenza: €{(finalPrice - calculateFinalTotal()).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons - Alla fine del modulo */}
          {selectedClient && (
            <div className="flex gap-3 pt-6 border-t border-gray-100">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex-1 bg-black text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvataggio...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Salva Preventivo</span>
                  </>
                )}
              </button>
              <button
                onClick={handlePrintQuote}
                disabled={!selectedClient || (eventMenuItems.length === 0 && eventBeverages.length === 0)}
                className="flex-1 bg-purple-600 text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={16} />
                <span>Stampa</span>
              </button>
            </div>
          )}
        </div>

      {/* Add Dish Modal (Menu) */}
      {showAddDishModal && addDishSource === 'menu' && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
                showConfirm(
                  'Chiudere Creazione',
                  'Le modifiche non salvate andranno perse.',
                  () => {
                    setShowAddDishModal(false);
                    setAddDishSource(null);
                    setAddDishSearch('');
                    setSelectedCategory(null);
                  },
                  'Chiudi',
                  'Annulla',
                  'warning'
                );
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-black">
                Aggiungi Piatto
              </h3>
              <button
                onClick={() => {
                showConfirm(
                  'Chiudere Creazione',
                  'Le modifiche non salvate andranno perse.',
                  () => {
                    setShowAddDishModal(false);
                    setAddDishSource(null);
                    setAddDishSearch('');
                    setSelectedCategory(null);
                  },
                  'Chiudi',
                  'Annulla',
                  'warning'
                );
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Category Selector */}
            {(() => {
              const categories = [...new Set(menu.map(m => m.category))].sort();
              return categories.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                        selectedCategory === null
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Tutte
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          selectedCategory === cat
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mb-4 relative">
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
                .filter(m => !selectedCategory || m.category === selectedCategory)
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
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                showConfirm(
                  'Chiudere Creazione',
                  'Le modifiche non salvate andranno perse.',
                  () => {
                    setShowCustomDishModal(false);
                    setNewCustomDish({
                      name: '',
                      description: '',
                      ingredients: [],
                      quantity: 1,
                      unitPrice: 0,
                    });
                  },
                  'Chiudi',
                  'Annulla',
                  'warning'
                );
              }
            }}
          >
            <div 
              className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-black">Nuovo Piatto Personalizzato</h3>
                <button
                  onClick={() => {
                    showConfirm(
                      'CHIUDERE CREAZIONE',
                      'Le modifiche non salvate andranno perse.',
                      () => {
                        setShowCustomDishModal(false);
                        setNewCustomDish({
                          name: '',
                          description: '',
                          ingredients: [],
                          quantity: 1,
                          unitPrice: 0,
                        });
                      },
                      'Chiudi',
                      'Annulla',
                      'warning'
                    );
                  }}
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
                  onClick={() => {
                    showConfirm(
                      'CHIUDERE CREAZIONE',
                      'Le modifiche non salvate andranno perse.',
                      () => {
                        setShowCustomDishModal(false);
                        setNewCustomDish({
                          name: '',
                          description: '',
                          ingredients: [],
                          quantity: 1,
                          unitPrice: 0,
                        });
                      },
                      'Chiudi',
                      'Annulla',
                      'warning'
                    );
                  }}
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


      {/* Manual Product Modal */}
      {showManualProductModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              showConfirm(
                'CHIUDERE CREAZIONE',
                'Le modifiche non salvate andranno perse.',
                () => {
                  setShowManualProductModal(false);
                  setManualProduct({
                    name: '',
                    price: 0,
                    portion: 'full',
                  });
                },
                'Chiudi',
                'Annulla',
                'warning'
              );
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-black">
                Aggiungi Prodotto Manuale
              </h3>
              <button
                onClick={() => {
                  showConfirm(
                    'CHIUDERE CREAZIONE',
                    'Le modifiche non salvate andranno perse.',
                    () => {
                      setShowManualProductModal(false);
                      setManualProduct({
                        name: '',
                        price: 0,
                        portion: 'full',
                      });
                    },
                    'Chiudi',
                    'Annulla',
                    'warning'
                  );
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-gray-400 mb-2 block">
                  Nome Prodotto
                </label>
                <input
                  type="text"
                  value={manualProduct.name}
                  onChange={(e) => setManualProduct({...manualProduct, name: e.target.value})}
                  placeholder="Es: Servizio Extra"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-gray-400 mb-2 block">
                  Prezzo (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualProduct.price || ''}
                  onChange={(e) => setManualProduct({...manualProduct, price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-gray-400 mb-3 block">
                  Porzione
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setManualProduct({...manualProduct, portion: 'full'})}
                    className={`flex-1 px-4 py-3 rounded-xl text-xs font-black transition-all ${
                      manualProduct.portion === 'full'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Intera
                  </button>
                  <button
                    onClick={() => setManualProduct({...manualProduct, portion: 'half'})}
                    className={`flex-1 px-4 py-3 rounded-xl text-xs font-black transition-all ${
                      manualProduct.portion === 'half'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    1/2
                  </button>
                  <button
                    onClick={() => setManualProduct({...manualProduct, portion: 'quarter'})}
                    className={`flex-1 px-4 py-3 rounded-xl text-xs font-black transition-all ${
                      manualProduct.portion === 'quarter'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    1/4
                  </button>
                </div>
              </div>

              {manualProduct.price > 0 && manualProduct.portion !== 'full' && (
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <div className="text-xs font-black text-purple-600 mb-1">
                    Prezzo Unitario Calcolato:
                  </div>
                  <div className="text-lg font-black text-purple-700">
                    €{(manualProduct.portion === 'half' ? manualProduct.price / 2 : manualProduct.price / 4).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowManualProductModal(false);
                    setManualProduct({
                      name: '',
                      price: 0,
                      portion: 'full',
                    });
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={handleAddManualProduct}
                  disabled={!manualProduct.name || !manualProduct.price || manualProduct.price <= 0}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              showConfirm(
                'CHIUDERE CREAZIONE',
                'Le modifiche non salvate andranno perse.',
                () => {
                  setShowNewClientModal(false);
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
                },
                'Chiudi',
                'Annulla',
                'warning'
              );
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-black">Nuovo Cliente</h3>
              <button
                onClick={() => {
                  showConfirm(
                    'CHIUDERE CREAZIONE',
                    'Le modifiche non salvate andranno perse.',
                    () => {
                      setShowNewClientModal(false);
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
                    },
                    'Chiudi',
                    'Annulla',
                    'warning'
                  );
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
        <div 
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              showConfirm(
                'CHIUDERE CREAZIONE',
                'Le modifiche non salvate andranno perse.',
                () => {
                  setShowCreateRecipeModal(false);
                },
                'Chiudi',
                'Annulla',
                'warning'
              );
            }
          }}
        >
          <div 
            className="w-full max-w-xl bg-white rounded-t-[3rem] shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[95vh] pb-12 scrollbar-hide relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 mt-4" />
            
            <header className="flex justify-between items-center mb-8 px-8">
              <h3 className="text-3xl font-black tracking-tighter">Nuova Ricetta</h3>
              <button 
                onClick={() => {
                  showConfirm(
                    'CHIUDERE CREAZIONE',
                    'Le modifiche non salvate andranno perse.',
                    () => {
                      setShowCreateRecipeModal(false);
                    },
                    'Chiudi',
                    'Annulla',
                    'warning'
                  );
                }} 
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
                  showAlert('Info', 'Funzionalità in sviluppo: il form di creazione ricetta verrà implementato qui. Per ora, crea la ricetta nella sezione Menu e poi aggiungila al menu evento.', () => {}, 'info');
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        variant={confirmModal.variant}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        buttonText={alertModal.buttonText}
        onClose={alertModal.onClose}
        variant={alertModal.variant}
      />
    </div>
  );
};

export default CreateQuoteView;

