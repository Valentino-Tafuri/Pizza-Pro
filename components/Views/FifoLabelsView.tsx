import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, Printer, Info, QrCode, Filter } from 'lucide-react';
import QRCode from 'qrcode';
import { Preparation, FifoLabel } from '../../types';

interface FifoLabelsViewProps {
  preparations: Preparation[];
  onGenerateLabels: (labels: FifoLabel[]) => Promise<void>;
  initialPreparationId?: string;
}

type FilterType = 'tutti' | 'impasti' | 'topping';

const FifoLabelsView: React.FC<FifoLabelsViewProps> = ({
  preparations,
  onGenerateLabels,
  initialPreparationId
}) => {
  const [filterType, setFilterType] = useState<FilterType>('tutti');
  const [selectedPrepId, setSelectedPrepId] = useState<string>(initialPreparationId || '');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [printCopies, setPrintCopies] = useState<number>(1); // Numero di copie da stampare
  const [generatedLabels, setGeneratedLabels] = useState<FifoLabel[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Per impasti: moltiplicatore farina e calcolo cassette
  const [flourMultiplier, setFlourMultiplier] = useState<number>(1);
  const PANETTI_PER_CASSETTA = 12;

  // Imposta data di default (oggi + 3 giorni) quando viene selezionata una preparazione
  useEffect(() => {
    if (selectedPrepId && !expiryDate) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      setExpiryDate(defaultDate.toISOString().split('T')[0]);
    }
  }, [selectedPrepId, expiryDate]);

  // Pre-seleziona la preparazione se viene passata initialPreparationId
  useEffect(() => {
    if (initialPreparationId && initialPreparationId !== selectedPrepId) {
      setSelectedPrepId(initialPreparationId);
    }
  }, [initialPreparationId]);

  // Debug: log delle preparazioni ricevute
  useEffect(() => {
    console.log('[FifoLabelsView] Preparazioni ricevute:', preparations);
    console.log('[FifoLabelsView] Numero preparazioni attive:', preparations.length);
    preparations.forEach(prep => {
      console.log(`[FifoLabelsView] - ${prep.name} (ID: ${prep.id}, Active: ${prep.isActive})`);
    });
  }, [preparations]);

  // Identifica se una preparazione è un impasto (ha advancedCalculatorData)
  const isImpasto = (prep: Preparation): boolean => {
    return !!prep.advancedCalculatorData;
  };

  // Filtra preparazioni per tipo
  const filteredPreparations = useMemo(() => {
    return preparations.filter(prep => {
      if (filterType === 'tutti') return true;
      if (filterType === 'impasti') return isImpasto(prep);
      if (filterType === 'topping') return !isImpasto(prep);
      return true;
    });
  }, [preparations, filterType]);

  const selectedPrep = useMemo(() => {
    return preparations.find(p => p.id === selectedPrepId);
  }, [preparations, selectedPrepId]);

  // Calcoli per impasti
  const impastoCalculations = useMemo(() => {
    if (!selectedPrep || !isImpasto(selectedPrep)) return null;

    const advData = selectedPrep.advancedCalculatorData;
    const portionWeight = selectedPrep.portionWeight || 270; // Default 270g
    const baseWeight = advData?.calculation?.totalWeight || 0; // Peso per 1kg farina

    // Peso totale impasto = peso base * moltiplicatore
    const totalDoughWeight = baseWeight * flourMultiplier;

    // Numero panetti = peso totale / peso porzione
    const totalPanetti = Math.floor(totalDoughWeight / portionWeight);

    // Numero cassette = panetti / 12 (arrotondato per eccesso)
    const numCassette = Math.ceil(totalPanetti / PANETTI_PER_CASSETTA);

    // Panetti per cassetta (distribuzione)
    const cassetteDistribution: number[] = [];
    let panettiRimanenti = totalPanetti;
    for (let i = 0; i < numCassette; i++) {
      const panettiInCassetta = Math.min(PANETTI_PER_CASSETTA, panettiRimanenti);
      cassetteDistribution.push(panettiInCassetta);
      panettiRimanenti -= panettiInCassetta;
    }

    return {
      portionWeight,
      baseWeight,
      totalDoughWeight,
      totalPanetti,
      numCassette,
      cassetteDistribution
    };
  }, [selectedPrep, flourMultiplier]);

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
      console.log('[FifoLabelsView] Inizio generazione etichetta singola:', {
        preparation: selectedPrep.name,
        preparationId: selectedPrep.id,
        expiryDate
      });

      // Genera UNA SOLA etichetta
      const timestamp = Date.now();
      const labelId = `${selectedPrep.id}_${timestamp}_0`;
      const qrData = `FIFO:${labelId}`;

      const qrCodeImage = await generateQRCode(qrData);

      if (!qrCodeImage) {
        throw new Error('Errore generazione QR code');
      }

      const barcode = extractBarcode(labelId);

      // Per impasti, aggiungi info cassetta (solo per la prima cassetta)
      let prepName = selectedPrep.name;
      let cassetteInfo: string | undefined;
      const isImpastoPrep = isImpasto(selectedPrep);
      if (isImpastoPrep && impastoCalculations) {
        const panettiInCassetta = impastoCalculations.cassetteDistribution[0] || 0;
        cassetteInfo = `Cassetta 1/${impastoCalculations.numCassette} - ${panettiInCassetta} pz`;
      }

      const label: FifoLabel = {
        id: labelId,
        preparationId: selectedPrep.id,
        preparationName: prepName,
        qrCode: qrCodeImage,
        barcode: barcode,
        expiryDate: new Date(expiryDate),
        createdAt: new Date(),
        createdBy: '', // Sarà popolato in App.tsx
        status: 'active',
        // Campo extra per info cassetta (opzionale)
        ...(cassetteInfo && { cassetteInfo })
      };

      // Salva solo questa etichetta (per il database)
      await onGenerateLabels([label]);

      console.log('[FifoLabelsView] Etichetta generata con successo');
      setGeneratedLabels([label]);
      setShowPrintPreview(true);

      alert(`Etichetta generata con successo!\n\nPuoi ora stamparla cliccando sul pulsante "Stampa".\n\nImposta il numero di copie da stampare (${printCopies} copia/e).`);
    } catch (error) {
      console.error('[FifoLabelsView] Errore generazione etichetta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      alert(`Errore durante la generazione dell'etichetta:\n${errorMessage}\n\nControlla la console per maggiori dettagli.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    // Per stampanti termiche: stampa una singola etichetta per volta
    // Il CSS mostrerà solo una etichetta per pagina
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Form Generazione */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-black text-black mb-6">Genera Etichette FIFO</h3>

        <div className="space-y-4">
          {/* Filtro Tipo */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter size={14} className="inline mr-1" />
              Filtra per Tipo
            </label>
            <div className="flex gap-2">
              {[
                { value: 'tutti', label: 'Tutti' },
                { value: 'impasti', label: 'Impasti' },
                { value: 'topping', label: 'Topping' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilterType(option.value as FilterType);
                    setSelectedPrepId(''); // Reset selezione
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                    filterType === option.value
                      ? 'bg-black text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selezione Preparazione */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Preparazione
            </label>
            <select
              value={selectedPrepId}
              onChange={(e) => {
                setSelectedPrepId(e.target.value);
                setFlourMultiplier(1); // Reset moltiplicatore
              }}
              className="w-full bg-white border border-gray-200 rounded-xl py-4 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Seleziona preparazione...</option>
              {filteredPreparations.length === 0 ? (
                <option value="" disabled>
                  {filterType === 'impasti'
                    ? 'Nessun impasto con FIFO attivo'
                    : filterType === 'topping'
                    ? 'Nessun topping con FIFO attivo'
                    : 'Nessuna preparazione attiva'}
                </option>
              ) : (
                filteredPreparations.map(prep => (
                  <option key={prep.id} value={prep.id}>
                    {isImpasto(prep) ? '🍕 ' : '🥫 '}
                    {prep.name} (Stock: {prep.currentStock} {prep.unit})
                  </option>
                ))
              )}
            </select>
            {filteredPreparations.length === 0 && (
              <p className="text-xs font-semibold text-gray-500 mt-2">
                Attiva "Crea Etichetta FIFO" su una preparazione in LabView per vederla qui.
              </p>
            )}
          </div>

          {/* Moltiplicatore Farina - Solo per Impasti */}
          {selectedPrep && isImpasto(selectedPrep) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <label className="block text-sm font-bold text-amber-800 mb-2">
                Quantità Farina Impastata (kg)
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setFlourMultiplier(Math.max(0.5, flourMultiplier - 0.5))}
                  className="w-12 h-12 bg-amber-100 hover:bg-amber-200 rounded-xl flex items-center justify-center transition-all active:scale-95"
                >
                  <Minus size={20} />
                </button>
                <input
                  type="number"
                  min={0.5}
                  max={50}
                  step={0.5}
                  value={flourMultiplier}
                  onChange={(e) => setFlourMultiplier(Math.max(0.5, parseFloat(e.target.value) || 1))}
                  className="w-24 text-center bg-white border border-amber-300 rounded-xl py-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={() => setFlourMultiplier(Math.min(50, flourMultiplier + 0.5))}
                  className="w-12 h-12 bg-amber-100 hover:bg-amber-200 rounded-xl flex items-center justify-center transition-all active:scale-95"
                >
                  <Plus size={20} />
                </button>
                <span className="text-sm font-bold text-amber-700">kg</span>
              </div>

              {/* Riepilogo Calcoli Impasto */}
              {impastoCalculations && (
                <div className="mt-4 pt-4 border-t border-amber-200 space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 font-semibold">Peso Impasto Totale</p>
                      <p className="text-lg font-black text-gray-900">
                        {(impastoCalculations.totalDoughWeight / 1000).toFixed(2)} kg
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 font-semibold">Peso Panetto</p>
                      <p className="text-lg font-black text-gray-900">
                        {impastoCalculations.portionWeight} g
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 font-semibold">Panetti Totali</p>
                      <p className="text-lg font-black text-blue-600">
                        {impastoCalculations.totalPanetti} pz
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 font-semibold">Cassette (12 pz)</p>
                      <p className="text-lg font-black text-green-600">
                        {impastoCalculations.numCassette} 📦
                      </p>
                    </div>
                  </div>

                  {/* Distribuzione cassette */}
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 font-semibold mb-2">Distribuzione Cassette</p>
                    <div className="flex flex-wrap gap-2">
                      {impastoCalculations.cassetteDistribution.map((panetti, idx) => (
                        <div
                          key={idx}
                          className={`px-3 py-2 rounded-lg text-sm font-black ${
                            panetti === PANETTI_PER_CASSETTA
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          Cassetta {idx + 1}: {panetti} pz
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* Quantità Stock - Solo per Topping (gli impasti usano calcolo cassette) */}
          {selectedPrep && !isImpasto(selectedPrep) && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Quantità Stock
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
              <p className="text-xs font-semibold text-gray-500 mt-2">
                Stock verrà incrementato di {quantity} {selectedPrep.unit}
              </p>
            </div>
          )}

          {/* Numero Copie da Stampare - Per tutti i tipi */}
          {generatedLabels.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <label className="block text-sm font-bold text-purple-800 mb-2">
                Numero Copie da Stampare
              </label>
              <p className="text-xs text-purple-600 mb-3 font-semibold">
                Per stampanti termiche: stampa una etichetta per volta. Imposta quante copie vuoi stampare.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                  className="w-12 h-12 bg-purple-100 hover:bg-purple-200 rounded-xl flex items-center justify-center transition-all active:scale-95"
                >
                  <Minus size={20} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={printCopies}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setPrintCopies(Math.min(100, Math.max(1, val)));
                  }}
                  className="w-24 text-center bg-white border border-purple-300 rounded-xl py-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => setPrintCopies(Math.min(100, printCopies + 1))}
                  className="w-12 h-12 bg-purple-100 hover:bg-purple-200 rounded-xl flex items-center justify-center transition-all active:scale-95"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Pulsante Genera */}
          <div className="space-y-2">
            <button
              onClick={handleGenerate}
              disabled={!selectedPrep || !expiryDate || isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl py-4 px-6 text-sm font-black uppercase transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isGenerating ? 'Generazione in corso...' : 'Genera Etichetta'}
            </button>
            {(!selectedPrep || !expiryDate) && (
              <p className="text-xs font-semibold text-red-600 text-center">
                {!selectedPrep && 'Seleziona una preparazione'}
                {selectedPrep && !expiryDate && 'Inserisci la data di scadenza'}
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
              Etichetta Generata
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
                Stampa {printCopies} {printCopies === 1 ? 'Copia' : 'Copie'}
              </button>
            </div>
          </div>

          {/* Print Area - Mostra una singola etichetta, ripetuta N volte per la stampa */}
          <div className="print-area">
            {/* Anteprima schermo: mostra una sola etichetta */}
            <div className="screen-preview mb-6">
              <div
                className="label-print border-2 border-black p-4 rounded-xl mx-auto"
                style={{ width: '80mm', height: '40mm' }}
              >
                {generatedLabels[0] && (
                  <div className="flex gap-3 h-full">
                    {/* QR Code */}
                    <div className="flex-shrink-0">
                      <img
                        src={generatedLabels[0].qrCode}
                        alt="QR Code"
                        className="w-24 h-24"
                      />
                    </div>
                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between text-xs">
                      <div>
                        <h4 className="font-black text-black mb-1 text-[10px] uppercase">
                          {generatedLabels[0].preparationName}
                        </h4>
                        {/* Info Cassetta per Impasti */}
                        {generatedLabels[0].cassetteInfo && (
                          <div className="bg-amber-100 border border-amber-300 rounded px-2 py-0.5 mb-1">
                            <p className="text-[9px] font-black text-amber-800">
                              {generatedLabels[0].cassetteInfo}
                            </p>
                          </div>
                        )}
                        <p className="text-[8px] text-gray-600 mb-1">
                          Creato: {(generatedLabels[0].createdAt?.toDate?.() || new Date(generatedLabels[0].createdAt)).toLocaleDateString('it-IT')}
                        </p>
                        <div className="bg-red-100 border border-red-300 rounded px-2 py-1 mb-1">
                          <p className="text-[8px] font-black text-red-700">
                            SCADENZA: {(generatedLabels[0].expiryDate?.toDate?.() || new Date(generatedLabels[0].expiryDate)).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <p className="text-[7px] text-gray-400">
                          ID: {generatedLabels[0].id.slice(-12)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Area stampa: ripete l'etichetta N volte, una per pagina */}
            <div className="print-labels" style={{ display: 'none' }}>
              {Array.from({ length: printCopies }).map((_, index) => (
                <div
                  key={index}
                  className="label-print-single print:page-break-after-always"
                  style={{ width: '80mm', height: '40mm' }}
                >
                  {generatedLabels[0] && (
                    <div className="flex gap-3 h-full p-2">
                      {/* QR Code */}
                      <div className="flex-shrink-0">
                        <img
                          src={generatedLabels[0].qrCode}
                          alt="QR Code"
                          className="w-24 h-24"
                        />
                      </div>
                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between text-xs">
                        <div>
                          <h4 className="font-black text-black mb-1 text-[10px] uppercase">
                            {generatedLabels[0].preparationName}
                          </h4>
                          {/* Info Cassetta per Impasti */}
                          {generatedLabels[0].cassetteInfo && (
                            <div className="bg-amber-100 border border-amber-300 rounded px-2 py-0.5 mb-1">
                              <p className="text-[9px] font-black text-amber-800">
                                {generatedLabels[0].cassetteInfo}
                              </p>
                            </div>
                          )}
                          <p className="text-[8px] text-gray-600 mb-1">
                            Creato: {(generatedLabels[0].createdAt?.toDate?.() || new Date(generatedLabels[0].createdAt)).toLocaleDateString('it-IT')}
                          </p>
                          <div className="bg-red-100 border border-red-300 rounded px-2 py-1 mb-1">
                            <p className="text-[8px] font-black text-red-700">
                              SCADENZA: {(generatedLabels[0].expiryDate?.toDate?.() || new Date(generatedLabels[0].expiryDate)).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          <p className="text-[7px] text-gray-400">
                            ID: {generatedLabels[0].id.slice(-12)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
          /* Nascondi anteprima schermo durante la stampa */
          .screen-preview {
            display: none !important;
          }
          /* Mostra solo le etichette da stampare */
          .print-labels {
            display: block !important;
          }
          .label-print-single {
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            width: 80mm !important;
            height: 40mm !important;
            box-sizing: border-box;
            border: 2px solid black;
            margin: 0;
            padding: 2mm;
          }
          /* Ultima etichetta non deve avere page-break */
          .label-print-single:last-child {
            page-break-after: auto;
          }
          @page {
            size: 80mm 40mm;
            margin: 0;
          }
        }
        @media screen {
          .label-print {
            min-width: 80mm;
            min-height: 40mm;
          }
          .print-labels {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default FifoLabelsView;

