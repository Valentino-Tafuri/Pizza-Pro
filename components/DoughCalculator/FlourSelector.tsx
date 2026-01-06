import React, { useState, useMemo } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import { Ingredient } from '../../types';
import { FlourSelection } from '../../utils/doughCalculator';

interface FlourSelectorProps {
  flourSelections: FlourSelection[];
  availableFlours: Ingredient[];
  onUpdate: (selections: FlourSelection[]) => void;
  phaseLabel: string;
}

export const FlourSelector: React.FC<FlourSelectorProps> = ({
  flourSelections,
  availableFlours,
  onUpdate,
  phaseLabel
}) => {
  const [selectedFlourId, setSelectedFlourId] = useState<string>('');
  const [newPercentage, setNewPercentage] = useState<number>(0);
  
  const totalPercentage = flourSelections.reduce((sum, f) => sum + f.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;
  
  // Farine disponibili (non già selezionate)
  const availableFloursForSelect = useMemo(() => {
    const selectedIds = new Set(flourSelections.map(f => f.id));
    return availableFlours.filter(flour => !selectedIds.has(flour.id));
  }, [availableFlours, flourSelections]);
  
  const handleAddFlour = () => {
    if (!selectedFlourId || newPercentage <= 0) return;
    
    const newSelection: FlourSelection = { id: selectedFlourId, percentage: newPercentage };
    onUpdate([...flourSelections, newSelection]);
    setSelectedFlourId('');
    setNewPercentage(0);
  };
  
  const handleRemoveFlour = (flourId: string) => {
    onUpdate(flourSelections.filter(f => f.id !== flourId));
  };
  
  const handleUpdatePercentage = (flourId: string, percentage: number) => {
    const updated = flourSelections.map(f =>
      f.id === flourId ? { ...f, percentage: Math.max(0, Math.min(100, percentage)) } : f
    );
    onUpdate(updated);
  };
  
  const autoDistribute = () => {
    if (flourSelections.length === 0) return;
    const equalPercentage = 100 / flourSelections.length;
    const updated = flourSelections.map(f => ({ ...f, percentage: equalPercentage }));
    onUpdate(updated);
  };
  
  return (
    <div className="space-y-3">
      {flourSelections.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-500">
            Totale: {totalPercentage.toFixed(1)}%
          </span>
          {!isValid && (
            <button
              onClick={autoDistribute}
              className="text-xs text-blue-600 font-bold hover:text-blue-700"
            >
              Distribuisci Equamente
            </button>
          )}
        </div>
      )}
      
      <div className="space-y-2">
        {flourSelections.map(selection => {
          const flour = availableFlours.find(f => f.id === selection.id);
          if (!flour) return null;
          
          return (
            <div key={selection.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-black truncate">{flour.name}</p>
                <p className="text-xs text-gray-400 font-semibold">{flour.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={selection.percentage}
                  onChange={(e) => handleUpdatePercentage(selection.id, parseFloat(e.target.value) || 0)}
                  className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-xs font-bold text-gray-400 w-6">%</span>
                <button
                  onClick={() => handleRemoveFlour(selection.id)}
                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Barra per aggiungere nuova farina */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
        <select
          value={selectedFlourId}
          onChange={(e) => setSelectedFlourId(e.target.value)}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Seleziona farina...</option>
          {availableFloursForSelect.map(flour => (
            <option key={flour.id} value={flour.id}>
              {flour.name}
            </option>
          ))}
        </select>
        
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={newPercentage || ''}
          onChange={(e) => setNewPercentage(parseFloat(e.target.value) || 0)}
          placeholder="%"
          className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <span className="text-xs font-bold text-gray-400 w-6">%</span>
        
        <button
          onClick={handleAddFlour}
          disabled={!selectedFlourId || newPercentage <= 0}
          className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
      
      {!isValid && totalPercentage > 0 && (
        <p className="text-xs text-red-600 font-semibold">
          ⚠️ Le percentuali devono sommare al 100%
        </p>
      )}
    </div>
  );
};

