import React, { useState, useMemo } from 'react';
import { AlertTriangle, Plus, X, Save, Sliders, FileDown, Settings, Clock, Thermometer, Flame } from 'lucide-react';
import { Ingredient } from '../../types';
import { Preferment } from '../Views/PrefermentiView';
import { FlourSelection, AdditionalIngredient } from '../../utils/doughCalculator';
import { useDoughCalculations } from '../../hooks/useDoughCalculations';
import { PhaseCard } from './PhaseCard';
import { FlourSelector } from './FlourSelector';
import { RecipeSummary } from './RecipeSummary';
import { generateRecipePDF } from '../../utils/pdfGenerator';

interface AdvancedDoughCalculatorProps {
  ingredients: Ingredient[];
  preferments: Preferment[];
  onSave?: (recipe: any) => void;
}

const AdvancedDoughCalculator: React.FC<AdvancedDoughCalculatorProps> = ({
  ingredients,
  preferments,
  onSave
}) => {
  // Parametri generali
  const [recipeName, setRecipeName] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('Pizza');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const categories = ['Pizza', 'Pane', 'Dolci', 'Panificazione', 'Focaccia'];
  const [totalHydration, setTotalHydration] = useState(70);
  const [multiplier, setMultiplier] = useState(1);
  const [portionWeight, setPortionWeight] = useState<number | undefined>(270);
  
  // Pre-fermento
  const [usePreferment, setUsePreferment] = useState(false);
  const [selectedPrefermentId, setSelectedPrefermentId] = useState<string | null>(null);
  const [prefermentFlourPercentage, setPrefermentFlourPercentage] = useState(20);
  const [prefermentFlourSelections, setPrefermentFlourSelections] = useState<FlourSelection[]>([]);
  
  // Autolisi
  const [useAutolysis, setUseAutolysis] = useState(false);
  const [autolysisFlourPercentage, setAutolysisFlourPercentage] = useState(70);
  const [autolysisHydration, setAutolysisHydration] = useState(60);
  const [autolysisSaltPercentage, setAutolysisSaltPercentage] = useState(0);
  const [autolysisFlourSelections, setAutolysisFlourSelections] = useState<FlourSelection[]>([]);
  
  // Chiusura
  const [saltPercentage, setSaltPercentage] = useState(2.5); // Sale totale ricetta
  const [yeastPercentage, setYeastPercentage] = useState(0.5);
  const [oilPercentage, setOilPercentage] = useState(0);
  const [maltPercentage, setMaltPercentage] = useState(0);
  const [additionalIngredients, setAdditionalIngredients] = useState<AdditionalIngredient[]>([]);
  const [closureFlourSelections, setClosureFlourSelections] = useState<FlourSelection[]>([]);

  // === PARAMETRI GESTIONE FASI ===
  // Gestione Pre-fermento (tempo in ore, temperatura in °C)
  const [prefStorageTime, setPrefStorageTime] = useState<string>('12-24');
  const [prefStorageTemp, setPrefStorageTemp] = useState<string>('18-20');
  const [prefProcedure, setPrefProcedure] = useState<string>('Mescolare farina, acqua e lievito. Coprire e lasciar maturare.');

  // Gestione Autolisi
  const [autolysisTime, setAutolysisTime] = useState<string>('30-60');
  const [autolysisTemp, setAutolysisTemp] = useState<string>('T.A.');
  const [autolysisProcedure, setAutolysisProcedure] = useState<string>('Mescolare farina e acqua fino a formare un impasto omogeneo. Coprire e lasciar riposare.');

  // Gestione Impasto (chiusura)
  const [mixingTime, setMixingTime] = useState<string>('15-20');
  const [mixingTemp, setMixingTemp] = useState<string>('24');
  const [mixingProcedure, setMixingProcedure] = useState<string>('Versare acqua con sale e lievito nella macchina. Aggiungere la farina a pioggia. Impastare fino a incordatura.');

  // Puntata (prima lievitazione in massa)
  const [puntataTime, setPuntataTime] = useState<string>('1-2');
  const [puntataTemp, setPuntataTemp] = useState<string>('T.A.');
  const [puntataProcedure, setPuntataProcedure] = useState<string>('Lasciare l\'impasto coperto a temperatura ambiente. Eseguire pieghe se necessario.');

  // Appretto (lievitazione dopo staglio)
  const [apprettoTime, setApprettoTime] = useState<string>('4-8');
  const [apprettoTemp, setApprettoTemp] = useState<string>('T.A. / 4°C');
  const [apprettoProcedure, setApprettoProcedure] = useState<string>('Formare i panetti e lasciar lievitare. Conservare in frigorifero se necessario.');

  // Cottura
  const [cookingTime, setCookingTime] = useState<string>('60-90');
  const [cookingTemp, setCookingTemp] = useState<string>('450-480');
  const [cookingProcedure, setCookingProcedure] = useState<string>('Cuocere in forno preriscaldato fino a doratura uniforme.');

  // UI State
  const [selectedAdditionalIngredientId, setSelectedAdditionalIngredientId] = useState<string>('');
  const [newAdditionalIngredientPercentage, setNewAdditionalIngredientPercentage] = useState<number>(1);
  
  // Filtra solo farine dall'economato
  const availableFlours = useMemo(() => {
    return ingredients.filter(ing => 
      ing.category.toLowerCase().includes('farina') || 
      ing.name.toLowerCase().includes('farina')
    );
  }, [ingredients]);
  
  // Trova prefermento selezionato
  const selectedPreferment = useMemo(() => {
    return preferments.find(p => p.id === selectedPrefermentId) || null;
  }, [preferments, selectedPrefermentId]);
  
  // Calcoli
  const { result, errors, isValid } = useDoughCalculations({
    totalFlour: 1000, // Base 1kg
    totalHydration,
    multiplier,
    usePreferment,
    selectedPreferment,
    prefermentFlourPercentage,
    prefermentFlourSelections,
    useAutolysis,
    autolysisFlourPercentage,
    autolysisHydration,
    autolysisSaltPercentage,
    autolysisFlourSelections,
    saltPercentage,
    yeastPercentage,
    oilPercentage,
    maltPercentage,
    additionalIngredients,
    closureFlourSelections,
    ingredients
  });

  // Calcola farina rimanente per chiusura e validazione assegnazione farine
  const flourValidation = useMemo(() => {
    const totalFlour = 1000; // Base sempre 1kg

    // Farina usata nel pre-fermento
    const prefermentFlour = usePreferment && selectedPreferment
      ? (totalFlour * prefermentFlourPercentage) / 100
      : 0;

    // Farina rimanente dopo pre-fermento
    const remainingAfterPreferment = totalFlour - prefermentFlour;

    // Farina usata in autolisi (percentuale sulla farina rimanente)
    const autolysisFlour = useAutolysis
      ? (remainingAfterPreferment * autolysisFlourPercentage) / 100
      : 0;

    // Farina rimanente per chiusura
    const remainingForClosure = remainingAfterPreferment - autolysisFlour;

    // Verifica che le percentuali delle farine sommino al 100% in ogni fase
    const prefFlourTotal = prefermentFlourSelections.reduce((sum, f) => sum + f.percentage, 0);
    const autoFlourTotal = autolysisFlourSelections.reduce((sum, f) => sum + f.percentage, 0);
    const closureFlourTotal = closureFlourSelections.reduce((sum, f) => sum + f.percentage, 0);

    // La ricetta è valida se:
    // 1. Se c'è pre-fermento con farina > 0, le percentuali farine devono sommare al 100%
    // 2. Se c'è autolisi con farina > 0, le percentuali farine devono sommare al 100%
    // 3. Se c'è farina rimanente per chiusura > 0, le percentuali farine devono sommare al 100%
    // 4. Se farina rimanente = 0, non servono farine nella chiusura

    const isPrefFlourValid = !usePreferment || prefermentFlour === 0 || Math.abs(prefFlourTotal - 100) < 0.01;
    const isAutoFlourValid = !useAutolysis || autolysisFlour === 0 || Math.abs(autoFlourTotal - 100) < 0.01;
    const isClosureFlourValid = remainingForClosure <= 0 || Math.abs(closureFlourTotal - 100) < 0.01;

    // Verifica che ci siano farine selezionate dove necessario
    const hasPrefFlours = !usePreferment || prefermentFlour === 0 || prefermentFlourSelections.length > 0;
    const hasAutoFlours = !useAutolysis || autolysisFlour === 0 || autolysisFlourSelections.length > 0;
    const hasClosureFlours = remainingForClosure <= 0 || closureFlourSelections.length > 0;

    return {
      remainingForClosure,
      isPrefFlourValid,
      isAutoFlourValid,
      isClosureFlourValid,
      hasPrefFlours,
      hasAutoFlours,
      hasClosureFlours,
      isAllFloursAssigned: isPrefFlourValid && isAutoFlourValid && isClosureFlourValid && hasPrefFlours && hasAutoFlours && hasClosureFlours
    };
  }, [
    usePreferment, selectedPreferment, prefermentFlourPercentage, prefermentFlourSelections,
    useAutolysis, autolysisFlourPercentage, autolysisFlourSelections,
    closureFlourSelections
  ]);
  
  const handleAddAdditionalIngredient = () => {
    if (!selectedAdditionalIngredientId || newAdditionalIngredientPercentage <= 0) return;
    
    const newIng: AdditionalIngredient = { id: selectedAdditionalIngredientId, percentage: newAdditionalIngredientPercentage };
    setAdditionalIngredients([...additionalIngredients, newIng]);
    setSelectedAdditionalIngredientId('');
    setNewAdditionalIngredientPercentage(1);
  };
  
  const handleRemoveAdditionalIngredient = (ingredientId: string) => {
    setAdditionalIngredients(additionalIngredients.filter(ing => ing.id !== ingredientId));
  };
  
  const handleUpdateAdditionalIngredientPercentage = (ingredientId: string, percentage: number) => {
    setAdditionalIngredients(additionalIngredients.map(ing =>
      ing.id === ingredientId ? { ...ing, percentage: Math.max(0, percentage) } : ing
    ));
  };
  
  // Ingredienti disponibili (non già aggiunti)
  const availableIngredientsForSelect = useMemo(() => {
    const addedIds = new Set(additionalIngredients.map(ai => ai.id));
    return ingredients.filter(ing => !addedIds.has(ing.id));
  }, [ingredients, additionalIngredients]);
  
  return (
    <div className="space-y-6 pb-12">
      {/* Errori validazione */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-black text-sm text-red-900 mb-2">Errori di validazione</h4>
              <ul className="space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-xs font-semibold text-red-800">• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Nome Ricetta e Categoria */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="text-sm font-black text-gray-700 mb-3 block">
            Nome Ricetta *
          </label>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="Es: Pane Classico, Pizza Napoletana..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {!recipeName && (
            <p className="text-xs text-gray-400 font-semibold mt-2">
              ⚠️ Inserisci un nome per la ricetta
            </p>
          )}
        </div>
        
        <div>
          <label className="text-sm font-black text-gray-700 mb-3 block">
            Categoria *
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setRecipeCategory(cat);
                  setIsAddingNewCategory(false);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                  recipeCategory === cat
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setIsAddingNewCategory(true)}
              className={`px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 ${
                isAddingNewCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <Plus size={16} />
              <span>Nuova</span>
            </button>
          </div>
          {isAddingNewCategory && (
            <input
              autoFocus
              type="text"
              placeholder="Nome nuova categoria..."
              value={recipeCategory}
              onChange={(e) => {
                setRecipeCategory(e.target.value);
                setIsAddingNewCategory(false);
              }}
              onBlur={() => setIsAddingNewCategory(false)}
              className="w-full mt-2 bg-gray-50 border border-blue-200 rounded-xl px-4 py-3 text-base font-bold focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div>
      
      {/* Parametri Iniziali */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Sliders className="text-blue-600" size={24} />
          <h3 className="text-xl font-black text-black">Parametri Iniziali</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Idratazione totale */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-gray-700">Idratazione Totale</label>
              <span className="text-2xl font-black text-blue-600">{totalHydration}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="90"
              step="0.5"
              value={totalHydration}
              onChange={(e) => setTotalHydration(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 font-semibold">
              <span>50%</span>
              <span>70%</span>
              <span>90%</span>
            </div>
          </div>
          
          {/* Moltiplicatore */}
          <div className="space-y-2">
            <label className="text-sm font-black text-gray-700">Moltiplicatore Ricetta</label>
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(Math.max(0.1, parseFloat(e.target.value) || 1))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-black text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 font-semibold">Base: 1kg farina</p>
          </div>
          
          {/* Peso porzione (opzionale) */}
          <div className="space-y-2">
            <label className="text-sm font-black text-gray-700">Peso Porzione (g) - Opzionale</label>
            <input
              type="number"
              min="0"
              step="1"
              value={portionWeight || ''}
              onChange={(e) => setPortionWeight(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Es: 270"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-black text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 font-semibold">Per calcolo costo per porzione</p>
          </div>
        </div>
      </div>
      
      {/* Pre-fermento */}
      <PhaseCard
        title="Pre-fermento"
        isActive={usePreferment}
        onToggle={setUsePreferment}
        collapsible={true}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-black text-gray-700 mb-2 block">
              Seleziona Pre-fermento
            </label>
            <select
              value={selectedPrefermentId || ''}
              onChange={(e) => setSelectedPrefermentId(e.target.value || null)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleziona un pre-fermento...</option>
              {preferments.map(pref => (
                <option key={pref.id} value={pref.id}>
                  {pref.name} ({pref.waterPercentage}% idratazione, {pref.yeastPercentage}% lievito)
                </option>
              ))}
            </select>
            {selectedPreferment && (
              <p className="text-xs text-gray-500 font-semibold mt-1">
                Tipo: {selectedPreferment.type} • Sale: {selectedPreferment.saltPercentage}%
              </p>
            )}
          </div>
          
          {selectedPreferment && (
            <>
              <div>
                <label className="text-sm font-black text-gray-700 mb-2 block">
                  Percentuale farina in pre-fermento: {prefermentFlourPercentage}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={prefermentFlourPercentage}
                  onChange={(e) => setPrefermentFlourPercentage(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 font-semibold mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-black text-gray-700 mb-3 block">
                  Seleziona Farine per Pre-fermento
                </label>
                <FlourSelector
                  flourSelections={prefermentFlourSelections}
                  availableFlours={availableFlours}
                  onUpdate={setPrefermentFlourSelections}
                  phaseLabel="Pre-fermento"
                />
              </div>

              {/* Gestione Pre-fermento */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Gestione Pre-fermento
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (ore)</label>
                    <input
                      type="text"
                      value={prefStorageTime}
                      onChange={(e) => setPrefStorageTime(e.target.value)}
                      placeholder="es: 12-24"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura (°C)</label>
                    <input
                      type="text"
                      value={prefStorageTemp}
                      onChange={(e) => setPrefStorageTemp(e.target.value)}
                      placeholder="es: 18-20"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
                  <textarea
                    value={prefProcedure}
                    onChange={(e) => setPrefProcedure(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </PhaseCard>
      
      {/* Autolisi */}
      <PhaseCard
        title="Autolisi"
        isActive={useAutolysis}
        onToggle={setUseAutolysis}
        collapsible={true}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-black text-gray-700 mb-2 block">
              Percentuale farina in autolisi: {autolysisFlourPercentage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={autolysisFlourPercentage}
              onChange={(e) => setAutolysisFlourPercentage(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-xs text-gray-500 font-semibold mt-1">
              Calcolata sulla farina rimanente dopo pre-fermento
            </p>
          </div>
          
          <div>
            <label className="text-sm font-black text-gray-700 mb-2 block">
              Idratazione autolisi: {autolysisHydration}%
            </label>
            <input
              type="range"
              min="40"
              max="80"
              step="1"
              value={autolysisHydration}
              onChange={(e) => setAutolysisHydration(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
          
          <div>
            <label className="text-sm font-black text-gray-700 mb-2 block">
              Sale in autolisi: {autolysisSaltPercentage}% (opzionale)
            </label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={autolysisSaltPercentage}
              onChange={(e) => setAutolysisSaltPercentage(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-xs text-gray-500 font-semibold mt-1">
              Il sale dell'autolisi verrà sottratto dal sale totale della ricetta
            </p>
          </div>
          
          <div>
            <label className="text-sm font-black text-gray-700 mb-3 block">
              Seleziona Farine per Autolisi
            </label>
            <FlourSelector
              flourSelections={autolysisFlourSelections}
              availableFlours={availableFlours}
              onUpdate={setAutolysisFlourSelections}
              phaseLabel="Autolisi"
            />
          </div>

          {/* Gestione Autolisi */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Gestione Autolisi
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (min)</label>
                <input
                  type="text"
                  value={autolysisTime}
                  onChange={(e) => setAutolysisTime(e.target.value)}
                  placeholder="es: 30-60"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura</label>
                <input
                  type="text"
                  value={autolysisTemp}
                  onChange={(e) => setAutolysisTemp(e.target.value)}
                  placeholder="es: T.A."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
              <textarea
                value={autolysisProcedure}
                onChange={(e) => setAutolysisProcedure(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
              />
            </div>
          </div>
        </div>
      </PhaseCard>

      {/* Chiusura Impasto */}
      <PhaseCard
        title="Chiusura Impasto"
        isActive={true}
        onToggle={() => {}}
        collapsible={false}
      >
        <div className="space-y-6">
          {/* Farine chiusura */}
          <div>
            <label className="text-sm font-black text-gray-700 mb-3 block">
              Seleziona Farine per Chiusura *
            </label>
            <p className="text-xs text-gray-500 font-semibold mb-2">
              Farina residua: {result ? (
                ((1000 - (result.preferment?.flour || 0) - (result.autolysis?.flour || 0))).toFixed(0)
              ) : '1000'}g
            </p>
            {availableFlours.length === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-bold text-red-800">⚠️ Nessuna farina disponibile</p>
                <p className="text-xs text-red-600 mt-1">
                  Aggiungi ingredienti con categoria "Farine" nell'Economato per poter creare ricette.
                </p>
              </div>
            ) : flourValidation.remainingForClosure <= 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-bold text-green-800">✅ Tutta la farina è già stata assegnata</p>
                <p className="text-xs text-green-600 mt-1">
                  Il 100% della farina (1000g) è stato distribuito tra pre-fermento e autolisi.
                  Non è necessario selezionare farine per la chiusura.
                </p>
              </div>
            ) : (
              <FlourSelector
                flourSelections={closureFlourSelections}
                availableFlours={availableFlours}
                onUpdate={setClosureFlourSelections}
                phaseLabel="Chiusura"
              />
            )}
          </div>
          
          {/* Ingredienti standard */}
          <div>
            <h4 className="text-sm font-black text-gray-700 mb-4">Ingredienti Standard</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Sale</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1.8"
                max="3"
                step="0.1"
                value={saltPercentage}
                onChange={(e) => setSaltPercentage(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="w-12 text-sm font-black text-center">{saltPercentage}%</span>
            </div>
            <p className="text-xs text-gray-500 font-semibold mt-1">
              Sale totale ricetta
              {useAutolysis && autolysisSaltPercentage > 0 && (
                <span className="ml-1 text-blue-600">
                  (Sale chiusura: {(saltPercentage - autolysisSaltPercentage).toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Lievito</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={yeastPercentage}
                    onChange={(e) => setYeastPercentage(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="w-12 text-sm font-black text-center">{yeastPercentage}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Olio</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={oilPercentage}
                    onChange={(e) => setOilPercentage(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="w-12 text-sm font-black text-center">{oilPercentage}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Malto</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={maltPercentage}
                    onChange={(e) => setMaltPercentage(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="w-12 text-sm font-black text-center">{maltPercentage}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Ingredienti aggiuntivi */}
          <div>
            <h4 className="text-sm font-black text-gray-700 mb-3">Ingredienti Aggiuntivi</h4>
            
            {additionalIngredients.length > 0 && (
              <div className="space-y-2 mb-3">
                {additionalIngredients.map(ing => {
                  const ingredient = ingredients.find(i => i.id === ing.id);
                  if (!ingredient) return null;
                  
                  return (
                    <div key={ing.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-black truncate">{ingredient.name}</p>
                        <p className="text-xs text-gray-400 font-semibold">{ingredient.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={ing.percentage}
                          onChange={(e) => handleUpdateAdditionalIngredientPercentage(ing.id, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-xs font-bold text-gray-400 w-6">%</span>
                        <button
                          onClick={() => handleRemoveAdditionalIngredient(ing.id)}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Barra per aggiungere nuovo ingrediente */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
              <select
                value={selectedAdditionalIngredientId}
                onChange={(e) => setSelectedAdditionalIngredientId(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleziona ingrediente...</option>
                {availableIngredientsForSelect.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} {ing.category && `(${ing.category})`}
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                min="0"
                step="0.1"
                value={newAdditionalIngredientPercentage || ''}
                onChange={(e) => setNewAdditionalIngredientPercentage(parseFloat(e.target.value) || 0)}
                placeholder="%"
                className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-xs font-bold text-gray-400 w-6">%</span>
              
              <button
                onClick={handleAddAdditionalIngredient}
                disabled={!selectedAdditionalIngredientId || newAdditionalIngredientPercentage <= 0}
                className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Gestione Impasto */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Gestione Impasto
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo impasto (min)</label>
                <input
                  type="text"
                  value={mixingTime}
                  onChange={(e) => setMixingTime(e.target.value)}
                  placeholder="es: 15-20"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">T° finale impasto (°C)</label>
                <input
                  type="text"
                  value={mixingTemp}
                  onChange={(e) => setMixingTemp(e.target.value)}
                  placeholder="es: 24"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
              <textarea
                value={mixingProcedure}
                onChange={(e) => setMixingProcedure(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
              />
            </div>
          </div>
        </div>
      </PhaseCard>

      {/* Puntata */}
      <PhaseCard
        title="Puntata"
        isActive={true}
        onToggle={() => {}}
        collapsible={false}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 font-semibold">
            Prima lievitazione dell'impasto in massa, prima dello staglio.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (ore)</label>
              <input
                type="text"
                value={puntataTime}
                onChange={(e) => setPuntataTime(e.target.value)}
                placeholder="es: 1-2"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura</label>
              <input
                type="text"
                value={puntataTemp}
                onChange={(e) => setPuntataTemp(e.target.value)}
                placeholder="es: T.A."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
            <textarea
              value={puntataProcedure}
              onChange={(e) => setPuntataProcedure(e.target.value)}
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
            />
          </div>
        </div>
      </PhaseCard>

      {/* Appretto */}
      <PhaseCard
        title="Appretto"
        isActive={true}
        onToggle={() => {}}
        collapsible={false}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 font-semibold">
            Lievitazione finale dopo lo staglio dei panetti ({portionWeight ? `${portionWeight}g` : 'peso da definire'}).
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (ore)</label>
              <input
                type="text"
                value={apprettoTime}
                onChange={(e) => setApprettoTime(e.target.value)}
                placeholder="es: 4-8"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura</label>
              <input
                type="text"
                value={apprettoTemp}
                onChange={(e) => setApprettoTemp(e.target.value)}
                placeholder="es: T.A. / 4°C"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
            <textarea
              value={apprettoProcedure}
              onChange={(e) => setApprettoProcedure(e.target.value)}
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
            />
          </div>
        </div>
      </PhaseCard>

      {/* Cottura */}
      <PhaseCard
        title="Cottura"
        isActive={true}
        onToggle={() => {}}
        collapsible={false}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Tempo (secondi)</label>
              <input
                type="text"
                value={cookingTime}
                onChange={(e) => setCookingTime(e.target.value)}
                placeholder="es: 60-90"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Temperatura (°C)</label>
              <input
                type="text"
                value={cookingTemp}
                onChange={(e) => setCookingTemp(e.target.value)}
                placeholder="es: 450-480"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Procedura</label>
            <textarea
              value={cookingProcedure}
              onChange={(e) => setCookingProcedure(e.target.value)}
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium resize-none"
            />
          </div>
        </div>
      </PhaseCard>

      {/* Riepilogo - Mostra sempre se c'è un risultato */}
      {result && result.closure ? (
        <>
          <RecipeSummary
            result={result}
            ingredients={ingredients}
            portionWeight={portionWeight}
            multiplier={multiplier}
          />
          
          {/* Feedback per azioni disabilitate */}
          {(!recipeName.trim() || !flourValidation.isAllFloursAssigned) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <p className="text-sm font-bold text-amber-800 mb-2">⚠️ Per salvare o esportare la ricetta:</p>
              <ul className="text-sm text-amber-700 space-y-1">
                {!recipeName.trim() && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Inserisci un <strong>nome per la ricetta</strong> nel campo in alto
                  </li>
                )}
                {usePreferment && selectedPreferment && !flourValidation.hasPrefFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona le <strong>farine per il pre-fermento</strong>
                  </li>
                )}
                {usePreferment && selectedPreferment && !flourValidation.isPrefFlourValid && flourValidation.hasPrefFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Le percentuali farine nel <strong>pre-fermento</strong> devono sommare al 100%
                  </li>
                )}
                {useAutolysis && !flourValidation.hasAutoFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona le <strong>farine per l'autolisi</strong>
                  </li>
                )}
                {useAutolysis && !flourValidation.isAutoFlourValid && flourValidation.hasAutoFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Le percentuali farine nell'<strong>autolisi</strong> devono sommare al 100%
                  </li>
                )}
                {flourValidation.remainingForClosure > 0 && !flourValidation.hasClosureFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Seleziona le <strong>farine per la chiusura</strong> ({flourValidation.remainingForClosure.toFixed(0)}g rimanenti)
                  </li>
                )}
                {flourValidation.remainingForClosure > 0 && !flourValidation.isClosureFlourValid && flourValidation.hasClosureFlours && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Le percentuali farine nella <strong>chiusura</strong> devono sommare al 100%
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Pulsanti Azioni */}
          <div className="space-y-3">
            {/* Pulsante Export PDF */}
            <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              console.log('Export PDF...', { recipeName, result });
              
              if (!recipeName.trim()) {
                alert('⚠️ Inserisci un nome per la ricetta prima di esportare il PDF');
                return;
              }
              
              if (!result) {
                alert('⚠️ Non c\'è un risultato da esportare. Configura la ricetta prima di esportare.');
                return;
              }
              
              try {
                  generateRecipePDF({
                    name: recipeName.trim(),
                    category: recipeCategory.trim(),
                    hydration: totalHydration,
                    result,
                    ingredients,
                    portionWeight,
                    preferment: usePreferment ? selectedPreferment : null,
                    management: {
                      preferment: usePreferment ? {
                        time: prefStorageTime,
                        temp: prefStorageTemp,
                        procedure: prefProcedure
                      } : undefined,
                      autolysis: useAutolysis ? {
                        time: autolysisTime,
                        temp: autolysisTemp,
                        procedure: autolysisProcedure
                      } : undefined,
                      mixing: {
                        time: mixingTime,
                        temp: mixingTemp,
                        procedure: mixingProcedure
                      },
                      puntata: {
                        time: puntataTime,
                        temp: puntataTemp,
                        procedure: puntataProcedure
                      },
                      appretto: {
                        time: apprettoTime,
                        temp: apprettoTemp,
                        procedure: apprettoProcedure
                      },
                      cooking: {
                        time: cookingTime,
                        temp: cookingTemp,
                        procedure: cookingProcedure
                      }
                    }
                  });
                } catch (error) {
                  console.error('Errore nella generazione PDF:', error);
                  alert(`Errore nella generazione PDF: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
                }
              }}
              disabled={!recipeName.trim() || !flourValidation.isAllFloursAssigned}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-5 rounded-2xl font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              title={!recipeName.trim() ? 'Inserisci un nome per la ricetta' : !flourValidation.isAllFloursAssigned ? 'Completa l\'assegnazione delle farine' : ''}
            >
              <FileDown size={20} />
              <span>Esporta PDF Ricetta</span>
            </button>
            
            {/* Pulsante Salva */}
            {onSave && (
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (!recipeName.trim()) {
                    alert('⚠️ Inserisci un nome per la ricetta prima di salvare');
                    return;
                  }
                  
                  if (!flourValidation.isAllFloursAssigned) {
                    alert('⚠️ Completa l\'assegnazione delle farine in tutte le fasi prima di salvare');
                    return;
                  }
            
            // Avvisa se ci sono errori critici
            const criticalErrors = errors.filter(e => 
              e.includes('negativa') || 
              e.includes('supera il 100%')
            );
            
            if (criticalErrors.length > 0) {
              const confirmSave = confirm(
                `⚠️ Attenzione: Ci sono errori critici nella ricetta:\n\n${criticalErrors.join('\n')}\n\nVuoi salvare comunque?`
              );
              if (!confirmSave) return;
            }
            
            // Salva la ricetta
            if (onSave && result) {
              try {
                await onSave({
                  name: recipeName.trim(),
                  category: recipeCategory.trim(),
                  hydration: totalHydration,
                  preferment: usePreferment ? selectedPreferment : null,
                  calculation: result
                });
                // Genera PDF automaticamente dopo il salvataggio
                generateRecipePDF({
                  name: recipeName.trim(),
                  category: recipeCategory.trim(),
                  hydration: totalHydration,
                  result,
                  ingredients,
                  portionWeight,
                  preferment: usePreferment ? selectedPreferment : null,
                  management: {
                    preferment: usePreferment ? {
                      time: prefStorageTime,
                      temp: prefStorageTemp,
                      procedure: prefProcedure
                    } : undefined,
                    autolysis: useAutolysis ? {
                      time: autolysisTime,
                      temp: autolysisTemp,
                      procedure: autolysisProcedure
                    } : undefined,
                    mixing: {
                      time: mixingTime,
                      temp: mixingTemp,
                      procedure: mixingProcedure
                    },
                    puntata: {
                      time: puntataTime,
                      temp: puntataTemp,
                      procedure: puntataProcedure
                    },
                    appretto: {
                      time: apprettoTime,
                      temp: apprettoTemp,
                      procedure: apprettoProcedure
                    },
                    cooking: {
                      time: cookingTime,
                      temp: cookingTemp,
                      procedure: cookingProcedure
                    }
                  }
                });
                
                alert('✅ Ricetta salvata e PDF generato con successo!');
                
                // NON resettare il form: mantieni tutto visibile per permettere export aggiuntivi
                // Se vuoi creare una nuova ricetta, puoi cliccare "X" per chiudere il calcolatore
              } catch (error) {
                console.error('Errore nel salvataggio:', error);
                alert(`Errore nel salvataggio: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
              }
            }
                }}
                disabled={!recipeName.trim() || !flourValidation.isAllFloursAssigned}
                className={`w-full py-5 rounded-2xl font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 ${
                  recipeName.trim() && flourValidation.isAllFloursAssigned
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={!recipeName.trim() ? 'Inserisci un nome per la ricetta' : !flourValidation.isAllFloursAssigned ? 'Completa l\'assegnazione delle farine' : ''}
              >
                <Save size={20} />
                <span>Salva Ricetta</span>
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-gray-500 font-semibold mb-2">
            ⚠️ Configura la ricetta per vedere il riepilogo
          </p>
          {!flourValidation.isAllFloursAssigned && (
            <p className="text-sm text-blue-600 font-semibold mt-2">
              💡 Seleziona le farine per ogni fase attiva (pre-fermento, autolisi, chiusura)
            </p>
          )}
          {errors.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-red-500 font-semibold">Errori di validazione:</p>
              {errors.map((error, idx) => (
                <p key={idx} className="text-xs text-red-600">{error}</p>
              ))}
            </div>
          )}
        </div>
      )}
      
    </div>
  );
};

export default AdvancedDoughCalculator;

