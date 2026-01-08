import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RankingIndicatorProps {
  position: number;
  totalRestaurants: number;
  city: string;
  trend: 'up' | 'down' | 'stable';
  trendChange?: number; // +3, -2, etc.
  lastUpdate: Date | any;
}

const RankingIndicator: React.FC<RankingIndicatorProps> = ({
  position,
  totalRestaurants,
  city,
  trend,
  trendChange,
  lastUpdate
}) => {
  const getGradientClass = () => {
    if (position <= 10) return 'from-yellow-400 to-yellow-600';
    if (position <= 25) return 'from-gray-300 to-gray-500';
    if (position <= 50) return 'from-orange-300 to-orange-500';
    return 'from-gray-200 to-gray-400';
  };

  const formatDate = (date: Date | any) => {
    if (!date) return 'Mai';
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Oggi';
    if (days === 1) return 'Ieri';
    if (days < 7) return `${days} giorni fa`;
    if (days < 30) return `${Math.floor(days / 7)} settimane fa`;
    return `${Math.floor(days / 30)} mesi fa`;
  };

  return (
    <div className={`bg-gradient-to-r ${getGradientClass()} rounded-2xl p-4 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
            Ranking {city}
          </p>
          <p className="text-2xl font-black">
            #{position} di {totalRestaurants}
          </p>
        </div>
        <div className="flex flex-col items-end">
          {trend === 'up' && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 animate-pulse">
              <TrendingUp size={16} />
              <span className="text-xs font-black">
                +{trendChange || 0}
              </span>
            </div>
          )}
          {trend === 'down' && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
              <TrendingDown size={16} />
              <span className="text-xs font-black">
                {trendChange || 0}
              </span>
            </div>
          )}
          {trend === 'stable' && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
              <Minus size={16} />
              <span className="text-xs font-black">Stabile</span>
            </div>
          )}
          <p className="text-[10px] font-semibold opacity-75 mt-1">
            Aggiornato {formatDate(lastUpdate)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RankingIndicator;




