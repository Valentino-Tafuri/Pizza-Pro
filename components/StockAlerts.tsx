import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ShoppingCart, Bell } from 'lucide-react';
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

  // Se non ci sono avvisi o sono stati nascosti, non mostrare nulla
  if (alerts.length === 0 || dismissed) return null;

  return (
    <>
      {/* Campanella Notifiche - Fissa in alto a destra */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowModal(true)}
          className="relative bg-white rounded-full p-3 shadow-lg border-2 border-red-200 hover:bg-red-50 transition-all active:scale-95"
          title={`${alerts.length} avviso${alerts.length > 1 ? 'i' : ''} attivo${alerts.length > 1 ? 'i' : ''}`}
        >
          <Bell className="text-red-600" size={24} />
          {alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center">
              {alerts.length > 9 ? '9+' : alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Modal Tutti gli Avvisi */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 rounded-full p-2">
                  <Bell className="text-red-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-black">
                    Avvisi Attivi
                  </h2>
                  <p className="text-xs font-semibold text-gray-500">
                    {alerts.length} avviso{alerts.length > 1 ? 'i' : ''} da gestire
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-black transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Sezione Scorte Basse */}
              {alerts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="text-red-600" size={20} />
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">
                      Scorte Basse ({alerts.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.preparationId}
                        className="bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-base font-black text-black mb-1">
                              {alert.preparationName}
                            </h4>
                            <div className="flex items-center gap-4 text-sm">
                              <p className="font-semibold text-red-700">
                                Stock: <span className="font-black">{alert.currentStock}</span> / <span className="font-black">{alert.minStock}</span>
                              </p>
                              <p className="text-xs font-bold text-red-600 bg-red-200 px-2 py-1 rounded-full">
                                Mancano {alert.missingQuantity} unità
                              </p>
                            </div>
                          </div>
                        </div>

                        {alert.ingredientsNeeded.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                              Ingredienti da Ordinare:
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {alert.ingredientsNeeded.map((ing) => {
                                let formattedQty = '';
                                if (ing.unit === 'kg' || ing.unit === 'l') {
                                  formattedQty = ing.quantityNeeded >= 1000 
                                    ? `${(ing.quantityNeeded / 1000).toFixed(2)} ${ing.unit}`
                                    : `${ing.quantityNeeded} g`;
                                } else {
                                  formattedQty = `${ing.quantityNeeded} ${ing.unit}`;
                                }
                                
                                return (
                                  <div
                                    key={ing.ingredientId}
                                    className="flex items-center justify-between bg-white rounded-lg p-2"
                                  >
                                    <span className="text-xs font-semibold text-gray-700">
                                      {ing.ingredientName}
                                    </span>
                                    <span className="text-xs font-black text-black">
                                      {formattedQty}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Qui si possono aggiungere altre sezioni di avvisi in futuro */}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => {
                  setDismissed(true);
                  setShowModal(false);
                }}
                className="text-sm font-semibold text-gray-600 hover:text-black transition-colors"
              >
                Nascondi avvisi
              </button>
              <div className="flex items-center gap-3">
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
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StockAlerts;

