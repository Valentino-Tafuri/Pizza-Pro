import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, Printer, Info, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { Preparation, FifoLabel } from '../../types';

interface FifoLabelsViewProps {
  preparations: Preparation[];
  onGenerateLabels: (labels: FifoLabel[]) => Promise<void>;
}

const FifoLabelsView: React.FC<FifoLabelsViewProps> = ({ preparations, onGenerateLabels }) => {
  const [selectedPrepId, setSelectedPrepId] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [generatedLabels, setGeneratedLabels] = useState<FifoLabel[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Imposta data di default (oggi + 3 giorni) quando viene selezionata una preparazione
  useEffect(() => {
    if (selectedPrepId && !expiryDate) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      setExpiryDate(defaultDate.toISOString().split('T')[0]);
    }
  }, [selectedPrepId]);

  // Debug: log delle preparazioni ricevute
  useEffect(() => {
    console.log('[FifoLabelsView] Preparazioni ricevute:', preparations);
    console.log('[FifoLabelsView] Numero preparazioni attive:', preparations.length);
    preparations.forEach(prep => {
      console.log(`[FifoLabelsView] - ${prep.name} (ID: ${prep.id}, Active: ${prep.isActive})`);
    });
  }, [preparations]);

  const selectedPrep = useMemo(() => {
    return preparations.find(p => p.id === selectedPrepId);
  }, [preparations, selectedPrepId]);

  const minDate = new Date().toISOString().split('T')[0];

  const generateQRCode = async (data: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(data, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
    } catch (error) {
      console.error('Errore generazione QR:', error);
      return '';
    }
  };

  const extractBarcode = (labelId: string): string => {
    // Estrai solo numeri da labelId, max 13 digit (EAN-13 compatible)
    const numbers = labelId.replace(/\D/g, '');
    return numbers.slice(0, 13).padStart(13, '0');
  };

  const handleGenerate = async () => {
    if (!selectedPrep || !expiryDate) {
      alert('Seleziona una preparazione e una data di scadenza');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('[FifoLabelsView] Inizio generazione etichette:', {
        preparation: selectedPrep.name,
        preparationId: selectedPrep.id,
        quantity,
        expiryDate
      });

      const labels: FifoLabel[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < quantity; i++) {
        const labelId = `${selectedPrep.id}_${timestamp}_${i}`;
        const qrData = `FIFO:${labelId}`;
        
        console.log(`[FifoLabelsView] Generazione etichetta ${i + 1}/${quantity}:`, labelId);
        
        const qrCodeImage = await generateQRCode(qrData);
        
        if (!qrCodeImage) {
          throw new Error(`Errore generazione QR code per etichetta ${i + 1}`);
        }
        
        const barcode = extractBarcode(labelId);

        const label: FifoLabel = {
          id: labelId,
          preparationId: selectedPrep.id,
          preparationName: selectedPrep.name,
          qrCode: qrCodeImage,
          barcode: barcode,
          expiryDate: new Date(expiryDate),
          createdAt: new Date(),
          createdBy: '', // Sarà popolato in App.tsx
          status: 'active'
        };

        labels.push(label);
        console.log(`[FifoLabelsView] Etichetta ${i + 1} creata:`, {
          id: label.id,
          name: label.preparationName,
          qrCodeLength: label.qrCode.length
        });
      }

      console.log('[FifoLabelsView] Tutte le etichette generate, salvataggio...', labels.length);
      await onGenerateLabels(labels);
      
      console.log('[FifoLabelsView] Etichette salvate con successo');
      setGeneratedLabels(labels);
      setShowPrintPreview(true);
      
      alert(`✅ ${quantity} etichetta${quantity > 1 ? 'e' : ''} generate con successo!\n\nPuoi ora stamparle cliccando sul pulsante "Stampa".`);
    } catch (error) {
      console.error('[FifoLabelsView] Errore generazione etichette:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      alert(`❌ Errore durante la generazione delle etichette:\n${errorMessage}\n\nControlla la console per maggiori dettagli.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Form Generazione */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-black text-black mb-6">Genera Etichette FIFO</h3>
        
        <div className="space-y-4">
          {/* Selezione Preparazione */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Preparazione
            </label>
            <select
              value={selectedPrepId}
              onChange={(e) => setSelectedPrepId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl py-4 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Seleziona preparazione...</option>
              {preparations.length === 0 ? (
                <option value="" disabled>Nessuna preparazione attiva. Attiva "Crea Etichetta FIFO" in LabView.</option>
              ) : (
                preparations.map(prep => (
                  <option key={prep.id} value={prep.id}>
                    {prep.name} (Stock: {prep.currentStock} {prep.unit})
                  </option>
                ))
              )}
            </select>
            {preparations.length === 0 && (
              <p className="text-xs font-semibold text-gray-500 mt-2">
                💡 Attiva "Crea Etichetta FIFO" su una preparazione in LabView per vederla qui.
              </p>
            )}
          </div>

          {/* Data Scadenza */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Data Scadenza
            </label>
            <input
              type="date"
              value={expiryDate}
              min={minDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl py-4 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Quantità */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Quantità Etichette
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all active:scale-95"
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(50, Math.max(1, val)));
                }}
                className="w-24 text-center bg-white border border-gray-200 rounded-xl py-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                onClick={() => setQuantity(Math.min(50, quantity + 1))}
                className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>
            {selectedPrep && (
              <p className="text-xs font-semibold text-gray-500 mt-2">
                Stock verrà incrementato di {quantity} {selectedPrep.unit}
              </p>
            )}
          </div>

          {/* Pulsante Genera */}
          <div className="space-y-2">
            <button
              onClick={handleGenerate}
              disabled={!selectedPrep || !expiryDate || isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl py-4 px-6 text-sm font-black uppercase transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isGenerating ? 'Generazione in corso...' : `Genera ${quantity} Etichetta${quantity > 1 ? 'e' : ''}`}
            </button>
            {(!selectedPrep || !expiryDate) && (
              <p className="text-xs font-semibold text-red-600 text-center">
                {!selectedPrep && '⚠️ Seleziona una preparazione'}
                {selectedPrep && !expiryDate && '⚠️ Inserisci la data di scadenza'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="text-sm font-black text-blue-900 mb-2">Istruzioni</h4>
            <ul className="text-xs font-semibold text-blue-800 space-y-1 list-disc list-inside">
              <li>Seleziona la preparazione e la data di scadenza</li>
              <li>Genera le etichette necessarie (max 50 per volta)</li>
              <li>Stampa le etichette e applicale ai contenitori</li>
              <li>Scansiona il QR code per scaricare il prodotto</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Anteprima Etichette Generate */}
      {generatedLabels.length > 0 && showPrintPreview && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-black">
              Etichette Generate ({generatedLabels.length})
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95"
              >
                Chiudi
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95"
              >
                <Printer size={18} />
                Stampa
              </button>
            </div>
          </div>

          {/* Print Area */}
          <div className="print-area">
            <div className="grid grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
              {generatedLabels.map((label) => (
                <div
                  key={label.id}
                  className="label-print border-2 border-black p-4 rounded-xl print:border-2 print:border-black print:p-2 print:rounded-none"
                  style={{ width: '80mm', height: '40mm' }}
                >
                  <div className="flex gap-3 h-full">
                    {/* QR Code */}
                    <div className="flex-shrink-0">
                      <img
                        src={label.qrCode}
                        alt="QR Code"
                        className="w-24 h-24 print:w-30 print:h-30"
                      />
                    </div>
                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between text-xs">
                      <div>
                        <h4 className="font-black text-black mb-1 text-[10px] uppercase">
                          {label.preparationName}
                        </h4>
                        <p className="text-[8px] text-gray-600 mb-1">
                          Creato: {(label.createdAt?.toDate?.() || new Date(label.createdAt)).toLocaleDateString('it-IT')}
                        </p>
                        <div className="bg-red-100 border border-red-300 rounded px-2 py-1 mb-1">
                          <p className="text-[8px] font-black text-red-700">
                            SCADENZA: {(label.expiryDate?.toDate?.() || new Date(label.expiryDate)).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <p className="text-[7px] text-gray-400">
                          ID: {label.id.slice(-12)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .label-print {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 2mm;
            width: 80mm !important;
            height: 40mm !important;
            box-sizing: border-box;
          }
          .print-area .grid {
            display: grid;
            grid-template-columns: repeat(2, 80mm);
            gap: 2mm;
            justify-content: start;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
        @media screen {
          .label-print {
            min-width: 80mm;
            min-height: 40mm;
          }
        }
      `}</style>
    </div>
  );
};

export default FifoLabelsView;

