import React, { useState, useMemo } from 'react';
import { Search, AlertTriangle, TrendingUp, Package, Edit2, X, Save, Copy, Check } from 'lucide-react';
import { Preparation, Ingredient } from '../../types';
import { calculateIngredientsNeeded } from '../../utils/stockCalculator';

interface WarehouseViewProps {
  preparations: Preparation[];
  ingredients: Ingredient[];
  onUpdateStock: (prepId: string, newStock: number, note: string) => void;
  onToggleActive: (prepId: string, isActive: boolean) => void;
}

const WarehouseView: React.FC<WarehouseViewProps> = ({ 
  preparations, 
  ingredients,
  onUpdateStock, 
  onToggleActive 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [editingPrep, setEditingPrep] = useState<Preparation | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [editNote, setEditNote] = useState<string>('');
  const [orderPrep, setOrderPrep] = useState<Preparation | null>(null);
  const [copied, setCopied] = useState(false);

  // Filtra solo preparazioni attive
  const activePreparations = useMemo(() => {
    return preparations.filter(p => p.isActive);
  }, [preparations]);

  // Statistiche
  const stats = useMemo(() => {
    const total = activePreparations.length;
    const lowStock = activePreparations.filter(p => p.currentStock <= p.minStock).length;
    const totalStock = activePreparations.reduce((sum, p) => sum + p.currentStock, 0);
    const avgStock = total > 0 ? Math.round(totalStock / total) : 0;
    
    return { total, lowStock, totalStock, avgStock };
  }, [activePreparations]);

  // Preparazioni filtrate
  const filteredPreparations = useMemo(() => {
    let filtered = activePreparations;
    
    // Filtro ricerca
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtro scorte basse
    if (filter === 'low') {
      filtered = filtered.filter(p => p.currentStock <= p.minStock);
    }
    
    return filtered;
  }, [activePreparations, searchTerm, filter]);

  const handleEditClick = (prep: Preparation) => {
    setEditingPrep(prep);
    setEditStock(prep.currentStock);
    setEditNote('');
  };

  const handleSaveEdit = () => {
    if (!editingPrep) return;
    
    if (!editNote.trim()) {
      alert('⚠️ La nota è obbligatoria. Inserisci il motivo della modifica.');
      return;
    }

    if (editStock < 0) {
      alert('⚠️ Lo stock non può essere negativo.');
      return;
    }

    onUpdateStock(editingPrep.id, editStock, editNote.trim());
    setEditingPrep(null);
    setEditStock(0);
    setEditNote('');
  };

  const handleCancelEdit = () => {
    setEditingPrep(null);
    setEditStock(0);
    setEditNote('');
  };

  const handleOrderClick = (prep: Preparation) => {
    setOrderPrep(prep);
    setCopied(false);
  };

  const handleCloseOrder = () => {
    setOrderPrep(null);
    setCopied(false);
  };

  const getOrderList = (): string => {
    if (!orderPrep) return '';
    
    const missingUnits = orderPrep.minStock - orderPrep.currentStock;
    if (missingUnits <= 0) return '';
    
    const ingredientsNeeded = calculateIngredientsNeeded(
      orderPrep,
      orderPrep.minStock,
      ingredients
    );
    
    // Raggruppa per categoria
    const byCategory = new Map<string, typeof ingredientsNeeded>();
    
    ingredientsNeeded.forEach(ing => {
      const ingredient = ingredients.find(i => i.id === ing.ingredientId);
      if (!ingredient) return;
      
      const category = ingredient.category || 'Altro';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(ing);
    });
    
    // Formatta la lista
    let list = `ORDINE INGREDIENTI - ${orderPrep.name}\n`;
    list += `Stock attuale: ${orderPrep.currentStock} ${orderPrep.unit}\n`;
    list += `Stock minimo: ${orderPrep.minStock} ${orderPrep.unit}\n`;
    list += `Quantità da produrre: ${missingUnits} ${orderPrep.unit}\n\n`;
    list += '═'.repeat(50) + '\n\n';
    
    // Ordina le categorie alfabeticamente
    const sortedCategories = Array.from(byCategory.keys()).sort();
    
    sortedCategories.forEach((category, idx) => {
      list += `${category.toUpperCase()}\n`;
      list += '-'.repeat(category.length) + '\n';
      
      const items = byCategory.get(category)!;
      items.forEach(item => {
        // Formatta la quantità in modo leggibile
        let formattedQty = '';
        if (item.unit === 'kg' || item.unit === 'l') {
          formattedQty = item.quantityNeeded >= 1000 
            ? `${(item.quantityNeeded / 1000).toFixed(2)} ${item.unit}`
            : `${item.quantityNeeded} g`;
        } else {
          formattedQty = `${item.quantityNeeded} ${item.unit}`;
        }
        
        list += `  • ${item.ingredientName}: ${formattedQty}\n`;
      });
      
      if (idx < sortedCategories.length - 1) {
        list += '\n';
      }
    });
    
    return list;
  };

  const handleCopyOrder = async () => {
    const text = getOrderList();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback per browser che non supportano clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preparazioni Attive</span>
            <Package className="text-purple-600" size={20} />
          </div>
          <p className="text-3xl font-black text-black">{stats.total}</p>
        </div>
        
        <div className={`p-6 rounded-2xl shadow-sm border ${
          stats.lowStock > 0 
            ? 'bg-red-50 border-red-200' 
            : 'bg-white border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scorte Basse</span>
            <AlertTriangle className={stats.lowStock > 0 ? "text-red-600" : "text-gray-400"} size={20} />
          </div>
          <p className={`text-3xl font-black ${stats.lowStock > 0 ? 'text-red-600' : 'text-black'}`}>
            {stats.lowStock}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Totale</span>
            <TrendingUp className="text-green-600" size={20} />
          </div>
          <p className="text-3xl font-black text-black">{stats.totalStock}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Media Stock</span>
            <Package className="text-blue-600" size={20} />
          </div>
          <p className="text-3xl font-black text-black">{stats.avgStock}</p>
        </div>
      </div>

      {/* Alert Scorte Basse */}
      {stats.lowStock > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-red-600" size={24} />
            <h3 className="text-lg font-black text-red-600">Attenzione: Scorte Basse</h3>
          </div>
          <p className="text-sm font-semibold text-red-700">
            {stats.lowStock} preparazione{stats.lowStock > 1 ? 'i' : ''} sotto la soglia minima. Ordina ingredienti necessari.
          </p>
        </div>
      )}

      {/* Ricerca e Filtri */}
      <div className="flex flex-col md:flex-row gap-3 flex-shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cerca preparazione..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-4 rounded-2xl text-sm font-black uppercase transition-all ${
              filter === 'all'
                ? 'bg-black text-white shadow-lg'
                : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Tutte
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-6 py-4 rounded-2xl text-sm font-black uppercase transition-all ${
              filter === 'low'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Scorte Basse
          </button>
        </div>
      </div>

      {/* Tabella Preparazioni */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-200">
                  Preparazione
                </th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-200">
                  Categoria
                </th>
                <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-200">
                  Stock Attuale
                </th>
                <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-200">
                  Min. Stock
                </th>
                <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-200">
                  Stato
                </th>
                <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-200">
                  Azione
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredPreparations.map((prep) => {
                const isLowStock = prep.currentStock <= prep.minStock;
                const stockPercentage = prep.minStock > 0 
                  ? Math.min(100, (prep.currentStock / prep.minStock) * 100) 
                  : 100;
                
                return (
                  <tr
                    key={prep.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      isLowStock ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-black text-black">{prep.name}</div>
                          {isLowStock && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOrderClick(prep);
                              }}
                              className="flex items-center gap-1 mt-1 hover:opacity-80 transition-opacity cursor-pointer"
                            >
                              <AlertTriangle className="text-red-600" size={14} />
                              <span className="text-xs font-bold text-red-600 uppercase">
                                Ordina Ingredienti
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {prep.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-black text-black">
                          {prep.currentStock} {prep.unit}
                        </span>
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full transition-all ${
                              isLowStock ? 'bg-red-600' : 'bg-green-600'
                            }`}
                            style={{ width: `${stockPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-600">
                        {prep.minStock} {prep.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase ${
                          isLowStock
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {isLowStock ? 'Basso' : 'OK'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleEditClick(prep)}
                        className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white rounded-xl py-2 px-4 text-sm font-black transition-all active:scale-95"
                      >
                        <Edit2 size={16} />
                        Modifica
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredPreparations.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Package className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-400 font-semibold">
            {searchTerm || filter === 'low' 
              ? 'Nessuna preparazione trovata' 
              : 'Nessuna preparazione attiva. Attiva una preparazione per gestirla in magazzino.'}
          </p>
        </div>
      )}

      {/* Modal Modifica Stock */}
      {editingPrep && (
        <div className="fixed inset-0 z-[200] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-black">Modifica Stock</h3>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Preparazione
                </label>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-lg font-black text-black">{editingPrep.name}</p>
                  <p className="text-xs font-semibold text-gray-400 uppercase mt-1">
                    {editingPrep.category}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stock Attuale: {editingPrep.currentStock} {editingPrep.unit}
                </label>
                <input
                  type="number"
                  min={0}
                  value={editStock}
                  onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl py-4 px-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Nuovo stock"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nota / Motivo <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl py-4 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black resize-none"
                  rows={4}
                  placeholder="Inserisci il motivo della modifica dello stock (obbligatorio)..."
                  required
                />
                <p className="text-xs font-semibold text-gray-500 mt-1">
                  Questo campo è obbligatorio per tracciare le modifiche
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-4 px-6 text-sm font-black transition-all active:scale-95"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white rounded-xl py-4 px-6 text-sm font-black transition-all active:scale-95"
                >
                  <Save size={18} />
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ordine Ingredienti */}
      {orderPrep && (
        <div className="fixed inset-0 z-[200] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-xl font-black text-black">Ordine Ingredienti</h3>
                <p className="text-sm font-semibold text-gray-500 mt-1">{orderPrep.name}</p>
              </div>
              <button
                onClick={handleCloseOrder}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase">Stock Attuale</span>
                    <p className="text-lg font-black text-black">{orderPrep.currentStock} {orderPrep.unit}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase">Stock Minimo</span>
                    <p className="text-lg font-black text-black">{orderPrep.minStock} {orderPrep.unit}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs font-bold text-gray-400 uppercase">Quantità da Produrre</span>
                  <p className="text-xl font-black text-red-600">
                    {orderPrep.minStock - orderPrep.currentStock} {orderPrep.unit}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const missingUnits = orderPrep.minStock - orderPrep.currentStock;
                  if (missingUnits <= 0) {
                    return <p className="text-gray-400 text-center py-8">Nessun ingrediente necessario</p>;
                  }
                  
                  const ingredientsNeeded = calculateIngredientsNeeded(
                    orderPrep,
                    orderPrep.minStock,
                    ingredients
                  );
                  
                  if (ingredientsNeeded.length === 0) {
                    return <p className="text-gray-400 text-center py-8">Nessun ingrediente trovato per questa preparazione</p>;
                  }
                  
                  // Raggruppa per categoria
                  const byCategory = new Map<string, typeof ingredientsNeeded>();
                  
                  ingredientsNeeded.forEach(ing => {
                    const ingredient = ingredients.find(i => i.id === ing.ingredientId);
                    if (!ingredient) return;
                    
                    const category = ingredient.category || 'Altro';
                    if (!byCategory.has(category)) {
                      byCategory.set(category, []);
                    }
                    byCategory.get(category)!.push(ing);
                  });
                  
                  const sortedCategories = Array.from(byCategory.keys()).sort();
                  
                  return sortedCategories.map(category => {
                    const items = byCategory.get(category)!;
                    return (
                      <div key={category} className="bg-white border border-gray-200 rounded-xl p-4">
                        <h4 className="text-sm font-black text-black uppercase mb-3 pb-2 border-b border-gray-200">
                          {category}
                        </h4>
                        <ul className="space-y-2">
                          {items.map(item => {
                            const ingredient = ingredients.find(i => i.id === item.ingredientId);
                            let formattedQty = '';
                            if (item.unit === 'kg' || item.unit === 'l') {
                              formattedQty = item.quantityNeeded >= 1000 
                                ? `${(item.quantityNeeded / 1000).toFixed(2)} ${item.unit}`
                                : `${item.quantityNeeded} g`;
                            } else {
                              formattedQty = `${item.quantityNeeded} ${item.unit}`;
                            }
                            
                            return (
                              <li key={item.ingredientId} className="flex items-center justify-between text-sm">
                                <span className="font-semibold text-black">{item.ingredientName}</span>
                                <span className="font-black text-gray-700">{formattedQty}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center gap-3 flex-shrink-0">
              <textarea
                readOnly
                value={getOrderList()}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-mono resize-none"
                rows={8}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <button
                onClick={handleCopyOrder}
                className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95 whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Copiato!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copia Lista
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseView;

