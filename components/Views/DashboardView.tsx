
import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Target,
  Calculator,
  Wallet,
  Users,
  ChevronRight,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  Package
} from 'lucide-react';
import { MenuItem, Ingredient, SubRecipe, UserData, Employee, Review, ReviewStats } from '../../types';
import { calculateMenuItemCost } from '../../services/calculator';
import ReviewsWidget from '../Widgets/ReviewsWidget';

interface DashboardViewProps {
  menu: MenuItem[];
  ingredients: Ingredient[];
  subRecipes: SubRecipe[];
  userData: UserData;
  employees?: Employee[];
  reviews?: Review[];
  reviewStats?: ReviewStats;
  onViewAllReviews?: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  menu, 
  ingredients, 
  subRecipes, 
  userData, 
  employees = [],
  reviews = [],
  reviewStats,
  onViewAllReviews
}) => {
  const bep = userData.bepConfig || { fixedCosts: [], foodCostIncidence: 30, serviceIncidence: 5, wasteIncidence: 2, averageTicket: 15 };

  // --- CALCOLO STATISTICHE BEP REALI ---
  const bepStats = useMemo(() => {
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

    return { totalFixed, breakEvenRevenue, breakEvenCovers, marginRatio };
  }, [employees, bep]);

  const performanceData = useMemo(() => {
    if (menu.length === 0) return { starProducts: [], avgFc: 0 };
    const items = menu.map(item => {
      const cost = calculateMenuItemCost(item, ingredients, subRecipes);
      const margin = item.sellingPrice - cost;
      const fc = item.sellingPrice > 0 ? (cost / item.sellingPrice) * 100 : 0;
      return { ...item, cost, margin, fc };
    });
    const starProducts = [...items].sort((a, b) => b.margin - a.margin).slice(0, 3);
    const avgFc = items.reduce((acc, i) => acc + i.fc, 0) / items.length;
    return { starProducts, avgFc };
  }, [menu, ingredients, subRecipes]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* WIDGET 1: BREAK-EVEN SOSTENIBILITÀ */}
        <div className="bg-black rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Target size={120} /></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Analisi Sostenibilità</h3>
              <Calculator size={20} className="text-white/20" />
            </div>
            
            <div className="space-y-1 mb-8">
              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Target Pareggio Mensile</p>
              <p className="text-5xl font-black tracking-tighter">€ {Math.round(bepStats.breakEvenRevenue).toLocaleString('it-IT')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/5">
                <p className="text-[8px] font-black text-white/40 uppercase mb-1">Coperti Necessari</p>
                <p className="text-xl font-black tracking-tighter">{Math.ceil(bepStats.breakEvenCovers)} <span className="text-[9px] text-white/20">UNITÀ</span></p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/5">
                <p className="text-[8px] font-black text-white/40 uppercase mb-1">Margine Contrib.</p>
                <p className="text-xl font-black tracking-tighter text-green-400">{Math.round(bepStats.marginRatio * 100)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* WIDGET 2: COSTI FISSI RIEPILOGO */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Ripartizione Fissi</h3>
            <div className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              TOT: € {Math.round(bepStats.totalFixed).toLocaleString('it-IT')}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center space-x-3">
                <Users size={18} className="text-purple-600" />
                <span className="text-xs font-bold text-gray-600">Personale</span>
              </div>
              <span className="text-sm font-black">€ {Math.round(bepStats.totalFixed - bep.fixedCosts.reduce((a,c)=>a+c.amount,0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center space-x-3">
                <Wallet size={18} className="text-blue-500" />
                <span className="text-xs font-bold text-gray-600">Altre Spese</span>
              </div>
              <span className="text-sm font-black">€ {Math.round(bep.fixedCosts.reduce((a,c)=>a+c.amount,0)).toLocaleString()}</span>
            </div>
          </div>
          <p className="text-[8px] font-black uppercase text-gray-300 mt-6 leading-tight">I calcoli includono costi staff, fissi e incidenze variabili dichiarate.</p>
        </div>

        {/* WIDGET 3: PERFORMANCE MENU */}
        <div className="bg-gray-100 rounded-[2.5rem] p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">Top Margini (Star)</h3>
          <div className="space-y-3">
            {performanceData.starProducts.map((item, idx) => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm">
                <div className="flex items-center space-x-3">
                  <span className="text-[10px] font-black text-gray-400">#{idx+1}</span>
                  <span className="text-xs font-bold uppercase text-black">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-green-600">€ {item.margin.toFixed(2)}</p>
                  <p className="text-[8px] font-black text-gray-300 uppercase">MARGINE</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WIDGET 4: KPI RAPIDI */}
        <div className="bg-[#FFCC66] rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-black/40">KPI Rapidi</h3>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/40 rounded-3xl p-5 backdrop-blur-sm">
              <p className="text-[9px] font-black text-black/40 uppercase mb-1">Ticket Avg</p>
              <p className="text-2xl font-black tracking-tighter text-black">€ {bep.averageTicket}</p>
            </div>
            <div className="bg-white/40 rounded-3xl p-5 backdrop-blur-sm">
              <p className="text-[9px] font-black text-black/40 uppercase mb-1">Food Cost Avg</p>
              <p className="text-2xl font-black tracking-tighter text-black">{performanceData.avgFc.toFixed(1)}%</p>
            </div>
          </div>
          <div className="mt-6 flex items-center space-x-2 text-[8px] font-black uppercase text-black/30">
            <Activity size={12} />
            <span>Soglia Allerta: {userData.foodCostThreshold}%</span>
          </div>
        </div>

        {/* WIDGET 5: RECENSIONI ONLINE */}
        {reviews.length > 0 && reviewStats && onViewAllReviews && (
          <ReviewsWidget
            reviews={reviews}
            averageRating={reviewStats.averageRating}
            onViewAll={onViewAllReviews}
          />
        )}

      </div>
    </div>
  );
};

export default DashboardView;
