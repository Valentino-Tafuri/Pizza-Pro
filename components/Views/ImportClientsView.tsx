import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, X } from 'lucide-react';
import { Client } from '../../types';
import { db } from '../../firebase';
import { collection, doc, setDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { saveData } from '../../services/database';

interface ImportClientsViewProps {
  userId: string;
  onImportComplete?: () => void;
}

interface ImportResult {
  success: boolean;
  message: string;
  stats: {
    total: number;
    imported: number;
    updated: number;
    errors: number;
  };
  errors?: Array<{ index: number; error: string; client: any }>;
}

const ImportClientsView: React.FC<ImportClientsViewProps> = ({ userId, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'json'>('file');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewClients, setPreviewClients] = useState<Client[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Verifica che sia un file CSV o JSON
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'json') {
      alert('⚠️ Formato file non supportato. Usa un file CSV o JSON.');
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setPreviewClients([]);

    // Leggi il file per preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (extension === 'json') {
        try {
          const data = JSON.parse(content);
          const clients = Array.isArray(data) ? data : (data.clients || data.data || []);
          parseClients(clients);
        } catch (error) {
          alert('⚠️ Errore nel parsing del file JSON. Verifica il formato.');
        }
      } else if (extension === 'csv') {
        parseCSV(content);
      }
    };
    reader.readAsText(selectedFile);
  };

  const parseCSV = (csvContent: string) => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      alert('⚠️ Il file CSV sembra vuoto o non valido.');
      return;
    }

    // Estrai header (prima riga)
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Cerca gli indici delle colonne importanti
    const nameIndex = headers.findIndex(h => 
      h.includes('nome') || h.includes('name') || h.includes('ragione sociale')
    );
    const emailIndex = headers.findIndex(h => 
      h.includes('email') || h.includes('e-mail')
    );
    const phoneIndex = headers.findIndex(h => 
      h.includes('telefono') || h.includes('phone') || h.includes('cellulare')
    );
    const addressIndex = headers.findIndex(h => 
      h.includes('indirizzo') || h.includes('address')
    );
    const cityIndex = headers.findIndex(h => 
      h.includes('città') || h.includes('city') || h.includes('citta')
    );
    const vatIndex = headers.findIndex(h => 
      h.includes('p.iva') || h.includes('vat') || h.includes('partita iva')
    );

    const clients: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const client: any = {};
      
      if (nameIndex >= 0 && values[nameIndex]) client.name = values[nameIndex];
      if (emailIndex >= 0 && values[emailIndex]) client.email = values[emailIndex];
      if (phoneIndex >= 0 && values[phoneIndex]) client.phone = values[phoneIndex];
      if (addressIndex >= 0 && values[addressIndex]) client.address = values[addressIndex];
      if (cityIndex >= 0 && values[cityIndex]) client.city = values[cityIndex];
      if (vatIndex >= 0 && values[vatIndex]) client.vat_number = values[vatIndex];

      if (client.name || client.email) {
        clients.push(client);
      }
    }

    parseClients(clients);
  };

  const parseClients = (clients: any[]) => {
    if (!Array.isArray(clients) || clients.length === 0) {
      alert('⚠️ Nessun cliente trovato nel file. Verifica il formato.');
      return;
    }

    // Converti in formato Client standard
    const parsedClients: Client[] = clients.slice(0, 10).map((c: any, index: number) => ({
      id: c.id || c.client_id || `temp_${index}`,
      name: c.name || c.company_name || c.business_name || '',
      email: c.email || c.email_address || '',
      phone: c.phone || c.phone_number || c.telephone || '',
      address: c.address || c.street_address || c.full_address || '',
      city: c.city || '',
      postalCode: c.postal_code || c.postcode || c.zip_code || '',
      country: c.country || c.country_code || 'IT',
      vat_number: c.vat_number || c.vat || c.piva || c.tax_id || '',
    })).filter((c: Client) => c.name || c.email);

    setPreviewClients(parsedClients);
  };

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    setResult(null);
    setPreviewClients([]);

    if (text.trim()) {
      try {
        const data = JSON.parse(text);
        const clients = Array.isArray(data) ? data : (data.clients || data.data || []);
        parseClients(clients);
      } catch (error) {
        // Non mostrare errore finché l'utente non prova a importare
      }
    }
  };

  const handleImport = async () => {
    if (!userId) {
      alert('⚠️ User ID non disponibile. Assicurati di essere loggato.');
      return;
    }

    if (importMode === 'file' && file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        let clientsToImport: any[] = [];
        
        try {
          if (extension === 'json') {
            const data = JSON.parse(content);
            clientsToImport = Array.isArray(data) ? data : (data.clients || data.data || []);
          } else if (extension === 'csv') {
            // Parsing CSV completo
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
              alert('⚠️ Il file CSV sembra vuoto o non valido.');
              return;
            }
            
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
            const nameIndex = headers.findIndex(h => h.includes('nome') || h.includes('name') || h.includes('ragione sociale'));
            const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('e-mail'));
            const phoneIndex = headers.findIndex(h => h.includes('telefono') || h.includes('phone') || h.includes('cellulare'));
            const addressIndex = headers.findIndex(h => h.includes('indirizzo') || h.includes('address'));
            const cityIndex = headers.findIndex(h => h.includes('città') || h.includes('city') || h.includes('citta'));
            const vatIndex = headers.findIndex(h => h.includes('p.iva') || h.includes('vat') || h.includes('partita iva'));
            
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
              const client: any = {};
              
              if (nameIndex >= 0 && values[nameIndex]) client.name = values[nameIndex];
              if (emailIndex >= 0 && values[emailIndex]) client.email = values[emailIndex];
              if (phoneIndex >= 0 && values[phoneIndex]) client.phone = values[phoneIndex];
              if (addressIndex >= 0 && values[addressIndex]) client.address = values[addressIndex];
              if (cityIndex >= 0 && values[cityIndex]) client.city = values[cityIndex];
              if (vatIndex >= 0 && values[vatIndex]) client.vat_number = values[vatIndex];
              
              if (client.name || client.email) {
                clientsToImport.push(client);
              }
            }
          }
          
          if (clientsToImport.length === 0) {
            alert('⚠️ Nessun cliente trovato nel file. Verifica il formato.');
            return;
          }
          
          await performImport(clientsToImport);
        } catch (error) {
          console.error('Error parsing file:', error);
          alert('⚠️ Errore nel parsing del file. Verifica il formato.');
        }
      };
      reader.readAsText(file);
    } else if (importMode === 'json' && jsonText.trim()) {
      try {
        const data = JSON.parse(jsonText);
        const clientsToImport = Array.isArray(data) ? data : (data.clients || data.data || []);
        
        if (!Array.isArray(clientsToImport) || clientsToImport.length === 0) {
          alert('⚠️ Nessun cliente trovato nel JSON. Verifica il formato.');
          return;
        }
        
        await performImport(clientsToImport);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('⚠️ Errore nel parsing del JSON. Verifica il formato.');
      }
    } else {
      alert('⚠️ Seleziona un file o inserisci JSON valido.');
    }
  };

  const performImport = async (clientsToImport: any[]) => {
    if (!Array.isArray(clientsToImport) || clientsToImport.length === 0) {
      alert('⚠️ Nessun cliente da importare.');
      return;
    }

    if (!userId) {
      alert('⚠️ User ID non disponibile. Assicurati di essere loggato.');
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      // Usa il client SDK Firebase direttamente invece dell'API endpoint
      // Questo funziona perché l'utente è già autenticato
      const clientsRef = collection(db, `users/${userId}/crmClients`);
      
      let imported = 0;
      let errors: Array<{ index: number; error: string; client: any }> = [];

      // Firestore permette max 500 operazioni per batch
      // Dividi in batch più piccoli se necessario
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(clientsToImport.length / BATCH_SIZE);
      
      // Processa in batch multipli
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchRef = writeBatch(db);
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, clientsToImport.length);
        let batchOperations = 0;
        
        for (let i = startIndex; i < endIndex; i++) {
          const clientData = clientsToImport[i];
          
          try {
            // Mappa i dati al formato Client standard
            const clientId = clientData.id || clientData.client_id || `platform_${Date.now()}_${i}`;
            const clientName = clientData.name || clientData.company_name || clientData.business_name || '';
            const clientEmail = clientData.email || clientData.email_address || '';

            // Valida che ci siano almeno nome o email
            if (!clientName && !clientEmail) {
              errors.push({
                index: i,
                error: 'Cliente senza nome o email',
                client: clientData
              });
              continue;
            }

            const client = {
              id: clientId,
              name: clientName,
              email: clientEmail,
              phone: clientData.phone || clientData.phone_number || clientData.telephone || '',
              address: clientData.address || clientData.street_address || clientData.full_address || '',
              city: clientData.city || '',
              postalCode: clientData.postal_code || clientData.postcode || clientData.zip_code || '',
              country: clientData.country || clientData.country_code || 'IT',
              vat_number: clientData.vat_number || clientData.vat || clientData.piva || clientData.tax_id || '',
              // Metadati
              source: 'platform_import',
              importedAt: Timestamp.now(),
              userId: userId,
              updatedAt: Timestamp.now(),
            };

            // Aggiungi al batch write
            const clientDocRef = doc(clientsRef, clientId);
            batchRef.set(clientDocRef, client, { merge: true });
            batchOperations++;
            imported++;

          } catch (error) {
            errors.push({
              index: i,
              error: error instanceof Error ? error.message : 'Unknown error',
              client: clientData
            });
          }
        }
        
        // Commit del batch se ci sono operazioni
        if (batchOperations > 0) {
          await batchRef.commit();
          console.log(`[ImportClientsView] Batch ${batchIndex + 1}/${totalBatches} completato: ${batchOperations} clienti`);
        }
      }

      const finalResult: ImportResult = {
        success: true,
        message: `Importazione completata: ${imported} clienti importati`,
        stats: {
          total: clientsToImport.length,
          imported,
          updated: imported, // Ogni import è sia nuovo che aggiornato (merge)
          errors: errors.length
        },
        errors: errors.length > 0 ? errors : undefined
      };

      setResult(finalResult);
      
      if (onImportComplete) {
        onImportComplete();
      }

    } catch (error) {
      console.error('Error importing clients:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Errore durante l\'importazione',
        stats: {
          total: clientsToImport.length,
          imported: 0,
          updated: 0,
          errors: clientsToImport.length,
        },
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setJsonText('');
    setResult(null);
    setPreviewClients([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
            <Upload className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
              Importa Clienti da Platform
            </h3>
            <p className="text-sm font-bold text-gray-600">
              Carica un file CSV/JSON o incolla i dati per sincronizzare i clienti esistenti
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <p className="text-xs font-bold text-blue-900">
            💡 <strong>Suggerimento:</strong> Esporta i clienti da Platform come CSV o JSON e caricali qui per sincronizzarli con il database.
          </p>
        </div>
      </div>

      {/* Import Mode Selector */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setImportMode('file')}
            className={`flex-1 px-6 py-4 rounded-2xl font-black text-sm transition-all ${
              importMode === 'file'
                ? 'bg-black text-white shadow-lg'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            <FileText className="inline mr-2" size={18} />
            Carica File
          </button>
          <button
            onClick={() => setImportMode('json')}
            className={`flex-1 px-6 py-4 rounded-2xl font-black text-sm transition-all ${
              importMode === 'json'
                ? 'bg-black text-white shadow-lg'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            <FileText className="inline mr-2" size={18} />
            Incolla JSON
          </button>
        </div>

        {/* File Upload */}
        {importMode === 'file' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-gray-300 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-sm font-bold text-gray-600 mb-2">
                  {file ? file.name : 'Clicca per selezionare un file CSV o JSON'}
                </p>
                <p className="text-xs text-gray-400">
                  Supporta file CSV e JSON esportati da Platform
                </p>
              </label>
            </div>
          </div>
        )}

        {/* JSON Input */}
        {importMode === 'json' && (
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 block">
              Incolla JSON dei clienti
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder='[{"name":"Cliente 1","email":"cliente1@example.com",...}, {"name":"Cliente 2",...}]'
              className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-mono min-h-[200px] focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-400 px-2">
              Formato: Array di oggetti JSON o oggetto con proprietà "clients" o "data"
            </p>
          </div>
        )}

        {/* Preview */}
        {previewClients.length > 0 && (
          <div className="mt-6 p-6 bg-gray-50 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                Anteprima (primi {previewClients.length} clienti)
              </h4>
              <span className="text-xs font-bold text-gray-600">
                Anteprima (max 10)
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {previewClients.map((client, index) => (
                <div key={index} className="p-3 bg-white rounded-xl text-xs">
                  <p className="font-black text-black">{client.name || '(Senza nome)'}</p>
                  {client.email && <p className="text-gray-500">{client.email}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import Button */}
        {(file || jsonText.trim()) && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="flex-1 bg-black text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Importazione in corso...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Importa Clienti</span>
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={isImporting}
              className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-[2.5rem] p-8 shadow-sm border ${
          result.success
            ? 'bg-green-50 border-green-100'
            : 'bg-red-50 border-red-100'
        }`}>
          <div className="flex items-start space-x-3 mb-4">
            {result.success ? (
              <CheckCircle2 className="text-green-600 mt-1" size={24} />
            ) : (
              <AlertCircle className="text-red-600 mt-1" size={24} />
            )}
            <div className="flex-1">
              <h4 className={`text-sm font-black mb-2 ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? '✅ Importazione Completata!' : '❌ Errore nell\'Importazione'}
              </h4>
              <p className={`text-xs font-bold ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-black">{result.stats.total}</p>
              <p className="text-[9px] font-black uppercase text-gray-500">Totali</p>
            </div>
            <div className="bg-white/50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-green-600">{result.stats.imported}</p>
              <p className="text-[9px] font-black uppercase text-gray-500">Importati</p>
            </div>
            <div className="bg-white/50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-600">{result.stats.updated}</p>
              <p className="text-[9px] font-black uppercase text-gray-500">Aggiornati</p>
            </div>
            <div className="bg-white/50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-red-600">{result.stats.errors}</p>
              <p className="text-[9px] font-black uppercase text-gray-500">Errori</p>
            </div>
          </div>

          {/* Errors Details */}
          {result.errors && result.errors.length > 0 && (
            <div className="mt-6 p-4 bg-white/50 rounded-2xl max-h-48 overflow-y-auto">
              <p className="text-xs font-black uppercase text-red-600 mb-2">Dettagli Errori:</p>
              {result.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="text-xs text-red-700 mb-1">
                  Riga {error.index + 1}: {error.error}
                </div>
              ))}
              {result.errors.length > 5 && (
                <p className="text-xs text-red-600">... e altri {result.errors.length - 5} errori</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportClientsView;

