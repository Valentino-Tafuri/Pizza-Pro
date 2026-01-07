import React, { useState, useMemo } from 'react';
import { Plus, X, Minus, ChevronDown } from 'lucide-react';
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

  const totalPercentage = flourSelections.reduce((sum, f) => sum + f.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  // Farine disponibili (non già selezionate)
  const availableFloursForSelect = useMemo(() => {
    const selectedIds = new Set(flourSelections.map(f => f.id));
    return availableFlours.filter(flour => !selectedIds.has(flour.id));
  }, [availableFlours, flourSelections]);

  const handleAddFlour = (flourId: string) => {
    if (!flourId) return;

    // Calcola percentuale rimanente
    const remaining = 100 - totalPercentage;
    const newPercentage = remaining > 0 ? remaining : 50;

    const newSelection: FlourSelection = { id: flourId, percentage: newPercentage };
    onUpdate([...flourSelections, newSelection]);
    setSelectedFlourId('');
  };

  const handleRemoveFlour = (flourId: string) => {
    onUpdate(flourSelections.filter(f => f.id !== flourId));
  };

  const handleUpdatePercentage = (flourId: string, delta: number) => {
    const updated = flourSelections.map(f => {
      if (f.id === flourId) {
        const newValue = Math.max(0, Math.min(100, f.percentage + delta));
        return { ...f, percentage: parseFloat(newValue.toFixed(1)) };
      }
      return f;
    });
    onUpdate(updated);
  };

  const handleSetPercentage = (flourId: string, value: number) => {
    const updated = flourSelections.map(f =>
      f.id === flourId ? { ...f, percentage: Math.max(0, Math.min(100, value)) } : f
    );
    onUpdate(updated);
  };

  const autoDistribute = () => {
    if (flourSelections.length === 0) return;
    const equalPercentage = parseFloat((100 / flourSelections.length).toFixed(1));
    const updated = flourSelections.map((f, i) => ({
      ...f,
      percentage: i === flourSelections.length - 1
        ? parseFloat((100 - equalPercentage * (flourSelections.length - 1)).toFixed(1))
        : equalPercentage
    }));
    onUpdate(updated);
  };

  return (
    <div className="space-y-2">
      {/* Header con totale */}
      {flourSelections.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span className={`text-xs font-bold ${isValid ? 'text-green-600' : 'text-amber-600'}`}>
              {totalPercentage.toFixed(1)}%
            </span>
          </div>
          {!isValid && flourSelections.length > 1 && (
            <button
              onClick={autoDistribute}
              className="text-xs text-blue-600 font-bold hover:text-blue-700 active:scale-95 transition-all"
            >
              Distribuisci
            </button>
          )}
        </div>
      )}

      {/* Farine selezionate - Stile iOS */}
      <div className="space-y-2">
        {flourSelections.map(selection => {
          const flour = availableFlours.find(f => f.id === selection.id);
          if (!flour) return null;

          return (
            <div key={selection.id} className="bg-gray-50 rounded-2xl overflow-hidden">
              <div className="flex items-center p-3 gap-3">
                {/* Info farina */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{flour.name}</p>
                  <p className="text-xs text-gray-500 font-medium">{flour.category}</p>
                </div>

                {/* Stepper iOS Style */}
                <div className="flex items-center gap-1">
                  <div className="flex items-center bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleUpdatePercentage(selection.id, -5)}
                      className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-200"
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>

                    <input
                      type="number"
                      value={selection.percentage}
                      onChange={(e) => handleSetPercentage(selection.id, parseFloat(e.target.value) || 0)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-16 h-10 text-center text-sm font-bold text-gray-900 bg-transparent focus:outline-none focus:bg-blue-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                    <button
                      type="button"
                      onClick={() => handleUpdatePercentage(selection.id, 5)}
                      className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-gray-50 active:bg-gray-100 transition-colors border-l border-gray-200"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>

                  <span className="text-xs font-bold text-gray-400 w-5">%</span>

                  {/* Pulsante rimuovi */}
                  <button
                    onClick={() => handleRemoveFlour(selection.id)}
                    className="p-2 text-red-400 hover:text-red-600 active:scale-95 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Aggiungi farina - Stile iOS */}
      {availableFloursForSelect.length > 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-3">
          <select
            value={selectedFlourId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedFlourId(val);
              if (val) handleAddFlour(val);
            }}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
          >
            <option value="">+ Aggiungi farina...</option>
            {(() => {
              const groupedByCategory: Record<string, Ingredient[]> = {};
              availableFloursForSelect.forEach(flour => {
                const category = flour.category || 'Altre';
                if (!groupedByCategory[category]) groupedByCategory[category] = [];
                groupedByCategory[category].push(flour);
              });

              return Object.entries(groupedByCategory).map(([category, flours]) => (
                <optgroup key={category} label={category}>
                  {flours.map(flour => (
                    <option key={flour.id} value={flour.id}>
                      {flour.name}
                    </option>
                  ))}
                </optgroup>
              ));
            })()}
          </select>
        </div>
      )}

      {/* Feedback validazione */}
      {!isValid && totalPercentage > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-700 font-semibold">
            Le percentuali devono sommare al 100% (mancano {(100 - totalPercentage).toFixed(1)}%)
          </p>
        </div>
      )}

      {flourSelections.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 font-semibold">
            Seleziona almeno una farina per questa fase
          </p>
        </div>
      )}
    </div>
  );
};

