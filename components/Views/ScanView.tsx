import React, { useState, useEffect, useRef } from 'react';
import { ScanBarcode, Camera, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Preparation, FifoLabel, StockMovement } from '../../types';

interface ScanViewProps {
  preparations: Preparation[];
  fifoLabels: FifoLabel[];
  stockMovements: StockMovement[];
  currentUser: { id: string; name: string };
  onScanLabel: (labelId: string, userId: string) => Promise<void>;
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
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

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
    if (!scanActive || cameraPermission !== 'granted' || !qrReaderRef.current) return;

    const onScanSuccess = async (decodedText: string) => {
      if (decodedText.startsWith('FIFO:')) {
        const labelId = decodedText.replace('FIFO:', '');
        await handleFifoScan(labelId);
      } else {
        alert('QR Code non valido. Usa un\'etichetta FIFO.');
      }
    };

    const onScanError = (error: string) => {
      // Ignora errori di scan continuo
    };

    try {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false
      );

      scannerRef.current.render(onScanSuccess, onScanError);
    } catch (error) {
      console.error('Errore inizializzazione scanner:', error);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scanActive, cameraPermission]);

  const handleFifoScan = async (labelId: string) => {
    try {
      // Trova label
      const label = fifoLabels.find(l => l.id === labelId);
      
      if (!label) {
        alert('❌ Etichetta non trovata!');
        return;
      }

      if (label.status === 'consumed') {
        alert('⚠️ Etichetta già utilizzata!');
        return;
      }

      if (label.status === 'expired') {
        alert('⚠️ PRODOTTO SCADUTO! Non utilizzare.');
        return;
      }

      // Check scadenza
      const expiryDate = label.expiryDate?.toDate?.() || new Date(label.expiryDate);
      if (expiryDate < new Date()) {
        alert('⚠️ PRODOTTO SCADUTO! Non utilizzare.');
        return;
      }

      // Scarica stock
      await onScanLabel(labelId, currentUser.id);
      
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
    } catch (error) {
      console.error('Errore scan:', error);
      alert('Errore durante lo scan');
    }
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

  return (
    <div className="space-y-6">
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

