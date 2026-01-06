import React from 'react';
import { Calculator, Euro } from 'lucide-react';
import { Ingredient } from '../../types';
import { DoughCalculationResult } from '../../utils/doughCalculator';

interface RecipeSummaryProps {
  result: DoughCalculationResult;
  ingredients: Ingredient[];
  portionWeight?: number;
  multiplier: number;
}

export const RecipeSummary: React.FC<RecipeSummaryProps> = ({
  result,
  ingredients,
  portionWeight,
  multiplier
}) => {
  const getIngredientName = (id: string): string => {
    return ingredients.find(i => i.id === id)?.name || 'Ingrediente sconosciuto';
  };
  
  const formatWeight = (grams: number): string => {
    // Gestisci NaN, undefined o null
    const value = grams || 0;
    if (value >= 1000) {
      return `${(value / 1000).toFixed(3)} kg`;
    }
    return `${value.toFixed(1)} g`;
  };
  
  // result.totalWeight è già moltiplicato per multiplier nell'hook
  // result.totalCost è già moltiplicato per multiplier nell'hook
  const costPerPortion = portionWeight && result.totalWeight > 0
    ? (result.totalCost / result.totalWeight) * portionWeight
    : undefined;
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="text-blue-600" size={24} />
        <h3 className="text-2xl font-black text-black">Riepilogo Ricetta</h3>
      </div>
      
      <div className="space-y-6">
        {/* 1° FASE - Pre-fermento */}
        {result.preferment && (
          <div>
            <h4 className="font-black text-sm text-gray-700 uppercase tracking-widest mb-3">
              1° FASE - Pre-fermento
            </h4>
            <div className="bg-white rounded-xl p-4 space-y-2">
              {result.preferment.flourBreakdown.map((flour, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">
                    {getIngredientName(flour.flourId)}
                  </span>
                  <span className="font-black text-black">{formatWeight(flour.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                <span className="font-semibold text-gray-700">Acqua</span>
                <span className="font-black text-black">{formatWeight(result.preferment.water)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">Lievito</span>
                <span className="font-black text-black">{formatWeight(result.preferment.yeast)}</span>
              </div>
              {result.preferment.salt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">Sale</span>
                  <span className="font-black text-black">{formatWeight(result.preferment.salt)}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 2° FASE - Autolisi */}
        {result.autolysis && (
          <div>
            <h4 className="font-black text-sm text-gray-700 uppercase tracking-widest mb-3">
              2° FASE - Autolisi
            </h4>
            <div className="bg-white rounded-xl p-4 space-y-2">
              {result.autolysis.flourBreakdown.map((flour, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">
                    {getIngredientName(flour.flourId)}
                  </span>
                  <span className="font-black text-black">{formatWeight(flour.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                <span className="font-semibold text-gray-700">Acqua</span>
                <span className="font-black text-black">{formatWeight(result.autolysis.water)}</span>
              </div>
              {result.autolysis.salt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">Sale</span>
                  <span className="font-black text-black">{formatWeight(result.autolysis.salt)}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 3° FASE - Chiusura */}
        <div>
          <h4 className="font-black text-sm text-gray-700 uppercase tracking-widest mb-3">
            3° FASE - Chiusura
          </h4>
          <div className="bg-white rounded-xl p-4 space-y-2">
            {result.closure.flourBreakdown && result.closure.flourBreakdown.length > 0 ? (
              result.closure.flourBreakdown.map((flour, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">
                    {getIngredientName(flour.flourId)}
                  </span>
                  <span className="font-black text-black">{formatWeight(flour.amount)}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 font-semibold italic pb-2">
                Nessuna farina selezionata per la chiusura
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
              <span className="font-semibold text-gray-700">Acqua di chiusura</span>
              <span className="font-black text-black">{formatWeight(result.closure.water || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-700">Sale</span>
              <span className="font-black text-black">{formatWeight(result.closure.salt || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-700">Lievito</span>
              <span className="font-black text-black">{formatWeight(result.closure.yeast || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-700">Olio</span>
              <span className="font-black text-black">{formatWeight(result.closure.oil || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-700">Malto</span>
              <span className="font-black text-black">{formatWeight(result.closure.malt || 0)}</span>
            </div>
            {result.closure.additionalIngredients && result.closure.additionalIngredients.length > 0 && (
              <>
                {result.closure.additionalIngredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-700">
                      {getIngredientName(ing.ingredientId)}
                    </span>
                    <span className="font-black text-black">{formatWeight(ing.amount || 0)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        
        {/* Totali */}
        <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <span className="font-black text-sm text-gray-700">PESO TOTALE IMPASTO</span>
            <span className="font-black text-lg text-black">{formatWeight(result.totalWeight)}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="font-bold text-sm text-gray-600">Idratazione totale</span>
            <span className="font-black text-sm text-gray-800">
              {(() => {
                const totalFlour = (result.preferment?.flour || 0) + (result.autolysis?.flour || 0) + result.closure.remainingFlour;
                const totalWater = (result.preferment?.water || 0) + (result.autolysis?.water || 0) + result.closure.water;
                return totalFlour > 0 ? ((totalWater / totalFlour) * 100).toFixed(1) : '0';
              })()}%
            </span>
          </div>
        </div>
        
        {/* Costi - Sempre visibile */}
        <div className="bg-white rounded-xl p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <Euro className="text-green-600" size={18} />
            <span className="font-black text-sm text-gray-700 uppercase">Analisi Costi</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-600">Costo totale impasto</span>
              <span className="font-black text-green-600">
                {result.totalCost > 0 ? `€${result.totalCost.toFixed(2)}` : '€0.00'}
              </span>
            </div>
            {result.totalCost === 0 && (
              <p className="text-xs text-amber-600 font-semibold mt-1">
                💡 Aggiungi ingredienti dall'economato con prezzi per calcolare i costi
              </p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="font-semibold text-gray-600">Costo al kg</span>
              <span className="font-black text-green-600">
                {result.costPerKg > 0 ? `€${result.costPerKg.toFixed(2)}` : '€0.00'}
              </span>
            </div>
            {portionWeight && costPerPortion !== undefined && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="font-semibold text-gray-600">
                  Costo per porzione ({portionWeight}g)
                </span>
                <span className="font-black text-green-600">
                  {costPerPortion > 0 ? `€${costPerPortion.toFixed(2)}` : '€0.00'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

