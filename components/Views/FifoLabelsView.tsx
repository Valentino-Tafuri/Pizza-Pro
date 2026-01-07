import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, Printer, Info, QrCode, Filter } from 'lucide-react';
import QRCode from 'qrcode';
import { Preparation, FifoLabel } from '../../types';

interface FifoLabelsViewProps {
  preparations: Preparation[];
  onGenerateLabels: (labels: FifoLabel[], stockQuantity: number) => Promise<void>;
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
  const [generatedLabels, setGeneratedLabels] = useState<FifoLabel[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [labelCount, setLabelCount] = useState<number>(0); // Conteggio etichette necessarie

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

  // Calcola automaticamente il numero di etichette necessarie
  useEffect(() => {
    if (selectedPrep) {
      if (isImpasto(selectedPrep) && impastoCalculations) {
        // Per impasti: una etichetta per cassetta
        setLabelCount(impastoCalculations.numCassette);
      } else {
        // Per topping: una etichetta per quantità
        setLabelCount(quantity);
      }
    } else {
      setLabelCount(0);
    }
  }, [selectedPrep, impastoCalculations, quantity]);

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

    // Previeni doppia generazione
    if (isGenerating) {
      console.warn('[FifoLabelsView] Generazione già in corso, ignoro richiesta');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('[FifoLabelsView] Inizio generazione etichetta singola:', {
        preparation: selectedPrep.name,
        preparationId: selectedPrep.id,
        expiryDate
      });

      // Genera UNA SOLA etichetta con ID univoco
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 6); // Aggiungi random per evitare duplicati
      const labelId = `${selectedPrep.id}_${timestamp}_${randomSuffix}`;
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

      // Salva SOLO UNA etichetta nel database, ma passa la quantità di stock corretta
      console.log('[FifoLabelsView] Salvataggio etichetta nel database:', labelId, '- Stock da aggiungere:', labelCount);
      await onGenerateLabels([label], labelCount);

      console.log('[FifoLabelsView] Etichetta generata e salvata con successo');
      setGeneratedLabels([label]); // Solo una etichetta nello stato
      setShowPrintPreview(true);

      alert(`✅ Etichetta generata con successo!\n\n📋 Etichette necessarie: ${labelCount}\n\nClicca "Stampa" per aprire la finestra di stampa.\nImposta il numero di copie nelle impostazioni di stampa del sistema.`);
    } catch (error) {
      console.error('[FifoLabelsView] Errore generazione etichetta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      alert(`❌ Errore durante la generazione dell'etichetta:\n${errorMessage}\n\nControlla la console per maggiori dettagli.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (generatedLabels.length === 0) {
      alert('Nessuna etichetta da stampare. Genera prima un\'etichetta.');
      return;
    }

    console.log('[FifoLabelsView] Stampa richiesta - Etichette necessarie:', labelCount);

    // Apri finestra di stampa con contenuto dinamico
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Impossibile aprire la finestra di stampa. Controlla i popup blocker.');
      return;
    }

    const labelToPrint = generatedLabels[0]; // Prendi l'unica etichetta
    const createdAt = labelToPrint.createdAt?.toDate?.() || new Date(labelToPrint.createdAt);
    const expiryDateLabel = labelToPrint.expiryDate?.toDate?.() || new Date(labelToPrint.expiryDate);

    // Genera HTML per etichette termiche 62mm x 40mm (Brother e compatibili)
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etichetta FIFO - ${labelToPrint.preparationName}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          @page {
            size: 62mm 40mm;
            margin: 0;
          }
          @media print {
            html, body {
              width: 62mm;
              height: 40mm;
              margin: 0;
              padding: 0;
            }
            .print-info {
              display: none !important;
            }
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .label-container {
            width: 62mm;
            height: 40mm;
            padding: 2mm;
            display: flex;
            flex-direction: row;
            gap: 2mm;
            background: white;
          }
          .qr-section {
            flex-shrink: 0;
            width: 32mm;
            height: 36mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .qr-code {
            width: 28mm;
            height: 28mm;
          }
          .qr-code img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .barcode-text {
            font-size: 6pt;
            font-family: monospace;
            text-align: center;
            margin-top: 1mm;
            letter-spacing: 0.5px;
          }
          .info-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 1mm 0;
            min-width: 0;
          }
          .prep-name {
            font-weight: bold;
            font-size: 9pt;
            text-transform: uppercase;
            line-height: 1.1;
            margin-bottom: 1mm;
            word-wrap: break-word;
            overflow: hidden;
          }
          .cassette-info {
            font-size: 7pt;
            font-weight: bold;
            padding: 1mm;
            border: 1px solid #000;
            margin-bottom: 1mm;
            text-align: center;
          }
          .date-row {
            font-size: 6pt;
            color: #444;
            margin-bottom: 1mm;
          }
          .expiry-box {
            border: 2px solid #000;
            padding: 1.5mm 2mm;
            text-align: center;
            margin-bottom: 1mm;
          }
          .expiry-label {
            font-size: 6pt;
            font-weight: bold;
          }
          .expiry-date {
            font-size: 11pt;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .label-id {
            font-size: 5pt;
            color: #666;
            font-family: monospace;
          }
          .print-info {
            margin-top: 10mm;
            padding: 4mm;
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 4px;
            font-size: 12px;
            color: #0369a1;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="qr-section">
            <div class="qr-code">
              <img src="${labelToPrint.qrCode}" alt="QR Code" />
            </div>
            <div class="barcode-text">${labelToPrint.barcode}</div>
          </div>
          <div class="info-section">
            <div>
              <div class="prep-name">${labelToPrint.preparationName}</div>
              ${labelToPrint.cassetteInfo ? `<div class="cassette-info">${labelToPrint.cassetteInfo}</div>` : ''}
              <div class="date-row">Prod: ${createdAt.toLocaleDateString('it-IT')}</div>
            </div>
            <div>
              <div class="expiry-box">
                <div class="expiry-label">SCADENZA</div>
                <div class="expiry-date">${expiryDateLabel.toLocaleDateString('it-IT')}</div>
              </div>
              <div class="label-id">ID: ${labelToPrint.id.slice(-8)}</div>
            </div>
          </div>
        </div>
        <div class="print-info">
          <strong>📋 Etichette necessarie: ${labelCount}</strong><br>
          Formato: 62mm x 40mm (Brother/stampanti termiche)<br>
          Imposta il numero di copie nelle impostazioni di stampa.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Attendi che il contenuto sia caricato prima di avviare la stampa
    setTimeout(() => {
      printWindow.print();
    }, 250);
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

          {/* Conteggio Etichette Necessarie - Mostra sempre quando c'è una selezione */}
          {selectedPrep && labelCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-green-800">
                    📋 Etichette Necessarie
                  </p>
                  <p className="text-xs text-green-600 font-semibold mt-1">
                    {isImpasto(selectedPrep)
                      ? `${labelCount} etichette (una per cassetta)`
                      : `${labelCount} etichette (una per unità)`
                    }
                  </p>
                </div>
                <div className="text-3xl font-black text-green-700">
                  {labelCount}
                </div>
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
              <li>Controlla il numero di etichette necessarie (calcolato automaticamente)</li>
              <li>Genera l'etichetta e clicca su "Stampa"</li>
              <li>Imposta il numero di copie nelle impostazioni di stampa del sistema</li>
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
                Stampa Etichetta
              </button>
            </div>
          </div>

          {/* Print Area - Anteprima formato 62x40mm */}
          <div className="print-area">
            {/* Anteprima schermo: formato 62mm x 40mm */}
            <div className="screen-preview mb-6 flex justify-center">
              <div
                className="label-preview bg-white border-2 border-gray-800 flex gap-2"
                style={{ width: '234px', height: '151px', padding: '8px' }} // 62mm x 40mm @ 96dpi ~= 234x151px
              >
                {generatedLabels[0] && (
                  <>
                    {/* QR Code Section */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center" style={{ width: '120px' }}>
                      <img
                        src={generatedLabels[0].qrCode}
                        alt="QR Code"
                        className="w-24 h-24"
                      />
                      <p className="text-[8px] font-mono text-gray-600 mt-1">
                        {generatedLabels[0].barcode}
                      </p>
                    </div>
                    {/* Info Section */}
                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                      <div>
                        <h4 className="font-black text-black text-[10px] uppercase leading-tight mb-1 break-words">
                          {generatedLabels[0].preparationName}
                        </h4>
                        {generatedLabels[0].cassetteInfo && (
                          <div className="border border-black px-1 py-0.5 mb-1 text-center">
                            <p className="text-[8px] font-bold">
                              {generatedLabels[0].cassetteInfo}
                            </p>
                          </div>
                        )}
                        <p className="text-[7px] text-gray-500">
                          Prod: {(generatedLabels[0].createdAt?.toDate?.() || new Date(generatedLabels[0].createdAt)).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <div>
                        <div className="border-2 border-black px-1 py-1 text-center mb-1">
                          <p className="text-[7px] font-bold">SCADENZA</p>
                          <p className="text-[11px] font-black">
                            {(generatedLabels[0].expiryDate?.toDate?.() || new Date(generatedLabels[0].expiryDate)).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <p className="text-[6px] text-gray-400 font-mono">
                          ID: {generatedLabels[0].id.slice(-8)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Info formato stampa */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
              <p className="text-xs font-semibold text-blue-800">
                🏷️ Formato etichetta: <strong>62mm x 40mm</strong> (Brother / stampanti termiche)<br/>
                📋 Etichette necessarie: <strong>{labelCount}</strong><br/>
                Imposta il numero di copie nelle impostazioni di stampa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles - Non più necessari, la stampa usa una finestra separata */}
    </div>
  );
};

export default FifoLabelsView;

