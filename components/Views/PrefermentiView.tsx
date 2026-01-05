import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Beaker, Thermometer, Clock, Edit2, Trash2 } from 'lucide-react';
import { normalizeText } from '../../utils/textUtils';

export interface Preferment {
  id: string;
  name: string;
  type: 'biga' | 'poolish';
  yeastPercentage: number; // Percentuale lievito
  saltPercentage: number; // Percentuale sale
  waterPercentage: number; // Percentuale acqua (idratazione)
  finalTemperature: number; // Temperatura finale (°C)
  procedure: string; // Procedimento
  storageTemperature: number; // Temperatura conservazione (°C)
  storageTime: number; // Tempo di conservazione (ore)
}

interface PrefermentiViewProps {
  preferments: Preferment[];
  onSave: (pref: Preferment) => Promise<string | undefined>;
  onDelete?: (id: string) => Promise<void>;
}

const PrefermentiView: React.FC<PrefermentiViewProps> = ({ preferments, onSave, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Preferment>>({
    name: '',
    type: 'biga',
    yeastPercentage: 0.1,
    saltPercentage: 0,
    waterPercentage: 50,
    finalTemperature: 20,
    procedure: '',
    storageTemperature: 4,
    storageTime: 24
  });

  const handleOpenEdit = (pref: Preferment) => {
    setForm(pref);
    setEditingId(pref.id);
    setIsAdding(true);
  };

  const handleClose = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({
      name: '',
      type: 'biga',
      yeastPercentage: 0.1,
      saltPercentage: 0,
      waterPercentage: 50,
      finalTemperature: 20,
      procedure: '',
      storageTemperature: 4,
      storageTime: 24
    });
  };

  const handleSave = async () => {
    console.log('handleSave chiamato, form:', form);
    if (!form.name || !form.type) {
      alert('Compila tutti i campi obbligatori');
      return;
    }
    if (!onSave) {
      console.error('onSave non è definito!');
      alert('Errore: funzione di salvataggio non disponibile');
      return;
    }
    const preferment: Preferment = {
      id: editingId || '', // Lascia che Firebase generi l'ID per i nuovi prefermenti
      name: form.name.trim(),
      type: form.type,
      yeastPercentage: form.yeastPercentage || 0.1,
      saltPercentage: form.saltPercentage || 0,
      waterPercentage: form.waterPercentage || 50,
      finalTemperature: form.finalTemperature || 20,
      procedure: form.procedure || '',
      storageTemperature: form.storageTemperature || 4,
      storageTime: form.storageTime || 24
    };
    try {
      console.log('Salvataggio prefermento:', preferment);
      console.log('onSave funzione:', onSave);
      const result = await onSave(preferment);
      console.log('Risultato salvataggio:', result);
      if (result) {
        handleClose();
      } else {
        console.error('Salvataggio fallito: risultato undefined');
        alert('Errore: il prefermento non è stato salvato. Controlla la console per i dettagli.');
      }
    } catch (error) {
      console.error('Errore nel salvataggio del prefermento:', error);
      alert(`Errore nel salvataggio: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  };

  // Debug: log prefermenti ricevuti
  useEffect(() => {
    console.log('[PrefermentiView] Prefermenti ricevuti:', preferments);
    console.log('[PrefermentiView] onSave disponibile:', !!onSave);
  }, [preferments, onSave]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Prefermenti Configurati</h3>
          <p className="text-xs text-gray-400 mt-1">Totale: {preferments.length}</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)} 
          className="bg-black text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center space-x-2"
        >
          <Plus size={16} /> <span>Crea un Prefermento</span>
        </button>
      </div>

      {/* Lista Prefermenti */}
      {preferments.length > 0 && (
        <div className="mb-4 text-xs text-gray-400 font-bold">
          Totale prefermenti: {preferments.length}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {preferments.map((pref) => (
          <div key={pref.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-black text-black mb-1">{pref.name}</h4>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {pref.type === 'biga' ? 'Biga' : 'Poolish'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEdit(pref)}
                  className="text-gray-300 hover:text-black transition-colors p-2 bg-gray-50 rounded-xl hover:bg-gray-100"
                  title="Modifica"
                >
                  <Edit2 size={18} />
                </button>
                {onDelete && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Sei sicuro di voler eliminare "${pref.name}"?`)) {
                        onDelete(pref.id);
                      }
                    }}
                    className="text-red-200 hover:text-red-500 transition-colors p-2 bg-red-50 rounded-xl hover:bg-red-100"
                    title="Elimina"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Lievito</span>
                <span className="font-black text-black">{pref.yeastPercentage}%</span>
              </div>
              {pref.saltPercentage > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Sale</span>
                  <span className="font-black text-black">{pref.saltPercentage}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Idratazione</span>
                <span className="font-black text-black">{pref.waterPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">T° Finale</span>
                <span className="font-black text-black">{pref.finalTemperature}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Conservazione</span>
                <span className="font-black text-black">{pref.storageTemperature}°C / {pref.storageTime}h</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {preferments.length === 0 && !isAdding && (
        <div className="bg-gray-50 rounded-3xl p-12 text-center">
          <Beaker className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-400 font-bold">Nessun prefermento configurato</p>
          <p className="text-xs text-gray-300 mt-2">Crea il tuo primo prefermento per iniziare</p>
        </div>
      )}

      {/* Form Creazione/Modifica */}
      {isAdding && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[95vh] pb-12 scrollbar-hide relative">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
            
            <header className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black">
                {editingId ? 'Modifica Prefermento' : 'Crea un Prefermento'}
              </h3>
              <button onClick={handleClose} className="bg-gray-100 p-2 rounded-full">
                <X size={20}/>
              </button>
            </header>

            <div className="space-y-6">
              {/* Nome e Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome Prefermento</label>
                  <input
                    type="text"
                    placeholder="Es: Biga Classica"
                    className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold"
                    value={form.name || ''}
                    onChange={e => setForm({...form, name: e.target.value})}
                    onBlur={e => setForm({...form, name: normalizeText(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Tipo</label>
                  <select
                    className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold"
                    value={form.type || 'biga'}
                    onChange={e => setForm({...form, type: e.target.value as 'biga' | 'poolish'})}
                  >
                    <option value="biga">Biga</option>
                    <option value="poolish">Poolish</option>
                  </select>
                </div>
              </div>

              {/* Percentuale Lievito */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-black text-black">Percentuale Lievito</label>
                  <span className="text-sm font-black text-black">{form.yeastPercentage?.toFixed(2) || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={form.yeastPercentage || 0.1}
                  onChange={e => setForm({...form, yeastPercentage: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-orange-500"
                />
                <div className="flex justify-between mt-2 text-xs text-gray-400 font-bold">
                  <span>0%</span>
                  <span>2%</span>
                </div>
              </div>

              {/* Percentuale Sale */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-black text-black">Percentuale Sale</label>
                  <span className="text-sm font-black text-black">{form.saltPercentage?.toFixed(2) || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={form.saltPercentage || 0}
                  onChange={e => setForm({...form, saltPercentage: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-blue-500"
                />
                <div className="flex justify-between mt-2 text-xs text-gray-400 font-bold">
                  <span>0%</span>
                  <span>2%</span>
                </div>
              </div>

              {/* Percentuale Acqua (Idratazione) */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-black text-black">Percentuale Acqua (Idratazione)</label>
                  <span className="text-sm font-black text-black">{form.waterPercentage || 50}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="1"
                  value={form.waterPercentage || 50}
                  onChange={e => setForm({...form, waterPercentage: parseInt(e.target.value)})}
                  className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-red-500"
                />
                <div className="flex justify-between mt-2 text-xs text-gray-400 font-bold">
                  <span>40%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Temperatura Finale */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-black text-black flex items-center space-x-2">
                    <Thermometer size={18} />
                    <span>Temperatura Finale</span>
                  </label>
                  <span className="text-sm font-black text-black">{form.finalTemperature || 20}°C</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="30"
                  step="1"
                  value={form.finalTemperature || 20}
                  onChange={e => setForm({...form, finalTemperature: parseInt(e.target.value)})}
                  className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-green-500"
                />
                <div className="flex justify-between mt-2 text-xs text-gray-400 font-bold">
                  <span>15°C</span>
                  <span>30°C</span>
                </div>
              </div>

              {/* Procedimento */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Procedimento</label>
                <textarea
                  placeholder="Descrivi il procedimento per la preparazione del prefermento..."
                  className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold min-h-[120px] resize-none"
                  value={form.procedure || ''}
                  onChange={e => setForm({...form, procedure: e.target.value})}
                />
              </div>

              {/* Temperatura Conservazione */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-black text-black flex items-center space-x-2">
                    <Thermometer size={18} />
                    <span>Temperatura Conservazione</span>
                  </label>
                  <span className="text-sm font-black text-black">{form.storageTemperature || 4}°C</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={form.storageTemperature || 4}
                  onChange={e => setForm({...form, storageTemperature: parseInt(e.target.value)})}
                  className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-purple-500"
                />
                <div className="flex justify-between mt-2 text-xs text-gray-400 font-bold">
                  <span>0°C</span>
                  <span>25°C</span>
                </div>
              </div>

              {/* Tempo di Conservazione */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-black text-black flex items-center space-x-2">
                    <Clock size={18} />
                    <span>Tempo di Conservazione</span>
                  </label>
                  <span className="text-sm font-black text-black">{form.storageTime || 24}h</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="72"
                  step="1"
                  value={form.storageTime || 24}
                  onChange={e => setForm({...form, storageTime: parseInt(e.target.value)})}
                  className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-indigo-500"
                />
                <div className="flex justify-between mt-2 text-xs text-gray-400 font-bold">
                  <span>6h</span>
                  <span>72h</span>
                </div>
              </div>

              {/* Pulsanti */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-sm"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                >
                  {editingId ? 'Salva Modifiche' : 'Crea Prefermento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrefermentiView;

