import React, { useState, useMemo } from 'react';
import { Plus, X, Minus, Search } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const totalPercentage = flourSelections.reduce((sum, f) => sum + f.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  // Farine disponibili (non già selezionate)
  const availableFloursForSelect = useMemo(() => {
    const selectedIds = new Set(flourSelections.map(f => f.id));
    return availableFlours.filter(flour => !selectedIds.has(flour.id));
  }, [availableFlours, flourSelections]);

  // Farine filtrate per ricerca
  const filteredFlours = useMemo(() => {
    if (!searchTerm.trim()) return availableFloursForSelect;
    const term = searchTerm.toLowerCase();
    return availableFloursForSelect.filter(flour =>
      flour.name.toLowerCase().includes(term) ||
      flour.category?.toLowerCase().includes(term)
    );
  }, [availableFloursForSelect, searchTerm]);

  // Raggruppa per categoria
  const groupedFlours = useMemo(() => {
    const groups: Record<string, Ingredient[]> = {};
    filteredFlours.forEach(flour => {
      const category = flour.category || 'Altre';
      if (!groups[category]) groups[category] = [];
      groups[category].push(flour);
    });
    return groups;
  }, [filteredFlours]);

  const handleAddFlour = (flourId: string) => {
    if (!flourId) return;

    // Calcola percentuale rimanente
    const remaining = 100 - totalPercentage;
    const newPercentage = remaining > 0 ? remaining : 50;

    const newSelection: FlourSelection = { id: flourId, percentage: newPercentage };
    onUpdate([...flourSelections, newSelection]);
    setIsModalOpen(false);
    setSearchTerm('');
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

      {/* Pulsante Aggiungi farina */}
      {availableFloursForSelect.length > 0 && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full border-2 border-dashed border-blue-300 rounded-2xl py-4 px-6 text-blue-600 font-bold text-sm hover:bg-blue-50 hover:border-blue-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Aggiungi Farina
        </button>
      )}

      {/* Modal Aggiungi Farina */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-2xl font-black text-gray-900">Aggiungi Farina</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSearchTerm('');
                }}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Ricerca */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca farina..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista Farine */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredFlours.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-semibold text-sm">
                    {searchTerm ? 'Nessuna farina trovata' : 'Nessuna farina disponibile'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupedFlours).map(([category, flours]: [string, Ingredient[]]) => (
                    <div key={category}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 py-2">
                        {category}
                      </p>
                      {flours.map(flour => (
                        <button
                          key={flour.id}
                          type="button"
                          onClick={() => handleAddFlour(flour.id)}
                          className="w-full text-left p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl mb-2 transition-all active:scale-[0.98] border border-transparent hover:border-blue-200"
                        >
                          <p className="font-bold text-gray-900">{flour.name}</p>
                          <p className="text-xs font-semibold text-gray-500 uppercase mt-0.5">
                            {flour.category}
                          </p>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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

