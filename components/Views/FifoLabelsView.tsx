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
      const isImpastoPrep = isImpasto(selectedPrep);
      const numLabels = labelCount; // Numero di etichette da generare

      console.log('[FifoLabelsView] Inizio generazione etichette:', {
        preparation: selectedPrep.name,
        preparationId: selectedPrep.id,
        expiryDate,
        numLabels,
        isImpasto: isImpastoPrep
      });

      const labels: FifoLabel[] = [];
      const timestamp = Date.now();

      // Genera N etichette con QR code UNIVOCI
      for (let i = 0; i < numLabels; i++) {
        const randomSuffix = Math.random().toString(36).substr(2, 6);
        const labelId = `${selectedPrep.id}_${timestamp}_${i}_${randomSuffix}`;
        const qrData = `FIFO:${labelId}`;

        const qrCodeImage = await generateQRCode(qrData);

        if (!qrCodeImage) {
          throw new Error(`Errore generazione QR code per etichetta ${i + 1}`);
        }

        const barcode = extractBarcode(labelId);

        // Per impasti, ogni cassetta ha info diverse
        let cassetteInfo: string | undefined;
        if (isImpastoPrep && impastoCalculations) {
          const panettiInCassetta = impastoCalculations.cassetteDistribution[i] || 0;
          cassetteInfo = `Cassetta ${i + 1}/${impastoCalculations.numCassette} - ${panettiInCassetta} pz`;
        }

        const label: FifoLabel = {
          id: labelId,
          preparationId: selectedPrep.id,
          preparationName: selectedPrep.name,
          qrCode: qrCodeImage,
          barcode: barcode,
          expiryDate: new Date(expiryDate),
          createdAt: new Date(),
          createdBy: '', // Sarà popolato in App.tsx
          status: 'active',
          ...(cassetteInfo && { cassetteInfo })
        };

        labels.push(label);
        console.log(`[FifoLabelsView] Etichetta ${i + 1}/${numLabels} generata:`, labelId);
      }

      // Salva TUTTE le etichette nel database
      console.log('[FifoLabelsView] Salvataggio', labels.length, 'etichette nel database');
      await onGenerateLabels(labels, numLabels);

      console.log('[FifoLabelsView] Tutte le etichette generate e salvate con successo');
      setGeneratedLabels(labels);
      setShowPrintPreview(true);

      alert(`✅ ${numLabels} etichette generate con successo!\n\nOgni etichetta ha un QR code univoco.\nClicca "Stampa" per stampare tutte le etichette.`);
    } catch (error) {
      console.error('[FifoLabelsView] Errore generazione etichette:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      alert(`❌ Errore durante la generazione delle etichette:\n${errorMessage}\n\nControlla la console per maggiori dettagli.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (generatedLabels.length === 0) {
      alert('Nessuna etichetta da stampare. Genera prima le etichette.');
      return;
    }

    console.log('[FifoLabelsView] Stampa richiesta -', generatedLabels.length, 'etichette');

    // Genera HTML per TUTTE le etichette (una per pagina)
    const labelsHtml = generatedLabels.map((label, index) => {
      const createdAt = label.createdAt?.toDate?.() || new Date(label.createdAt);
      const expiryDateLabel = label.expiryDate?.toDate?.() || new Date(label.expiryDate);

      return `
        <div class="label-container" ${index < generatedLabels.length - 1 ? 'style="page-break-after: always;"' : ''}>
          <div class="qr-section">
            <div class="qr-code">
              <img src="${label.qrCode}" alt="QR Code" />
            </div>
            <div class="barcode-text">${label.barcode}</div>
          </div>
          <div class="info-section">
            <div>
              <div class="prep-name">${label.preparationName}</div>
              ${label.cassetteInfo ? `<div class="cassette-info">${label.cassetteInfo}</div>` : ''}
              <div class="date-row">Prod: ${createdAt.toLocaleDateString('it-IT')}</div>
            </div>
            <div>
              <div class="expiry-box">
                <div class="expiry-label">SCADENZA</div>
                <div class="expiry-date">${expiryDateLabel.toLocaleDateString('it-IT')}</div>
              </div>
              <div class="label-id">ID: ${label.id.slice(-8)}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Crea iframe nascosto per stampa (evita popup blocker)
    const existingIframe = document.getElementById('print-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etichette FIFO - ${generatedLabels[0]?.preparationName || 'Stampa'}</title>
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
              margin: 0;
              padding: 0;
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
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
      </html>
    `;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      // Attendi caricamento immagini QR poi stampa
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        // Rimuovi iframe dopo stampa
        setTimeout(() => {
          iframe.remove();
        }, 1000);
      }, 500);
    }
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
              {isGenerating ? 'Generazione in corso...' : `Genera ${labelCount > 1 ? labelCount + ' Etichette' : 'Etichetta'}`}
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
              <li>Genera le etichette - ognuna avrà un QR code univoco</li>
              <li>Clicca "Stampa" per stampare tutte le etichette in sequenza</li>
              <li>Ogni etichetta può essere scansionata una sola volta</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Anteprima Etichette Generate */}
      {generatedLabels.length > 0 && showPrintPreview && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-black">
                {generatedLabels.length} Etichette Generate
              </h3>
              <p className="text-sm text-gray-500 mt-1">Ogni etichetta ha un QR code univoco</p>
            </div>
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
                Stampa Tutte ({generatedLabels.length})
              </button>
            </div>
          </div>

          {/* Info formato stampa */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-green-800">
              ✅ <strong>{generatedLabels.length} etichette</strong> pronte per la stampa<br/>
              🏷️ Formato: <strong>62mm x 40mm</strong> (Brother / stampanti termiche)<br/>
              📄 Ogni etichetta verrà stampata su una pagina separata
            </p>
          </div>

          {/* Griglia anteprima etichette */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
            {generatedLabels.map((label, index) => (
              <div
                key={label.id}
                className="label-preview bg-white border-2 border-gray-300 rounded-lg flex gap-2 hover:border-gray-500 transition-all"
                style={{ padding: '8px' }}
              >
                {/* QR Code Section */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center" style={{ width: '80px' }}>
                  <img
                    src={label.qrCode}
                    alt={`QR Code ${index + 1}`}
                    className="w-16 h-16"
                  />
                  <p className="text-[6px] font-mono text-gray-500 mt-1">
                    #{index + 1}
                  </p>
                </div>
                {/* Info Section */}
                <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                  <div>
                    <h4 className="font-bold text-black text-[9px] uppercase leading-tight mb-1 truncate">
                      {label.preparationName}
                    </h4>
                    {label.cassetteInfo && (
                      <div className="border border-black px-1 py-0.5 mb-1 text-center">
                        <p className="text-[7px] font-bold">
                          {label.cassetteInfo}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="border border-black px-1 py-0.5 text-center">
                      <p className="text-[6px] font-bold">SCADE</p>
                      <p className="text-[8px] font-black">
                        {(label.expiryDate?.toDate?.() || new Date(label.expiryDate)).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print Styles - Non più necessari, la stampa usa una finestra separata */}
    </div>
  );
};

export default FifoLabelsView;

