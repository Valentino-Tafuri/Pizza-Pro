import React, { useState } from 'react';
import { Plus, Minus, Printer, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

interface CustomLabel {
  id: string;
  productName: string;
  expiryDate: Date;
  qrCode: string;
}

const CustomLabelsView: React.FC = () => {
  const [productName, setProductName] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [generatedLabels, setGeneratedLabels] = useState<CustomLabel[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

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

  const handleGenerate = async () => {
    if (!productName || !expiryDate) {
      alert('Inserisci nome prodotto e data di scadenza');
      return;
    }

    setIsGenerating(true);
    try {
      const labels: CustomLabel[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < quantity; i++) {
        const labelId = `CUSTOM_${timestamp}_${i}`;
        const qrData = `CUSTOM:${labelId}:${productName}`;
        
        const qrCodeImage = await generateQRCode(qrData);
        
        if (!qrCodeImage) {
          throw new Error(`Errore generazione QR code per etichetta ${i + 1}`);
        }

        const label: CustomLabel = {
          id: labelId,
          productName: productName,
          expiryDate: new Date(expiryDate),
          qrCode: qrCodeImage
        };

        labels.push(label);
      }

      setGeneratedLabels(labels);
      setShowPrintPreview(true);
      setProductName('');
      setExpiryDate('');
      setQuantity(1);
      
      alert(`✅ ${quantity} etichetta${quantity > 1 ? 'e' : ''} generate con successo!\n\nPuoi ora stamparle cliccando sul pulsante "Stampa".`);
    } catch (error) {
      console.error('Errore generazione etichette:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      alert(`❌ Errore durante la generazione delle etichette:\n${errorMessage}`);
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
        <h3 className="text-xl font-black text-black mb-6">Etichette Personalizzate</h3>
        
        <div className="space-y-4">
          {/* Nome Prodotto */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nome Prodotto
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Es: Crema di cime di rapa"
              className="w-full bg-white border border-gray-200 rounded-xl py-4 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
            />
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
          </div>

          {/* Pulsante Genera */}
          <div className="space-y-2">
            <button
              onClick={handleGenerate}
              disabled={!productName || !expiryDate || isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl py-4 px-6 text-sm font-black uppercase transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isGenerating ? 'Generazione in corso...' : `Genera ${quantity} Etichetta${quantity > 1 ? 'e' : ''}`}
            </button>
            {(!productName || !expiryDate) && (
              <p className="text-xs font-semibold text-red-600 text-center">
                {!productName && '⚠️ Inserisci il nome del prodotto'}
                {productName && !expiryDate && '⚠️ Inserisci la data di scadenza'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <QrCode className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="text-sm font-black text-blue-900 mb-2">Etichette Personalizzate</h4>
            <p className="text-xs font-semibold text-blue-800">
              Queste etichette sono solo per stampa. Non vengono conteggiate nel magazzino.
              Inserisci nome prodotto e data di scadenza, poi genera e stampa.
            </p>
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
                          {label.productName}
                        </h4>
                        <div className="bg-red-100 border border-red-300 rounded px-2 py-1 mb-1">
                          <p className="text-[8px] font-black text-red-700">
                            SCADENZA: {label.expiryDate.toLocaleDateString('it-IT')}
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

export default CustomLabelsView;




