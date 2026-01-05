
import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Target, Calculator, Wallet, Plus, Trash2, 
  ChevronRight, ArrowUpRight, BarChart3, AlertTriangle, Users
} from 'lucide-react';
import { UserData, Employee, BepConfig, FixedCost } from '../../types';

interface AssetsViewProps {
  userData: UserData;
  employees: Employee[];
  onUpdateBep: (config: BepConfig) => Promise<void>;
}

const AssetsView: React.FC<AssetsViewProps> = ({ userData, employees, onUpdateBep }) => {
  const [showAddCost, setShowAddCost] = useState(false);
  const [newCost, setNewCost] = useState<Partial<FixedCost>>({ label: '', amount: 0, category: 'altro' });

  const bep = userData.bepConfig;

  const stats = useMemo(() => {
    const totalStaffCost = employees.reduce((acc, emp) => {
      const salary = Number(emp.monthlySalary) || 0;
      const contribution = Number(emp.contributionPercentage) || 0;
      return acc + (salary * (1 + (contribution / 100)));
    }, 0);
    
    const otherFixedCosts = bep.fixedCosts.reduce((acc, cost) => acc + (Number(cost.amount) || 0), 0);
    const totalFixed = totalStaffCost + otherFixedCosts;
    
    const varPerc = (Number(bep.foodCostIncidence) + Number(bep.serviceIncidence) + Number(bep.wasteIncidence)) / 100;
    const marginRatio = 1 - varPerc;
    
    const breakEvenRevenue = marginRatio > 0 ? totalFixed / marginRatio : 0;
    const breakEvenCovers = bep.averageTicket > 0 ? breakEvenRevenue / bep.averageTicket : 0;

    return { totalFixed, totalStaffCost, otherFixedCosts, breakEvenRevenue, breakEvenCovers, marginRatio };
  }, [employees, bep]);

  const handleAddCost = async () => {
    if (!newCost.label || !newCost.amount) return;
    const updatedCosts = [...bep.fixedCosts, { ...newCost, id: Math.random().toString(36).substr(2, 9) } as FixedCost];
    await onUpdateBep({ ...bep, fixedCosts: updatedCosts });
    setShowAddCost(false);
    setNewCost({ label: '', amount: 0, category: 'altro' });
  };

  const handleRemoveCost = async (id: string) => {
    const updatedCosts = bep.fixedCosts.filter(c => c.id !== id);
    await onUpdateBep({ ...bep, fixedCosts: updatedCosts });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* BEP Hero */}
      <section className="bg-black rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <TrendingUp size={120} />
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Punto di Pareggio (BEP) Mensile</p>
            <p className="text-6xl font-black tracking-tighter">€ {Math.round(stats.breakEvenRevenue).toLocaleString('it-IT')}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md">
              <p className="text-[9px] font-black uppercase text-white/40 mb-1">Coperti Necessari</p>
              <p className="text-2xl font-black tracking-tight">{Math.ceil(stats.breakEvenCovers)}</p>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md">
              <p className="text-[9px] font-black uppercase text-white/40 mb-1">Margine Contrib.</p>
              <p className="text-2xl font-black tracking-tight text-green-400">{Math.round(stats.marginRatio * 100)}%</p>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md">
              <p className="text-[9px] font-black uppercase text-white/40 mb-1">Costi Fissi Tot.</p>
              <p className="text-2xl font-black tracking-tight">€ {Math.round(stats.totalFixed).toLocaleString('it-IT')}</p>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md">
              <p className="text-[9px] font-black uppercase text-white/40 mb-1">Ticket Medio</p>
              <p className="text-2xl font-black tracking-tight">€ {bep.averageTicket}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Costi Fissi Detail */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Analisi Costi Fissi</h3>
            <button onClick={() => setShowAddCost(true)} className="text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center space-x-1">
              <Plus size={14} /> <span>Aggiungi Spesa</span>
            </button>
          </div>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 bg-purple-50/50 flex justify-between items-center border-b border-purple-100">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Users size={20} /></div>
                <div>
                  <p className="text-sm font-black text-black">Costo Personale</p>
                  <p className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">Calcolato automaticamente</p>
                </div>
              </div>
              <p className="text-lg font-black text-purple-600">€ {Math.round(stats.totalStaffCost).toLocaleString()}</p>
            </div>
            {bep.fixedCosts.map((cost) => (
              <div key={cost.id} className="p-6 flex justify-between items-center border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center font-black text-[10px] text-gray-300 uppercase">{cost.category[0]}</div>
                  <div>
                    <p className="text-sm font-black text-black">{cost.label}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{cost.category}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <p className="text-sm font-black text-black">€ {cost.amount}</p>
                  <button onClick={() => handleRemoveCost(cost.id)} className="text-red-100 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Incidenze Detail */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-4">Parametri Variabili</h3>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-10">
            {[
              { label: 'Food Cost Previsto', key: 'foodCostIncidence', color: 'accent-orange-500' },
              { label: 'Packaging & Servizio', key: 'serviceIncidence', color: 'accent-blue-500' },
              { label: 'Sfrido & Errori', key: 'wasteIncidence', color: 'accent-red-500' }
            ].map(inc => (
              <div key={inc.key} className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-black text-black uppercase tracking-widest">{inc.label}</span>
                  <span className="text-xs font-black bg-gray-50 px-4 py-2 rounded-2xl">{(bep as any)[inc.key]}%</span>
                </div>
                <input 
                  type="range" min="0" max="60" 
                  className={`w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer ${inc.color}`}
                  value={(bep as any)[inc.key]}
                  onChange={e => onUpdateBep({ ...bep, [inc.key]: parseInt(e.target.value) })}
                />
              </div>
            ))}
            
            {/* Delivery Toggle e Percentuale */}
            <div className="pt-6 border-t border-gray-50 space-y-4">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-black text-black uppercase tracking-widest">Delivery</span>
                  <button
                    onClick={() => onUpdateBep({ ...bep, deliveryEnabled: !bep.deliveryEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${bep.deliveryEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${bep.deliveryEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-[10px] font-bold text-gray-400">{bep.deliveryEnabled ? 'ON' : 'OFF'}</span>
                </div>
              </div>
              {bep.deliveryEnabled && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-black text-black uppercase tracking-widest">Costo Delivery</span>
                    <span className="text-xs font-black bg-gray-50 px-4 py-2 rounded-2xl">{(bep.deliveryIncidence || 0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="20" 
                    className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-green-500"
                    value={bep.deliveryIncidence || 0}
                    onChange={e => onUpdateBep({ ...bep, deliveryIncidence: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>
            
            <div className="pt-6 border-t border-gray-50">
              <div className="flex justify-between items-center bg-gray-50 p-6 rounded-[2rem]">
                <div>
                  <p className="text-sm font-black text-black tracking-tight">Scontrino Medio (Coperto)</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Cambio prezzo per ricalcolo BEP</p>
                </div>
                <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 flex items-center space-x-2">
                  <span className="text-xs font-black text-gray-300">€</span>
                  <input 
                    type="number" 
                    className="w-16 bg-transparent text-right font-black text-sm border-none focus:ring-0 p-0" 
                    value={bep.averageTicket} 
                    onChange={e => onUpdateBep({ ...bep, averageTicket: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showAddCost && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl space-y-8">
            <h3 className="text-3xl font-black tracking-tighter">Nuova Spesa Fissa</h3>
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Etichetta</label>
                <input placeholder="Esempio: Affitto, Utenze..." className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold" value={newCost.label} onChange={e => setNewCost({...newCost, label: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Importo Mensile (€)</label>
                <input type="number" placeholder="0.00" className="w-full bg-gray-50 border-none rounded-2xl p-5 text-2xl font-black" value={newCost.amount || ''} onChange={e => setNewCost({...newCost, amount: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowAddCost(false)} className="flex-1 py-5 bg-gray-100 rounded-3xl font-black text-gray-400">Annulla</button>
              <button onClick={handleAddCost} className="flex-1 py-5 bg-black text-white rounded-3xl font-black shadow-xl active:scale-95 transition-all">Salva Spesa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsView;
