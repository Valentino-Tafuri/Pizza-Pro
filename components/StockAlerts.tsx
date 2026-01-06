import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ShoppingCart } from 'lucide-react';
import { Preparation, Ingredient, StockAlert } from '../types';
import { calculateStockAlerts } from '../utils/stockCalculator';

interface StockAlertsProps {
  preparations: Preparation[];
  ingredients: Ingredient[];
  onNavigateToSuppliers?: () => void;
}

const StockAlerts: React.FC<StockAlertsProps> = ({
  preparations,
  ingredients,
  onNavigateToSuppliers
}) => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const newAlerts = calculateStockAlerts(preparations, ingredients);
    setAlerts(newAlerts);
    
    // Auto-refresh ogni 5 minuti
    const interval = setInterval(() => {
      const refreshed = calculateStockAlerts(preparations, ingredients);
      setAlerts(refreshed);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [preparations, ingredients]);

  if (alerts.length === 0 || dismissed) return null;

  return (
    <>
      {/* Notifica Banner */}
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 rounded-full p-2">
              <AlertTriangle className="text-white" size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-red-600">
                {alerts.length} Preparazione{alerts.length > 1 ? 'i' : ''} sotto scorta minima
              </p>
              <p className="text-xs font-semibold text-red-700">
                Clicca per vedere i dettagli e ordinare ingredienti
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 px-4 text-xs font-black transition-all active:scale-95"
            >
              Dettagli
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-red-600 hover:text-red-700 p-2 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dettagli */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-600" size={24} />
                <h2 className="text-xl font-black text-black">
                  Alert Scorte Basse ({alerts.length})
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.preparationId}
                  className="bg-red-50 border border-red-200 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-black text-black mb-1">
                        {alert.preparationName}
                      </h3>
                      <p className="text-sm font-semibold text-red-700">
                        Stock attuale: {alert.currentStock} / Minimo: {alert.minStock}
                      </p>
                      <p className="text-xs font-bold text-red-600 mt-1">
                        Mancano {alert.missingQuantity} unità
                      </p>
                    </div>
                  </div>

                  {alert.ingredientsNeeded.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                        Ingredienti da Ordinare:
                      </p>
                      <div className="space-y-2">
                        {alert.ingredientsNeeded.map((ing) => (
                          <div
                            key={ing.ingredientId}
                            className="flex items-center justify-between bg-white rounded-lg p-2"
                          >
                            <span className="text-sm font-semibold text-gray-700">
                              {ing.ingredientName}
                            </span>
                            <span className="text-sm font-black text-black">
                              {ing.quantityNeeded} {ing.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-between">
              <button
                onClick={() => setDismissed(true)}
                className="text-sm font-semibold text-gray-600 hover:text-black transition-colors"
              >
                Non mostrare più
              </button>
              {onNavigateToSuppliers && (
                <button
                  onClick={() => {
                    onNavigateToSuppliers();
                    setShowModal(false);
                  }}
                  className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95"
                >
                  <ShoppingCart size={18} />
                  Ordina da Fornitore
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StockAlerts;

