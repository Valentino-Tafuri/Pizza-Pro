
import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { AlertCircle } from 'lucide-react';
import Layout from './components/Layout';
import AuthView from './components/AuthView';
import DashboardView from './components/Views/DashboardView';
import MenuView from './components/Views/MenuView';
import LabView from './components/Views/LabView';
import LabCalculatorView from './components/Views/LabCalculatorView';
import EconomatoView from './components/Views/EconomatoView';
import SettingsView from './components/Views/SettingsView';
import ProfileView from './components/Views/ProfileView';
import WarehouseView from './components/Views/WarehouseView';
import FifoLabelsView from './components/Views/FifoLabelsView';
import CustomLabelsView from './components/Views/CustomLabelsView';
import ScanView from './components/Views/ScanView';
import StockAlerts from './components/StockAlerts';
import PreparationSettingsView from './components/Views/PreparationSettingsView';
import MarketingOverview from './components/Views/Marketing/MarketingOverview';
import GoogleView from './components/Views/Marketing/GoogleView';
import { syncData, saveData, deleteData, deleteAllData } from './services/database';
import { ViewType, Ingredient, SubRecipe, MenuItem, Supplier, Employee, UserData, Preparation, FifoLabel, StockMovement, Review, PlatformConnection, ReviewStats, ReviewPlatform, AIReviewResponse } from './types';
import { generateReviewResponse } from './services/aiReviewResponder';
import { MOCK_GOOGLE_CONNECTION } from './services/mockReviewsData';
import { INITIAL_USER } from './constants';
import { getActivePreparations, PreparationSettings } from './utils/preparationConverter';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbError, setDbError] = useState<any>(null);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [preferments, setPreferments] = useState<any[]>([]);
  const [preparationSettings, setPreparationSettings] = useState<Map<string, PreparationSettings>>(new Map());
  const [fifoLabels, setFifoLabels] = useState<FifoLabel[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [userData, setUserData] = useState<UserData>(INITIAL_USER);
  
  // Marketing & Reviews State
  const [platformConnections, setPlatformConnections] = useState<{
    google: PlatformConnection;
  }>({
    google: { id: 'google-conn', platform: 'google', isConnected: false }
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
    replyRate: 0,
    lastUpdate: new Date()
  });

  // Crea preparations da subRecipes usando settings
  const preparations = useMemo(() => 
    getActivePreparations(subRecipes, preparationSettings),
    [subRecipes, preparationSettings]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, `users/${u.uid}`);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData({
            ...INITIAL_USER,
            ...data,
            bepConfig: {
              ...INITIAL_USER.bepConfig,
              ...(data.bepConfig || {})
            }
          });
        } else {
          await setDoc(userRef, INITIAL_USER);
          setUserData(INITIAL_USER);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubIng = syncData(user.uid, 'ingredients', setIngredients);
    const unsubSub = syncData(user.uid, 'subRecipes', setSubRecipes);
    const unsubMenu = syncData(user.uid, 'menu', setMenu);
    const unsubSup = syncData(user.uid, 'suppliers', setSuppliers);
    const unsubEmp = syncData(user.uid, 'employees', setEmployees);
    const unsubPref = syncData(user.uid, 'preferments', setPreferments);
    const unsubSettings = syncData(user.uid, 'preparationSettings', (data: PreparationSettings[]) => {
      console.log('[App] PreparationSettings sincronizzate:', data.length);
      const map = new Map<string, PreparationSettings>();
      data.forEach(item => map.set(item.id, item));
      setPreparationSettings(map);
    });
    const unsubLabels = syncData(user.uid, 'fifoLabels', setFifoLabels);
    const unsubMov = syncData(user.uid, 'stockMovements', setStockMovements);
    const unsubPlatformConn = syncData(user.uid, 'platformConnections', (data: PlatformConnection[]) => {
      console.log('[App] PlatformConnections sincronizzate:', data.length);
      const googleConn = data.find(c => c.platform === 'google');
      setPlatformConnections({
        google: googleConn || MOCK_GOOGLE_CONNECTION
      });
    });
    
    // Esponi funzione di pulizia economato globalmente per uso dalla console
    (window as any).cleanupUserEconomato = async (uid: string) => {
      if (!uid) {
        console.error('❌ UID utente richiesto');
        return 0;
      }
      console.log(`🧹 Inizio pulizia economato per utente: ${uid}`);
      try {
        const deletedCount = await deleteAllData(uid, 'ingredients');
        console.log(`✅ Pulizia completata! Eliminati ${deletedCount} ingredienti.`);
        return deletedCount;
      } catch (error) {
        console.error('❌ Errore durante la pulizia:', error);
        throw error;
      }
    };
    
    return () => {
      unsubIng(); unsubSub(); unsubMenu(); unsubSup(); unsubEmp(); unsubPref();
      unsubSettings(); unsubLabels(); unsubMov(); unsubPlatformConn();
      delete (window as any).cleanupUserEconomato;
    };
  }, [user]);

  if (authLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>;
  if (!user) return <AuthView />;

  const handleSignOut = () => signOut(auth);
  const handleUpdateUserData = async (newData: Partial<UserData>) => {
    const updated = { ...userData, ...newData };
    setUserData(updated);
    if (user) await setDoc(doc(db, `users/${user.uid}`), updated);
  };
  
  // Definire handleSave PRIMA delle altre funzioni che lo usano
  const handleSave = async (col: string, item: any) => {
    if (!user) throw new Error("User not available");
    console.log(`[App] handleSave chiamato per collezione: ${col}`, item);
    if (col === 'subRecipes' && item.fifoLabel !== undefined) {
      console.log(`[App] ⚠️ SubRecipe con fifoLabel=${item.fifoLabel} salvato:`, item.name);
    }
    try {
      const result = await saveData(user.uid, col, item);
      console.log(`[App] Salvataggio completato con ID: ${result}`);
      return result;
    } catch (error) {
      console.error(`[App] Errore nel salvataggio:`, error);
      throw error;
    }
  };
  
  const handleDelete = async (col: string, id: string) => {
    if (!user) return;
    await deleteData(user.uid, col, id);
  };

  // Handler per toggle preparazione
  const handleTogglePreparation = async (subRecipeId: string, isActive: boolean) => {
    if (!user) return;
    
    const current = preparationSettings.get(subRecipeId) || { 
      id: subRecipeId,
      isActive: false, 
      minStock: 5, 
      currentStock: 0 
    };
    
    const updated: PreparationSettings = { ...current, isActive };
    
    await handleSave('preparationSettings', updated);
    
    setPreparationSettings(prev => new Map(prev).set(subRecipeId, updated));
  };

  // Handler per update stock
  const handleUpdateStock = async (prepId: string, newStock: number, note: string) => {
    if (!user) return;
    
    const current = preparationSettings.get(prepId) || { 
      id: prepId,
      isActive: false, 
      minStock: 5, 
      currentStock: 0 
    };
    
    const oldStock = current.currentStock;
    const updated: PreparationSettings = { ...current, currentStock: newStock };
    
    await handleSave('preparationSettings', updated);
    
    setPreparationSettings(prev => new Map(prev).set(prepId, updated));
    
    // Crea movimento stock con nota
    const prep = preparations.find(p => p.id === prepId);
    if (prep) {
      const userName = `${userData.firstName} ${userData.lastName}`;
      const movementType = newStock > oldStock ? 'load' : 'unload';
      const quantity = Math.abs(newStock - oldStock);
      
      await handleSave('stockMovements', {
        id: `mov_${Date.now()}`,
        type: movementType,
        preparationId: prepId,
        preparationName: prep.name,
        quantity: quantity,
        userId: user.uid,
        userName: userName,
        timestamp: Timestamp.now(),
        notes: note || `Stock modificato da ${oldStock} a ${newStock}`
      });
    }
  };

  const handleGenerateLabels = async (labels: FifoLabel[], stockQuantity: number = 1) => {
    if (!user) {
      console.error('[App] handleGenerateLabels: user non disponibile');
      throw new Error('Utente non autenticato');
    }

    if (!labels || labels.length === 0) {
      console.error('[App] handleGenerateLabels: nessuna etichetta da salvare');
      throw new Error('Nessuna etichetta da salvare');
    }

    console.log('[App] handleGenerateLabels chiamato con', labels.length, 'etichette, stockQuantity:', stockQuantity);
    
    const userName = `${userData.firstName} ${userData.lastName}`;
    
    try {
      // Salva tutte le labels con createdBy
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        console.log(`[App] Salvataggio etichetta ${i + 1}/${labels.length}:`, label.id);
        
        const labelWithUser = {
          ...label,
          createdBy: user.uid,
          createdAt: Timestamp.fromDate(new Date(label.createdAt)),
          expiryDate: Timestamp.fromDate(new Date(label.expiryDate))
        };
        
        await handleSave('fifoLabels', labelWithUser);
        console.log(`[App] Etichetta ${i + 1} salvata con successo`);
      }
      
      // Aggiorna stock preparazione (per tutti i tipi: impasti e topping)
      const prepId = labels[0].preparationId;
      const prep = preparations.find(p => p.id === prepId);

      if (prep) {
        const isImpasto = !!prep.advancedCalculatorData;
        const unitLabel = isImpasto ? 'cassette' : 'unità';

        console.log('[App] Aggiornamento stock per preparazione:', prep.name, 'da', prep.currentStock, 'a', prep.currentStock + stockQuantity, `(${unitLabel})`);
        const newStock = prep.currentStock + stockQuantity;
        await handleUpdateStock(prepId, newStock, `Carico automatico: ${stockQuantity} ${unitLabel} da etichetta FIFO`);

        // Crea movimento carico
        const movementId = `mov_${Date.now()}`;
        await handleSave('stockMovements', {
          id: movementId,
          type: 'load' as const,
          preparationId: prepId,
          preparationName: prep.name,
          quantity: stockQuantity,
          userId: user.uid,
          userName: userName,
          timestamp: Timestamp.now()
        });
        console.log('[App] Movimento carico creato:', movementId, '- Quantità:', stockQuantity, unitLabel);
      } else {
        console.warn('[App] Preparazione non trovata per ID:', prepId);
      }
      
      console.log('[App] ✅ Tutte le etichette generate e salvate con successo');
    } catch (error) {
      console.error('[App] ❌ Errore in handleGenerateLabels:', error);
      throw error;
    }
  };

  const handleScanLabel = async (labelId: string, userId: string) => {
    if (!user) return;

    // Trova label
    const label = fifoLabels.find(l => l.id === labelId);
    if (!label) {
      console.error('[App] Etichetta non trovata:', labelId);
      return;
    }

    if (label.status !== 'active') {
      console.warn('[App] Etichetta non attiva:', label.status);
      return;
    }

    // Check scadenza
    const expiryDate = label.expiryDate?.toDate?.() || new Date(label.expiryDate);
    if (expiryDate < new Date()) {
      console.warn('[App] Prodotto scaduto');
      await handleSave('fifoLabels', {
        ...label,
        status: 'expired',
        expiryDate: label.expiryDate
      });
      return;
    }

    // Scarica stock preparazione
    const prep = preparations.find(p => p.id === label.preparationId);
    if (prep && prep.currentStock > 0) {
      await handleUpdateStock(prep.id, prep.currentStock - 1, `Scarico automatico da scan etichetta FIFO`);

      const userName = `${userData.firstName} ${userData.lastName}`;

      // Aggiorna label
      await handleSave('fifoLabels', {
        ...label,
        status: 'consumed',
        consumedAt: Timestamp.now(),
        consumedBy: userName,
        expiryDate: label.expiryDate
      });

      // Crea movimento scarico
      await handleSave('stockMovements', {
        id: `mov_${Date.now()}`,
        type: 'unload' as const,
        preparationId: prep.id,
        preparationName: prep.name,
        quantity: 1,
        userId: user.uid,
        userName: userName,
        timestamp: Timestamp.now(),
        labelId: label.id
      });

      // Scarica ingredienti usati dalla ricetta (proporzionale a 1 unità)
      const subRecipe = subRecipes.find(sr => sr.id === label.preparationId);
      if (subRecipe && subRecipe.components && subRecipe.components.length > 0) {
        console.log('[App] Scarico ingredienti per ricetta:', subRecipe.name);

        // Calcola il fattore di scala: 1 unità rispetto alla resa totale
        // yieldWeight è in kg, portionWeight è in grammi
        const portionWeight = subRecipe.portionWeight || 1000; // Default 1kg se non specificato
        const yieldWeight = subRecipe.yieldWeight || 1; // kg
        const scaleFactor = (portionWeight / 1000) / yieldWeight; // Fattore per 1 porzione

        for (const component of subRecipe.components) {
          if (component.type === 'ingredient') {
            const ingredient = ingredients.find(i => i.id === component.id);
            if (ingredient && ingredient.currentStock !== undefined && ingredient.currentStock > 0) {
              // Quantità da scaricare = quantità nella ricetta * fattore di scala
              // component.quantity è in grammi
              let quantityToUnload = (component.quantity / 1000) * scaleFactor; // Converti in kg

              // Converti in base all'unità dell'ingrediente
              if (ingredient.unit === 'g') {
                quantityToUnload = component.quantity * scaleFactor;
              } else if (ingredient.unit === 'ml') {
                quantityToUnload = component.quantity * scaleFactor;
              } else if (ingredient.unit === 'l') {
                quantityToUnload = (component.quantity / 1000) * scaleFactor;
              } else if (ingredient.unit === 'unit' || ingredient.unit === 'pz') {
                quantityToUnload = Math.ceil(component.quantity * scaleFactor);
              }

              // Arrotonda a 3 decimali
              quantityToUnload = Math.round(quantityToUnload * 1000) / 1000;

              if (quantityToUnload > 0) {
                const newStock = Math.max(0, ingredient.currentStock - quantityToUnload);
                console.log(`[App] Scarico ingrediente ${ingredient.name}: ${quantityToUnload} ${ingredient.unit} (${ingredient.currentStock} -> ${newStock})`);

                await handleSave('ingredients', {
                  ...ingredient,
                  currentStock: newStock
                });
              }
            }
          }
        }
      }

      console.log('[App] Scarico completato:', prep.name);
    }
  };

  // Marketing Handlers
  const handleConnectPlatform = async (
    platform: ReviewPlatform, 
    restaurantData: {
      id: string;
      name: string;
      address: string;
      city: string;
      rating: number;
      reviewCount: number;
    }
  ) => {
    if (!user) return;
    
    const connection: PlatformConnection = {
      id: `${platform}-conn`,
      platform,
      isConnected: true,
      restaurantId: restaurantData.id,
      restaurantName: restaurantData.name,
      restaurantAddress: restaurantData.address,
      restaurantCity: restaurantData.city,
      totalReviews: restaurantData.reviewCount,
      averageRating: restaurantData.rating,
      lastSync: new Date()
    };
    
    await handleSave('platformConnections', connection);
    
    setPlatformConnections(prev => ({
      ...prev,
      [platform]: connection
    }));
    
    alert(`✅ Attività collegata! Sincronizzazione recensioni in corso...`);
  };

  const handleGenerateAIResponse = async (review: Review): Promise<AIReviewResponse> => {
    // Usa il nome dell'attività configurato, altrimenti fallback al nome utente
    const restaurantName = userData.businessConfig?.name ||
      (userData.firstName ? `${userData.firstName}'s Restaurant` : 'Il Ristorante');
    return await generateReviewResponse(review, restaurantName);
  };

  const handleSyncReviews = async (platform: ReviewPlatform) => {
    alert(`🔄 Sincronizzazione Google in corso...\n\nNota: Per ora vengono usati dati mock. L'integrazione con le API reali sarà disponibile in futuro.`);
  };

  const handleSaveBusinessConfig = async (config: any) => {
    await handleUpdateUserData({ businessConfig: config });
  };

  const handleDisconnectPlatform = async (platform: 'google') => {
    const disconnectedConnection: PlatformConnection = {
      id: `${platform}-conn`,
      platform,
      isConnected: false
    };

    setPlatformConnections(prev => ({
      ...prev,
      [platform]: disconnectedConnection
    }));

    // Salva in Firestore
    if (user) {
      await handleSave('platformConnections', disconnectedConnection);
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView 
        menu={menu} 
        ingredients={ingredients} 
        subRecipes={subRecipes} 
        userData={userData} 
        employees={employees}
        reviews={reviews}
        reviewStats={reviewStats}
        onViewAllReviews={() => setActiveView('marketing-overview')}
      />;
      case 'economato': return <EconomatoView ingredients={ingredients} suppliers={suppliers} onUpdate={(i) => handleSave('ingredients', i)} onAdd={(i) => handleSave('ingredients', i)} onDelete={(id) => handleDelete('ingredients', id)} onAddSupplier={(s) => handleSave('suppliers', s)} />;
      case 'lab': return <LabView 
        subRecipes={subRecipes} 
        ingredients={ingredients} 
        suppliers={suppliers} 
        onAdd={(sub) => handleSave('subRecipes', sub)} 
        onUpdate={(sub) => handleSave('subRecipes', sub)} 
        onDelete={(id) => handleDelete('subRecipes', id)} 
        onAddIngredient={(ing) => handleSave('ingredients', ing)} 
      />;
      case 'menu': return <MenuView 
        menu={menu} 
        ingredients={ingredients} 
        subRecipes={subRecipes} 
        suppliers={suppliers} 
        userData={userData}
        onAdd={(item) => handleSave('menu', item)} 
        onUpdate={(item) => handleSave('menu', item)} 
        onDelete={(id) => handleDelete('menu', id)} 
        onAddIngredient={(ing) => handleSave('ingredients', ing)} 
        onAddSupplier={(s) => handleSave('suppliers', s)} 
        onAddSubRecipe={async (sub) => {
          const id = await handleSave('subRecipes', sub);
          return id || sub.id;
        }}
        onNavigateToLab={() => setActiveView('lab')}
      />;
      case 'laboratorio': return <LabCalculatorView 
        ingredients={ingredients} 
        subRecipes={subRecipes} 
        suppliers={suppliers} 
        preferments={preferments}
        onAdd={(sub) => handleSave('subRecipes', sub)} 
        onUpdate={(sub) => handleSave('subRecipes', sub)} 
        onDelete={(id) => handleDelete('subRecipes', id)} 
        onAddIngredient={(ing) => handleSave('ingredients', ing)} 
        onAddSupplier={(s) => handleSave('suppliers', s)}
        userData={userData}
      />;
      case 'inventario-magazzino':
      case 'warehouse': 
        return <WarehouseView
          ingredients={ingredients} 
          preparations={preparations.filter(p => p.isActive)}
          onUpdateStock={handleUpdateStock}
          onToggleActive={handleTogglePreparation}
        />;
      case 'inventario-etichette':
      case 'fifo-labels': 
        const activePreparations = preparations.filter(p => p.isActive);
        console.log('[App] Rendering FifoLabelsView:', {
          totalPreparations: preparations.length,
          activePreparations: activePreparations.length,
          activePreparationsList: activePreparations.map(p => ({ name: p.name, isActive: p.isActive, id: p.id }))
        });
        return <FifoLabelsView 
          preparations={activePreparations}
          onGenerateLabels={handleGenerateLabels}
        />;
      case 'custom-labels':
        return <CustomLabelsView />;
      case 'inventario-scan':
      case 'scan':
        return <ScanView
          preparations={preparations}
          fifoLabels={fifoLabels}
          stockMovements={stockMovements}
          ingredients={ingredients}
          subRecipes={subRecipes}
          currentUser={{
            id: user.uid,
            name: `${userData.firstName} ${userData.lastName}`
          }}
          onScanLabel={handleScanLabel}
        />;
      case 'settings': return <SettingsView
        userData={userData}
        employees={employees}
        suppliers={suppliers}
        platformConnections={platformConnections}
        preferments={preferments}
        onUpdateBep={(config) => handleUpdateUserData({ bepConfig: config })}
        onSaveEmployee={(e) => handleSave('employees', e)}
        onDeleteEmployee={(id) => handleDelete('employees', id)}
        onSaveSupplier={(s) => handleSave('suppliers', s)}
        onDeleteSupplier={(id) => handleDelete('suppliers', id)}
        onSavePreferment={(p) => handleSave('preferments', p)}
        onDeletePreferment={(id) => handleDelete('preferments', id)}
        onSaveBusinessConfig={handleSaveBusinessConfig}
        onDisconnectPlatform={handleDisconnectPlatform}
        initialSubSection={null}
      />;
      case 'settings-prefermenti': return <SettingsView
        userData={userData}
        employees={employees}
        suppliers={suppliers}
        platformConnections={platformConnections}
        preferments={preferments}
        onUpdateBep={(config) => handleUpdateUserData({ bepConfig: config })}
        onSaveEmployee={(e) => handleSave('employees', e)}
        onDeleteEmployee={(id) => handleDelete('employees', id)}
        onSaveSupplier={(s) => handleSave('suppliers', s)}
        onDeleteSupplier={(id) => handleDelete('suppliers', id)}
        onSavePreferment={(p) => handleSave('preferments', p)}
        onDeletePreferment={(id) => handleDelete('preferments', id)}
        onSaveBusinessConfig={handleSaveBusinessConfig}
        onDisconnectPlatform={handleDisconnectPlatform}
        initialSubSection="prefermenti"
      />;
      case 'settings-assets': return <SettingsView
        userData={userData}
        employees={employees}
        suppliers={suppliers}
        platformConnections={platformConnections}
        preferments={preferments}
        onUpdateBep={(config) => handleUpdateUserData({ bepConfig: config })}
        onSaveEmployee={(e) => handleSave('employees', e)}
        onDeleteEmployee={(id) => handleDelete('employees', id)}
        onSaveSupplier={(s) => handleSave('suppliers', s)}
        onDeleteSupplier={(id) => handleDelete('suppliers', id)}
        onSavePreferment={(p) => handleSave('preferments', p)}
        onDeletePreferment={(id) => handleDelete('preferments', id)}
        onSaveBusinessConfig={handleSaveBusinessConfig}
        onDisconnectPlatform={handleDisconnectPlatform}
        initialSubSection="assets"
      />;
      case 'settings-staff': return <SettingsView
        userData={userData}
        employees={employees}
        suppliers={suppliers}
        platformConnections={platformConnections}
        preferments={preferments}
        onUpdateBep={(config) => handleUpdateUserData({ bepConfig: config })}
        onSaveEmployee={(e) => handleSave('employees', e)}
        onDeleteEmployee={(id) => handleDelete('employees', id)}
        onSaveSupplier={(s) => handleSave('suppliers', s)}
        onDeleteSupplier={(id) => handleDelete('suppliers', id)}
        onSavePreferment={(p) => handleSave('preferments', p)}
        onDeletePreferment={(id) => handleDelete('preferments', id)}
        onSaveBusinessConfig={handleSaveBusinessConfig}
        onDisconnectPlatform={handleDisconnectPlatform}
        initialSubSection="staff"
      />;
      case 'settings-suppliers': return <SettingsView
        userData={userData}
        employees={employees}
        suppliers={suppliers}
        platformConnections={platformConnections}
        preferments={preferments}
        onUpdateBep={(config) => handleUpdateUserData({ bepConfig: config })}
        onSaveEmployee={(e) => handleSave('employees', e)}
        onDeleteEmployee={(id) => handleDelete('employees', id)}
        onSaveSupplier={(s) => handleSave('suppliers', s)}
        onDeleteSupplier={(id) => handleDelete('suppliers', id)}
        onSavePreferment={(p) => handleSave('preferments', p)}
        onDeletePreferment={(id) => handleDelete('preferments', id)}
        onSaveBusinessConfig={handleSaveBusinessConfig}
        onDisconnectPlatform={handleDisconnectPlatform}
        initialSubSection="suppliers"
      />;
      case 'prep-settings': return <PreparationSettingsView 
        preparations={preparations}
        onGenerateLabels={handleGenerateLabels}
      />;
      case 'marketing-overview': return <MarketingOverview
        googleConnection={platformConnections.google}
        recentReviews={reviews.filter(r => r.platform === 'google').slice(0, 5)}
        overallStats={reviewStats}
        onSyncReviews={handleSyncReviews}
      />;
      case 'marketing-google': return <GoogleView
        connection={platformConnections.google}
        reviews={reviews.filter(r => r.platform === 'google')}
        businessConfig={userData.businessConfig}
        onConnect={(restaurant) => handleConnectPlatform('google', restaurant)}
        onGenerateAIResponse={handleGenerateAIResponse}
        onSaveReply={async (reviewId, reply) => {
          const review = reviews.find(r => r.id === reviewId);
          if (review) {
            const replyAuthor = userData.businessConfig?.name ||
              (userData.firstName ? `${userData.firstName}'s Restaurant` : 'Il Ristorante');
            const updated = {
              ...review,
              reply: {
                text: reply,
                date: new Date(),
                author: replyAuthor
              }
            };
            await handleSave('reviews', updated);
            setReviews(prev => prev.map(r => r.id === reviewId ? updated : r));
          }
        }}
      />;
      case 'profile': return <ProfileView userData={userData} onUpdate={handleUpdateUserData} onSignOut={handleSignOut} />;
      default: return <DashboardView 
        menu={menu} 
        ingredients={ingredients} 
        subRecipes={subRecipes} 
        userData={userData} 
        employees={employees}
        reviews={reviews}
        reviewStats={reviewStats}
        onViewAllReviews={() => setActiveView('marketing-overview')}
      />;
    }
  };

  const getViewTitle = (view: ViewType): string => {
    const titles: Record<ViewType, string> = {
      'dashboard': 'DASHBOARD',
      'economato': 'ECONOMATO',
      'lab': 'TOPPING',
      'menu': 'MENU',
      'laboratorio': 'LABORATORIO',
      'inventario': 'INVENTARIO',
      'inventario-magazzino': 'MAGAZZINO',
      'inventario-etichette': 'ETICHETTE',
      'inventario-scan': 'SCAN',
      'warehouse': 'MAGAZZINO',
      'fifo-labels': 'ETICHETTE FIFO',
      'custom-labels': 'ETICHETTE PERSONALIZZATE',
      'scan': 'SCAN',
      'prep-settings': 'ATTIVA PREPARAZIONI',
      'settings': 'IMPOSTAZIONI',
      'settings-prefermenti': 'PREFERMENTI',
      'settings-assets': 'COSTI E ASSET',
      'settings-staff': 'STAFF',
      'settings-suppliers': 'FORNITORI',
      'profile': 'PROFILO UTENTE',
      'marketing': 'MARKETING',
      'marketing-overview': 'PANORAMICA',
      'marketing-google': 'GOOGLE'
    };
    return titles[view] || view.toUpperCase();
  };

  return (
    <Layout activeView={activeView} setActiveView={setActiveView} title={getViewTitle(activeView)}>
      {dbError && <div className="bg-red-50 p-4 rounded-2xl text-red-600 font-bold text-xs mb-6 flex items-center space-x-2"><AlertCircle size={18}/><span>Errore sincronizzazione cloud.</span></div>}
      <StockAlerts 
        preparations={preparations}
        ingredients={ingredients}
        onNavigateToSuppliers={() => setActiveView('settings-suppliers')}
      />
      {renderView()}
    </Layout>
  );
};

export default App;
