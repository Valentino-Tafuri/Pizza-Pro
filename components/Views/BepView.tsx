
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Wallet, 
  ChevronRight, 
  TrendingUp, 
  Euro,
  Info
} from 'lucide-react';

export interface FixedCost {
  id: string;
  label: string;
  amount: number;
  category: 'affitto' | 'utenze' | 'personale' | 'altro';
}

export interface VariableIncidence {
  foodCost: number;
  service: number;
  waste: number;
}

const BepView: React.FC = () => {
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([
    { id: '1', label: 'Affitto Locale', amount: 1200, category: 'affitto' },
    { id: '2', label: 'Personale (Fisso)', amount: 4500, category: 'personale' },
    { id: '3', label: 'Energia e Gas', amount: 800, category: 'utenze' }
  ]);

  const [incidence, setIncidence] = useState<VariableIncidence>({
    foodCost: 30,
    service: 5,
    waste: 2
  });

  const [avgTicket, setAvgTicket] = useState(15);
  const [isAddingCost, setIsAddingCost] = useState(false);
  const [newCost, setNewCost] = useState({ label: '', amount: 0 });

  const totalFixedCosts = useMemo(() => 
    fixedCosts.reduce((acc, curr) => acc + curr.amount, 0), 
  [fixedCosts]);

  const totalVariablePercentage = useMemo(() => 
    incidence.foodCost + incidence.service + incidence.waste, 
  [incidence]);

  const contributionMarginPercentage = useMemo(() => 
    100 - totalVariablePercentage, 
  [totalVariablePercentage]);

  const breakEvenRevenue = useMemo(() => {
    if (contributionMarginPercentage <= 0) return 0;
    return totalFixedCosts / (contributionMarginPercentage / 100);
  }, [totalFixedCosts, contributionMarginPercentage]);

  const breakEvenUnits = useMemo(() => {
    if (avgTicket <= 0) return 0;
    return breakEvenRevenue / avgTicket;
  }, [breakEvenRevenue, avgTicket]);

  const handleAddCost = () => {
    if (!newCost.label || newCost.amount <= 0) return;
    setFixedCosts([...fixedCosts, { 
      id: Math.random().toString(36).substr(2, 9), 
      label: newCost.label, 
      amount: newCost.amount, 
      category: 'altro' 
    }]);
    setNewCost({ label: '', amount: 0 });
    setIsAddingCost(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Risultato Principale - Hero Card */}
      <section className="bg-black rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group mx-2">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Target Mensile Pareggio</span>
            <Calculator size={18} className="text-gray-400" />
          </div>
          <div>
            <p className="text-5xl font-black tracking-tighter">€ {breakEvenRevenue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Fatturato minimo necessario</p>
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase">Clienti/Pizze</p>
              <p className="text-lg font-black">{Math.ceil(breakEvenUnits)} <span className="text-[10px] text-gray-500 font-bold">UNITÀ</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-black uppercase">Margine Contribuzione</p>
              <p className="text-lg font-black text-green-400">{contributionMarginPercentage}%</p>
            </div>
          </div>
        </div>
      </section>

      {/* Incidenza Variabile */}
      <section className="space-y-3 px-2">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Incidenze Variabili (%)</h2>
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm space-y-6 border border-gray-50">
          {[
            { label: 'Food Cost Medio', key: 'foodCost', color: 'bg-blue-500' },
            { label: 'Packaging e Servizio', key: 'service', color: 'bg-purple-500' },
            { label: 'Sfrido e Errori', key: 'waste', color: 'bg-red-500' }
          ].map((item) => (
            <div key={item.key} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">{item.label}</span>
                <span className="text-sm font-black">{incidence[item.key as keyof VariableIncidence]}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="60" 
                value={incidence[item.key as keyof VariableIncidence]}
                onChange={(e) => setIncidence({...incidence, [item.key]: parseInt(e.target.value)})}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Scontrino Medio */}
      <section className="px-2">
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm flex justify-between items-center border border-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gray-50 rounded-2xl text-gray-400"><Wallet size={20}/></div>
            <div>
              <p className="text-sm font-bold">Scontrino Medio</p>
              <p className="text-[9px] text-gray-400 font-black uppercase">Revenue media per cliente</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-gray-100 px-4 py-3 rounded-2xl">
            <span className="text-xs font-black text-gray-400">€</span>
            <input 
              type="number" 
              className="w-12 bg-transparent text-center font-black text-sm border-none focus:ring-0" 
              value={avgTicket}
              onChange={(e) => setAvgTicket(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </section>

      {/* Costi Fissi */}
      <section className="space-y-3 px-2">
        <div className="flex justify-between items-center px-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Costi Fissi Mensili</h2>
          <button 
            onClick={() => setIsAddingCost(true)}
            className="text-blue-500 font-black text-[10px] uppercase tracking-widest flex items-center space-x-1"
          >
            <Plus size={14}/> <span>Aggiungi</span>
          </button>
        </div>
        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-50">
          {fixedCosts.map((cost, idx) => (
            <div 
              key={cost.id} 
              className={`flex justify-between items-center p-5 active:bg-gray-50 transition-colors ${idx !== fixedCosts.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div>
                <p className="font-bold text-sm">{cost.label}</p>
                <p className="text-[9px] text-gray-400 font-black uppercase">{cost.category}</p>
              </div>
              <div className="flex items-center space-x-4">
                <p className="font-black text-sm">€ {cost.amount}</p>
                <button 
                  onClick={() => setFixedCosts(fixedCosts.filter(c => c.id !== cost.id))}
                  className="text-red-200 active:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          <div className="p-6 bg-gray-50/50 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Totale Fissi</span>
            <span className="font-black text-xl">€ {totalFixedCosts.toLocaleString('it-IT')}</span>
          </div>
        </div>
      </section>

      {/* Overlay Add Cost */}
      {isAddingCost && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 pb-12">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
            <h3 className="text-2xl font-black mb-6">Nuovo Costo Fisso</h3>
            <div className="space-y-4">
              <input 
                placeholder="Nome costo (es. Assicurazione)" 
                className="w-full bg-gray-50 rounded-2xl p-4 font-bold border-none"
                value={newCost.label}
                onChange={e => setNewCost({...newCost, label: e.target.value})}
              />
              <div className="flex items-center space-x-2 bg-gray-50 rounded-2xl p-4">
                <span className="font-black text-gray-400">€</span>
                <input 
                  type="number"
                  placeholder="Importo mensile" 
                  className="flex-1 bg-transparent font-bold border-none"
                  value={newCost.amount || ''}
                  onChange={e => setNewCost({...newCost, amount: parseFloat(e.target.value)})}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setIsAddingCost(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-400 active:scale-95 transition-all">Annulla</button>
                <button onClick={handleAddCost} className="flex-1 py-4 bg-black text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all">Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BepView;
