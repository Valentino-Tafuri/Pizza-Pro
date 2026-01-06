import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Preparation, FifoLabel } from '../../types';
import FifoLabelsView from './FifoLabelsView';

interface PreparationSettingsViewProps {
  preparations: Preparation[];
  onGenerateLabels: (labels: FifoLabel[]) => Promise<void>;
}

const PreparationSettingsView: React.FC<PreparationSettingsViewProps> = ({
  preparations,
  onGenerateLabels
}) => {
  const [selectedPrepId, setSelectedPrepId] = useState<string | null>(null);

  // Filtra solo le preparazioni con fifoLabel: true (sono automaticamente attive)
  const fifoPreparations = preparations.filter(prep => prep.fifoLabel === true);

  // Tutte le preparazioni con fifoLabel sono automaticamente attive
  const activeFifoPreparations = fifoPreparations;

  const handlePrepClick = (prepId: string) => {
    setSelectedPrepId(prepId);
  };

  const handleClosePopup = () => {
    setSelectedPrepId(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-black mb-2">Preparazioni Magazzino</h2>
          <p className="text-gray-600 font-semibold">
            Preparazioni con etichetta FIFO attiva
          </p>
        </div>

        <div className="space-y-3">
          {fifoPreparations.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <p className="text-gray-400 font-semibold">
                Nessuna preparazione con etichetta FIFO. Attiva "Crea Etichetta FIFO" in LabView.
              </p>
            </div>
          ) : (
            fifoPreparations.map(prep => (
              <div
                key={prep.id}
                onClick={() => handlePrepClick(prep.id)}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex-1">
                  <h3 className="font-black text-lg text-black mb-1">{prep.name}</h3>
                  <p className="text-sm text-gray-500 font-semibold">
                    {prep.category}
                    <span className="ml-2 text-green-600 font-black">• Attivo in magazzino</span>
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="text-gray-400 font-semibold">
                      Stock: <span className="font-black text-black">{prep.currentStock}</span> {prep.unit}
                    </span>
                    <span className="text-gray-400 font-semibold">
                      Min: <span className="font-black text-black">{prep.minStock}</span> {prep.unit}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <p className="text-sm text-blue-800 font-semibold">
            💡 <strong>Clicca su una preparazione</strong> per generare le etichette FIFO.
            Attiva "Crea Etichetta FIFO" in LabView per vedere le preparazioni qui.
          </p>
        </div>
      </div>

      {/* Popup con FifoLabelsView */}
      {selectedPrepId && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-2xl font-black text-black">Genera Etichette FIFO</h3>
              <button
                onClick={handleClosePopup}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <FifoLabelsView
                preparations={activeFifoPreparations}
                onGenerateLabels={async (labels) => {
                  await onGenerateLabels(labels);
                  // Non chiudere il popup automaticamente per permettere la stampa
                }}
                initialPreparationId={selectedPrepId}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PreparationSettingsView;

