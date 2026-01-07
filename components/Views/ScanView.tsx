import React, { useState, useEffect, useRef } from 'react';
import { ScanBarcode, Camera, AlertCircle, CheckCircle, Clock, TrendingUp, X, Package, Calendar, User, ChevronRight } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Preparation, FifoLabel, StockMovement } from '../../types';

interface ScanViewProps {
  preparations: Preparation[];
  fifoLabels: FifoLabel[];
  stockMovements: StockMovement[];
  currentUser: { id: string; name: string };
  onScanLabel: (labelId: string, userId: string) => Promise<void>;
}

interface ScannedProduct {
  label: FifoLabel;
  preparation: Preparation | undefined;
  expiryDate: Date;
  isExpired: boolean;
  isConsumed: boolean;
}

const ScanView: React.FC<ScanViewProps> = ({
  preparations,
  fifoLabels,
  stockMovements,
  currentUser,
  onScanLabel
}) => {
  const [scanActive, setScanActive] = useState(false);
  const [scanHistory, setScanHistory] = useState<StockMovement[]>([]);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'checking'>('checking');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  // Ref per mantenere l'ultima versione della callback (fix closure stale)
  const handleFifoScanRef = useRef<(labelId: string) => Promise<void>>();

  // Stato per conferma scarico
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const processingRef = useRef(false);

  // Filtra movimenti di scarico
  useEffect(() => {
    const unloads = stockMovements
      .filter(m => m.type === 'unload')
      .sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() || new Date(a.timestamp).getTime();
        const bTime = b.timestamp?.toMillis?.() || new Date(b.timestamp).getTime();
        return bTime - aTime;
      })
      .slice(0, 10);
    setScanHistory(unloads);
  }, [stockMovements]);

  // Statistiche
  const stats = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayScans = stockMovements.filter(m => {
      if (m.type !== 'unload') return false;
      const mTime = m.timestamp?.toMillis?.() || new Date(m.timestamp).getTime();
      return mTime >= today.getTime();
    }).length;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekScans = stockMovements.filter(m => {
      if (m.type !== 'unload') return false;
      const mTime = m.timestamp?.toMillis?.() || new Date(m.timestamp).getTime();
      return mTime >= weekStart.getTime();
    }).length;

    const totalScans = stockMovements.filter(m => m.type === 'unload').length;

    return { todayScans, weekScans, totalScans };
  }, [stockMovements]);

  // Controlla permessi camera
  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setCameraPermission('granted');
      } catch (error) {
        setCameraPermission('denied');
      }
    };
    checkCameraPermission();
  }, []);

  // Inizializza scanner
  useEffect(() => {
    if (!scanActive || cameraPermission !== 'granted') return;

    console.log('[ScanView] Inizializzazione scanner QR...');
    let isMounted = true;

    const onScanSuccess = async (decodedText: string) => {
      console.log('[ScanView] ✅ QR Code scansionato:', decodedText);

      // DEBUG: mostra alert per confermare che la callback viene chiamata
      alert(`QR Letto: ${decodedText.substring(0, 50)}...`);

      if (decodedText.startsWith('FIFO:')) {
        const labelId = decodedText.replace('FIFO:', '');
        console.log('[ScanView] Label ID estratto:', labelId);
        // Usa il ref per chiamare l'ultima versione della funzione (fix closure stale)
        if (handleFifoScanRef.current) {
          await handleFifoScanRef.current(labelId);
        } else {
          console.error('[ScanView] handleFifoScanRef.current è undefined!');
          alert('Errore: callback non disponibile');
        }
      } else {
        console.log('[ScanView] QR Code non valido, formato non FIFO');
        alert('QR Code non valido. Usa un\'etichetta FIFO.');
      }
    };

    const onScanError = (errorMessage: string) => {
      // Ignora errori di scan continuo (sono normali durante la scansione)
    };

    const startScanner = async () => {
      // Aspetta che il DOM sia pronto
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!isMounted) return;

      const qrReaderElement = document.getElementById('qr-reader');
      if (!qrReaderElement) {
        console.error('[ScanView] Elemento qr-reader non trovato nel DOM');
        return;
      }

      console.log('[ScanView] Elemento qr-reader trovato, avvio scanner...');

      try {
        // Crea istanza Html5Qrcode
        scannerRef.current = new Html5Qrcode("qr-reader");

        // Configura per usare la camera posteriore (environment) automaticamente su mobile
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        // Usa facingMode: "environment" per la camera posteriore su mobile
        await scannerRef.current.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanError
        );

        console.log('[ScanView] ✅ Scanner QR avviato con camera posteriore');
      } catch (error) {
        console.error('[ScanView] Errore avvio scanner con camera posteriore:', error);

        // Fallback: prova con qualsiasi camera disponibile
        try {
          if (scannerRef.current && isMounted) {
            await scannerRef.current.start(
              { facingMode: "user" },
              { fps: 10, qrbox: { width: 250, height: 250 } },
              onScanSuccess,
              onScanError
            );
            console.log('[ScanView] ✅ Scanner QR avviato con camera frontale (fallback)');
          }
        } catch (fallbackError) {
          console.error('[ScanView] ❌ Errore inizializzazione scanner:', fallbackError);
          if (isMounted) {
            alert('Impossibile avviare la camera. Verifica i permessi del browser.');
          }
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        console.log('[ScanView] Pulizia scanner QR...');
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scanActive, cameraPermission]);

  const handleFifoScan = async (labelId: string) => {
    console.log('[ScanView] handleFifoScan chiamata con labelId:', labelId);

    // Previeni scan multipli ravvicinati (debounce 2 secondi)
    const now = Date.now();
    if (now - lastScanTime < 2000) {
      console.log('[ScanView] Scan ignorato - troppo ravvicinato');
      return;
    }

    // Previeni elaborazioni multiple simultanee
    if (processingRef.current || showConfirmModal) {
      console.log('[ScanView] Scan ignorato - elaborazione in corso o modal aperto');
      return;
    }

    processingRef.current = true;
    setLastScanTime(now);

    try {
      console.log('[ScanView] Cercando label tra', fifoLabels.length, 'etichette');
      // Trova label
      const label = fifoLabels.find(l => l.id === labelId);
      console.log('[ScanView] Label trovata:', label ? 'sì' : 'no', label?.id);

      if (!label) {
        console.log('[ScanView] Etichetta non trovata, mostrando modal errore');
        processingRef.current = false;
        setScannedProduct(null);
        setShowConfirmModal(true);
        setTimeout(() => setShowConfirmModal(false), 3000);
        return;
      }

      const expiryDate = label.expiryDate?.toDate?.() || new Date(label.expiryDate);
      const isExpired = expiryDate < new Date();
      const isConsumed = label.status === 'consumed';
      const preparation = preparations.find(p => p.id === label.preparationId);

      console.log('[ScanView] Mostrando modal conferma per:', label.preparationName);
      // Mostra modal di conferma con i dettagli del prodotto
      setScannedProduct({
        label,
        preparation,
        expiryDate,
        isExpired,
        isConsumed
      });
      setShowConfirmModal(true);

      // Pausa scanner mentre mostra conferma
      if (scannerRef.current) {
        try {
          scannerRef.current.pause(true); // true = pausa anche il video
        } catch (e) {
          // Ignora errori di pausa
        }
      }
    } catch (error) {
      console.error('[ScanView] Errore scan:', error);
    } finally {
      processingRef.current = false;
    }
  };

  // Aggiorna il ref ad ogni render per evitare closure stale
  handleFifoScanRef.current = handleFifoScan;

  // Conferma scarico prodotto
  const handleConfirmUnload = async () => {
    if (!scannedProduct || isProcessing) return;

    setIsProcessing(true);
    try {
      await onScanLabel(scannedProduct.label.id, currentUser.id);

      // Aggiorna history
      const unloads = stockMovements
        .filter(m => m.type === 'unload')
        .sort((a, b) => {
          const aTime = a.timestamp?.toMillis?.() || new Date(a.timestamp).getTime();
          const bTime = b.timestamp?.toMillis?.() || new Date(b.timestamp).getTime();
          return bTime - aTime;
        })
        .slice(0, 10);
      setScanHistory(unloads);

      // Chiudi modal e riattiva scanner
      setShowConfirmModal(false);
      setScannedProduct(null);

      // Riattiva scanner per prossimo scan
      if (scannerRef.current) {
        try {
          scannerRef.current.resume();
        } catch (e) {
          // Se resume fallisce, ricrea lo scanner
          setScanActive(false);
          setTimeout(() => setScanActive(true), 500);
        }
      }
    } catch (error) {
      console.error('Errore conferma scarico:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Annulla e continua a scansionare
  const handleCancelScan = () => {
    setShowConfirmModal(false);
    setScannedProduct(null);

    // Riattiva scanner
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (e) {
        // Se resume fallisce, ricrea lo scanner
        setScanActive(false);
        setTimeout(() => setScanActive(true), 500);
      }
    }
  };

  // Chiudi e ferma scanner
  const handleCloseScanner = () => {
    setShowConfirmModal(false);
    setScannedProduct(null);
    setScanActive(false);
  };

  const toggleScanner = () => {
    if (cameraPermission !== 'granted') {
      alert('Permessi camera negati. Abilita i permessi nelle impostazioni del browser.');
      return;
    }
    setScanActive(!scanActive);
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      setScanActive(true);
    } catch (error) {
      alert('Impossibile accedere alla camera. Verifica i permessi del browser.');
    }
  };

  const formatDate = (timestamp: Date | any): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatta data scadenza
  const formatExpiryDate = (date: Date): string => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calcola giorni rimanenti
  const getDaysRemaining = (expiryDate: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Modal Conferma Scarico - Stile iOS */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white">
              <button
                onClick={handleCloseScanner}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <ScanBarcode size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Prodotto Scansionato</p>
                  <h3 className="text-lg font-black">Conferma Scarico</h3>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {!scannedProduct ? (
                // Etichetta non trovata
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-red-600" size={32} />
                  </div>
                  <h4 className="text-lg font-black text-gray-900 mb-2">Etichetta Non Trovata</h4>
                  <p className="text-sm text-gray-500">QR Code non riconosciuto nel sistema</p>
                </div>
              ) : scannedProduct.isConsumed ? (
                // Già utilizzata
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-amber-600" size={32} />
                  </div>
                  <h4 className="text-lg font-black text-gray-900 mb-2">Già Scaricato</h4>
                  <p className="text-sm text-gray-500 mb-4">Questo prodotto è già stato utilizzato</p>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm font-black text-gray-900">{scannedProduct.label.preparationName}</p>
                    {scannedProduct.label.consumedBy && (
                      <p className="text-xs text-gray-500 mt-1">
                        Scaricato da: {scannedProduct.label.consumedBy}
                      </p>
                    )}
                  </div>
                </div>
              ) : scannedProduct.isExpired ? (
                // Prodotto scaduto
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-red-600" size={32} />
                  </div>
                  <h4 className="text-lg font-black text-red-600 mb-2">PRODOTTO SCADUTO</h4>
                  <p className="text-sm text-gray-500 mb-4">Non utilizzare questo prodotto!</p>
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <p className="text-sm font-black text-gray-900">{scannedProduct.label.preparationName}</p>
                    <p className="text-xs text-red-600 font-bold mt-1">
                      Scaduto il: {formatExpiryDate(scannedProduct.expiryDate)}
                    </p>
                  </div>
                </div>
              ) : (
                // Prodotto valido - mostra dettagli e conferma
                <div className="space-y-4">
                  {/* Card Prodotto */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Package className="text-green-600" size={28} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-black text-gray-900 truncate">
                          {scannedProduct.label.preparationName}
                        </h4>
                        {scannedProduct.label.cassetteInfo && (
                          <p className="text-sm font-bold text-amber-600 mt-1">
                            {scannedProduct.label.cassetteInfo}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-semibold text-gray-400">Stock attuale:</span>
                          <span className="text-sm font-black text-gray-700">
                            {scannedProduct.preparation?.currentStock || 0} {scannedProduct.preparation?.unit || 'pz'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Scadenza */}
                  <div className={`rounded-2xl p-4 ${
                    getDaysRemaining(scannedProduct.expiryDate) <= 1
                      ? 'bg-red-50 border border-red-200'
                      : getDaysRemaining(scannedProduct.expiryDate) <= 3
                      ? 'bg-amber-50 border border-amber-200'
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar size={20} className={
                          getDaysRemaining(scannedProduct.expiryDate) <= 1
                            ? 'text-red-600'
                            : getDaysRemaining(scannedProduct.expiryDate) <= 3
                            ? 'text-amber-600'
                            : 'text-green-600'
                        } />
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Scadenza</p>
                          <p className="text-sm font-black text-gray-900">
                            {formatExpiryDate(scannedProduct.expiryDate)}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-black ${
                        getDaysRemaining(scannedProduct.expiryDate) <= 1
                          ? 'bg-red-600 text-white'
                          : getDaysRemaining(scannedProduct.expiryDate) <= 3
                          ? 'bg-amber-600 text-white'
                          : 'bg-green-600 text-white'
                      }`}>
                        {getDaysRemaining(scannedProduct.expiryDate) === 0
                          ? 'OGGI'
                          : getDaysRemaining(scannedProduct.expiryDate) === 1
                          ? '1 giorno'
                          : `${getDaysRemaining(scannedProduct.expiryDate)} giorni`}
                      </div>
                    </div>
                  </div>

                  {/* Info Operatore */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                    <User size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-400">Operatore</p>
                      <p className="text-sm font-black text-gray-900">{currentUser.name}</p>
                    </div>
                  </div>

                  {/* Quantità da scaricare */}
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Quantità da scaricare</p>
                    <p className="text-4xl font-black text-blue-700">1</p>
                    <p className="text-xs text-blue-500 mt-1">unità</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              {!scannedProduct || scannedProduct.isConsumed || scannedProduct.isExpired ? (
                // Solo pulsante per continuare a scansionare
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCloseScanner}
                    className="py-4 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl text-sm font-black transition-all active:scale-95"
                  >
                    Chiudi
                  </button>
                  <button
                    onClick={handleCancelScan}
                    className="py-4 px-6 bg-black hover:bg-gray-800 text-white rounded-2xl text-sm font-black transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Scansiona Altro
                    <ChevronRight size={18} />
                  </button>
                </div>
              ) : (
                // Pulsanti conferma/annulla
                <div className="space-y-3">
                  <button
                    onClick={handleConfirmUnload}
                    disabled={isProcessing}
                    className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-sm font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Scarico in corso...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Conferma Scarico (1 unità)
                      </>
                    )}
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleCloseScanner}
                      disabled={isProcessing}
                      className="py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                    >
                      Chiudi Scanner
                    </button>
                    <button
                      onClick={handleCancelScan}
                      disabled={isProcessing}
                      className="py-3 px-4 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      Annulla
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scan Oggi</span>
            <Clock className="text-blue-600" size={20} />
          </div>
          <p className="text-3xl font-black text-black">{stats.todayScans}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Questa Settimana</span>
            <TrendingUp className="text-green-600" size={20} />
          </div>
          <p className="text-3xl font-black text-black">{stats.weekScans}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Totale</span>
            <ScanBarcode className="text-purple-600" size={20} />
          </div>
          <p className="text-3xl font-black text-black">{stats.totalScans}</p>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-black">Scanner QR Code</h3>
          {cameraPermission === 'granted' && (
            <button
              onClick={toggleScanner}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all active:scale-95 ${
                scanActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Camera size={18} />
              {scanActive ? 'Stop Scanner' : 'Avvia Scanner'}
            </button>
          )}
        </div>

        {cameraPermission === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
            <p className="text-sm font-bold text-red-700 mb-4">
              Permessi camera negati
            </p>
            <button
              onClick={requestCameraPermission}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95"
            >
              Abilita Camera
            </button>
          </div>
        )}

        {cameraPermission === 'checking' && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-gray-400">Controllo permessi camera...</p>
          </div>
        )}

        {cameraPermission === 'granted' && (
          <div
            ref={qrReaderRef}
            className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
              scanActive ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-gray-200'
            }`}
          >
            <div id="qr-reader" className="w-full" />
            {!scanActive && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-sm font-semibold text-gray-500">
                    Clicca "Avvia Scanner" per iniziare
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ultimi Scan */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-black text-black mb-6">Ultimi 10 Scan</h3>
        
        {scanHistory.length === 0 ? (
          <div className="text-center py-12">
            <ScanBarcode className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400 font-semibold">Nessuno scan registrato</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scanHistory.map((movement) => {
              const prep = preparations.find(p => p.id === movement.preparationId);
              return (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex-1">
                    <p className="text-sm font-black text-black mb-1">
                      {movement.preparationName || prep?.name || 'Preparazione sconosciuta'}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle size={14} />
                        {movement.userName || currentUser.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatDate(movement.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Quantità
                    </p>
                    <p className="text-lg font-black text-black">
                      -{movement.quantity}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanView;



