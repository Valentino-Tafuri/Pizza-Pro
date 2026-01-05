
import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
import { syncData, saveData, deleteData } from './services/database';
import { ViewType, Ingredient, SubRecipe, MenuItem, Supplier, Employee, UserData } from './types';
import { INITIAL_USER } from './constants';

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
  const [userData, setUserData] = useState<UserData>(INITIAL_USER);

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
    return () => { unsubIng(); unsubSub(); unsubMenu(); unsubSup(); unsubEmp(); unsubPref(); };
  }, [user]);

  if (authLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>;
  if (!user) return <AuthView />;

  const handleSignOut = () => signOut(auth);
  const handleUpdateUserData = async (newData: Partial<UserData>) => {
    const updated = { ...userData, ...newData };
    setUserData(updated);
    if (user) await setDoc(doc(db, `users/${user.uid}`), updated);
  };
  const handleSave = async (col: string, item: any) => {
    console.log(`[App] handleSave chiamato per collezione: ${col}`, item);
    try {
      const result = await saveData(user.uid, col, item);
      console.log(`[App] Salvataggio completato con ID: ${result}`);
      return result;
    } catch (error) {
      console.error(`[App] Errore nel salvataggio:`, error);
      throw error;
    }
  };
  const handleDelete = async (col: string, id: string) => await deleteData(user.uid, col, id);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView menu={menu} ingredients={ingredients} subRecipes={subRecipes} userData={userData} employees={employees} />;
      case 'economato': return <EconomatoView ingredients={ingredients} suppliers={suppliers} onUpdate={(i) => handleSave('ingredients', i)} onAdd={(i) => handleSave('ingredients', i)} onDelete={(id) => handleDelete('ingredients', id)} onAddSupplier={(s) => handleSave('suppliers', s)} />;
      case 'lab': return <LabView subRecipes={subRecipes} ingredients={ingredients} suppliers={suppliers} onAdd={(sub) => handleSave('subRecipes', sub)} onUpdate={(sub) => handleSave('subRecipes', sub)} onDelete={(id) => handleDelete('subRecipes', id)} onAddIngredient={(ing) => handleSave('ingredients', ing)} />;
      case 'inventario-magazzino': return <div className="p-6"><h2 className="text-2xl font-black mb-4">Magazzino</h2><p className="text-gray-500">Gestione magazzino</p></div>;
      case 'inventario-etichette': return <div className="p-6"><h2 className="text-2xl font-black mb-4">Etichette</h2><p className="text-gray-500">Gestione etichette FIFO</p></div>;
      case 'inventario-scan': return <div className="p-6"><h2 className="text-2xl font-black mb-4">Scan</h2><p className="text-gray-500">Scansione prodotti</p></div>;
      case 'menu': return <MenuView menu={menu} ingredients={ingredients} subRecipes={subRecipes} suppliers={suppliers} userData={userData} onAdd={(i) => handleSave('menu', i)} onUpdate={(i) => handleSave('menu', i)} onDelete={(id) => handleDelete('menu', id)} onAddIngredient={(i) => handleSave('ingredients', i)} />;
      case 'laboratorio': return <LabCalculatorView ingredients={ingredients} subRecipes={subRecipes} suppliers={suppliers} preferments={preferments} onAdd={(sub) => handleSave('subRecipes', sub)} onUpdate={(sub) => handleSave('subRecipes', sub)} onDelete={(id) => handleDelete('subRecipes', id)} onAddIngredient={(ing) => handleSave('ingredients', ing)} onAddSupplier={(s) => handleSave('suppliers', s)} />;
      case 'settings': return <SettingsView 
        userData={userData} 
        employees={employees} 
        suppliers={suppliers}
        preferments={preferments}
        onUpdateBep={(config) => handleUpdateUserData({ bepConfig: config })} 
        onSaveEmployee={(e) => handleSave('employees', e)} 
        onDeleteEmployee={(id) => handleDelete('employees', id)} 
        onSaveSupplier={(s) => handleSave('suppliers', s)} 
        onDeleteSupplier={(id) => handleDelete('suppliers', id)} 
        onSavePreferment={(p) => handleSave('preferments', p)} 
        onDeletePreferment={(id) => handleDelete('preferments', id)} 
        initialSubSection={null}
      />;
      case 'settings-prefermenti': return <SettingsView 
        userData={userData} 
        employees={employees} 
        suppliers={suppliers}
        preferments={preferments}
        onUpdateBep={(config) => handleUpdateUserData({ bepConfig: config })} 
        onSaveEmployee={(e) => handleSave('employees', e)} 
        onDeleteEmployee={(id) => handleDelete('employees', id)} 
        onSaveSupplier={(s) => handleSave('suppliers', s)} 
        onDeleteSupplier={(id) => handleDelete('suppliers', id)} 
        onSavePreferment={(p) => handleSave('preferments', p)} 
        onDeletePreferment={(id) => handleDelete('preferments', id)} 
        initialSubSection="prefermenti"
      />;
      case 'settings-assets': return <SettingsView 
        userData={userData} 
        employees={employees} 
        suppliers={suppliers}
        preferments={preferments}
        onUpdateBep={(config) => handleUpdateUserData({ bepConfig: config })} 
        onSaveEmployee={(e) => handleSave('employees', e)} 
        onDeleteEmployee={(id) => handleDelete('employees', id)} 
        onSaveSupplier={(s) => handleSave('suppliers', s)} 
        onDeleteSupplier={(id) => handleDelete('suppliers', id)} 
        onSavePreferment={(p) => handleSave('preferments', p)} 
        onDeletePreferment={(id) => handleDelete('preferments', id)} 
        initialSubSection="assets"
      />;
      case 'settings-staff': return <SettingsView 
        userData={userData} 
        employees={employees} 
        suppliers={suppliers}
        preferments={preferments}
        onUpdateBep={(config) => handleUpdateUserData({ bepConfig: config })} 
        onSaveEmployee={(e) => handleSave('employees', e)} 
        onDeleteEmployee={(id) => handleDelete('employees', id)} 
        onSaveSupplier={(s) => handleSave('suppliers', s)} 
        onDeleteSupplier={(id) => handleDelete('suppliers', id)} 
        onSavePreferment={(p) => handleSave('preferments', p)} 
        onDeletePreferment={(id) => handleDelete('preferments', id)} 
        initialSubSection="staff"
      />;
      case 'settings-suppliers': return <SettingsView 
        userData={userData} 
        employees={employees} 
        suppliers={suppliers}
        preferments={preferments}
        onUpdateBep={(config) => handleUpdateUserData({ bepConfig: config })} 
        onSaveEmployee={(e) => handleSave('employees', e)} 
        onDeleteEmployee={(id) => handleDelete('employees', id)} 
        onSaveSupplier={(s) => handleSave('suppliers', s)} 
        onDeleteSupplier={(id) => handleDelete('suppliers', id)} 
        onSavePreferment={(p) => handleSave('preferments', p)} 
        onDeletePreferment={(id) => handleDelete('preferments', id)} 
        initialSubSection="suppliers"
      />;
      case 'profile': return <ProfileView userData={userData} onUpdate={handleUpdateUserData} onSignOut={handleSignOut} />;
      default: return <DashboardView menu={menu} ingredients={ingredients} subRecipes={subRecipes} userData={userData} employees={employees} />;
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
      'settings': 'IMPOSTAZIONI',
      'settings-prefermenti': 'PREFERMENTI',
      'settings-assets': 'COSTI E ASSET',
      'settings-staff': 'STAFF',
      'settings-suppliers': 'FORNITORI',
      'profile': 'PROFILO UTENTE'
    };
    return titles[view] || view.toUpperCase();
  };

  return (
    <Layout activeView={activeView} setActiveView={setActiveView} title={getViewTitle(activeView)}>
      {dbError && <div className="bg-red-50 p-4 rounded-2xl text-red-600 font-bold text-xs mb-6 flex items-center space-x-2"><AlertCircle size={18}/><span>Errore sincronizzazione cloud.</span></div>}
      {renderView()}
    </Layout>
  );
};

export default App;
