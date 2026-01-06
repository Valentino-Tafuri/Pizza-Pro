import React from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { Preparation } from '../../types';

interface PreparationSettingsViewProps {
  preparations: Preparation[];
  onToggleActive: (id: string, isActive: boolean) => void;
}

const PreparationSettingsView: React.FC<PreparationSettingsViewProps> = ({
  preparations,
  onToggleActive
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-black mb-2">Preparazioni Magazzino</h2>
        <p className="text-gray-600 font-semibold">
          Attiva le preparazioni da gestire nel magazzino FIFO
        </p>
      </div>

      <div className="space-y-3">
        {preparations.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <p className="text-gray-400 font-semibold">
              Nessuna preparazione disponibile. Crea prima una preparazione in LabView.
            </p>
          </div>
        ) : (
          preparations.map(prep => (
            <div
              key={prep.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex-1">
                <h3 className="font-black text-lg text-black mb-1">{prep.name}</h3>
                <p className="text-sm text-gray-500 font-semibold">
                  {prep.category}
                  {prep.isActive && (
                    <span className="ml-2 text-green-600 font-black">• Attivo in magazzino</span>
                  )}
                </p>
                {prep.isActive && (
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="text-gray-400 font-semibold">
                      Stock: <span className="font-black text-black">{prep.currentStock}</span> {prep.unit}
                    </span>
                    <span className="text-gray-400 font-semibold">
                      Min: <span className="font-black text-black">{prep.minStock}</span> {prep.unit}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onToggleActive(prep.id, !prep.isActive)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all active:scale-95 ${
                  prep.isActive
                    ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {prep.isActive ? (
                  <>
                    <ToggleRight size={24} />
                    ATTIVO
                  </>
                ) : (
                  <>
                    <ToggleLeft size={24} />
                    DISATTIVO
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <p className="text-sm text-blue-800 font-semibold">
          💡 <strong>Attiva le preparazioni</strong> che vuoi gestire con il sistema FIFO.
          Solo le preparazioni attive saranno disponibili per etichette e magazzino.
        </p>
      </div>
    </div>
  );
};

export default PreparationSettingsView;

