import React, { useState, useEffect } from 'react';
import { Search, Edit2, Calendar, X, FileText, Printer, Trash2 } from 'lucide-react';
import { Quote, Client } from '../../types';
import { syncData, deleteData } from '../../services/database';
import { Timestamp } from 'firebase/firestore';
import ConfirmationModal, { AlertModal } from '../ConfirmationModal';

interface QuotesHistoryViewProps {
  userId: string;
  onQuoteSelect?: (quote: Quote) => void;
  onEditQuote?: (quote: Quote) => void;
}

const QuotesHistoryView: React.FC<QuotesHistoryViewProps> = ({ userId, onQuoteSelect, onEditQuote }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
    variant?: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onClose: () => {},
  });

  // Carica preventivi all'avvio
  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    const unsubscribe = syncData(
      userId,
      'quotes',
      (data: Quote[]) => {
        // Ordina per data di creazione (più recenti prima)
        const sorted = [...data].sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() || new Date(0);
          const bDate = b.createdAt?.toDate?.() || new Date(0);
          return bDate.getTime() - aDate.getTime();
        });
        setQuotes(sorted);
        setFilteredQuotes(sorted);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading quotes:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Filtra preventivi in base alla ricerca e allo status
  useEffect(() => {
    let filtered = quotes;

    // Filtro per ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (quote) =>
          quote.client?.name?.toLowerCase().includes(query) ||
          quote.client?.email?.toLowerCase().includes(query) ||
          quote.client?.vat_number?.toLowerCase().includes(query) ||
          quote.status?.toLowerCase().includes(query)
      );
    }

    // Filtro per status
    if (selectedStatus) {
      filtered = filtered.filter((quote) => quote.status === selectedStatus);
    }

    setFilteredQuotes(filtered);
  }, [searchQuery, selectedStatus, quotes]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'sent':
        return 'bg-blue-100 text-blue-700';
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Bozza';
      case 'sent':
        return 'Inviato';
      case 'accepted':
        return 'Accettato';
      case 'rejected':
        return 'Rifiutato';
      default:
        return status;
    }
  };

  const showAlert = (title: string, message: string, onClose = () => {}, variant: 'danger' | 'warning' | 'info' | 'success' = 'info') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      buttonText: 'Ok',
      onClose: () => {
        onClose();
        setAlertModal({ ...alertModal, isOpen: false });
      },
      variant,
    });
  };

  const handlePrintQuote = (quote: Quote) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert('Avviso', 'Impossibile aprire la finestra di stampa. Verifica che i popup non siano bloccati.', () => {}, 'warning');
      return;
    }

    const menuItemsHtml = (quote.eventMenuItems || []).map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.menuItemName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const beveragesHtml = (quote.eventBeverages || []).map(beverage => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${beverage.beverageName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${beverage.quantity.toFixed(2)}l</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${beverage.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const coverCostHtml = quote.coverCost && quote.expectedPeople ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">Costo Coperto</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${quote.expectedPeople} pz</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${((quote.coverCost || 0) * (quote.expectedPeople || 0)).toFixed(2)}</td>
      </tr>
    ` : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Preventivo - ${quote.client?.name || 'Cliente'}</title>
          <style>
            @media print {
              body { margin: 0; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 24px; margin-bottom: 10px; }
            h2 { font-size: 18px; color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: bold; }
            .total { font-size: 20px; font-weight: bold; margin-top: 20px; text-align: right; }
            .client-info { margin-bottom: 30px; }
            .client-info p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <h1>PREVENTIVO</h1>
          <div class="client-info">
            <h2>Cliente</h2>
            <p><strong>${quote.client?.name || 'N/A'}</strong></p>
            ${quote.client?.address ? `<p>${quote.client.address}</p>` : ''}
            ${quote.client?.city ? `<p>${quote.client.city}${quote.client.postalCode ? ' ' + quote.client.postalCode : ''}</p>` : ''}
            ${quote.client?.vat_number ? `<p>P.IVA: ${quote.client.vat_number}</p>` : ''}
          </div>
          ${quote.eventDate ? `<p><strong>Data Evento:</strong> ${formatDate(quote.eventDate)}</p>` : ''}
          ${quote.expectedPeople ? `<p><strong>Persone Previste:</strong> ${quote.expectedPeople}</p>` : ''}
          <table>
            <thead>
              <tr>
                <th>Descrizione</th>
                <th style="text-align: center;">Quantità</th>
                <th style="text-align: right;">Totale</th>
              </tr>
            </thead>
            <tbody>
              ${menuItemsHtml}
              ${beveragesHtml}
              ${coverCostHtml}
            </tbody>
          </table>
          <div class="total">
            <strong>TOTALE: €${quote.total.toFixed(2)}</strong>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (err) {
        console.error('Errore durante la stampa:', err);
      }
    }, 500);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Elimina Definitivamente', cancelText = 'Annulla', variant: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm();
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
      variant,
    });
  };

  const handleDelete = async (quote: Quote) => {
    showConfirm(
      'Conferma Eliminazione',
      `Sei sicuro di voler eliminare il preventivo per "${quote.client?.name || 'Cliente Sconosciuto'}"? L'azione non può essere annullata.`,
      async () => {
        try {
          await deleteData(userId, 'quotes', quote.id);
        } catch (error) {
          console.error('Error deleting quote:', error);
          showAlert('Errore', 'Errore nell\'eliminazione del preventivo.', () => {}, 'danger');
        }
      },
      'Elimina',
      'Annulla',
      'danger'
    );
  };

  return (
    <>
      <div className="space-y-6 pb-12">
        <div className="space-y-4 px-2">
          {/* Category Filters */}
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setSelectedStatus(null)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${!selectedStatus ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              Tutti
            </button>
            <button 
              onClick={() => setSelectedStatus('draft')}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${selectedStatus === 'draft' ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              Bozze
            </button>
            <button 
              onClick={() => setSelectedStatus('sent')}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${selectedStatus === 'sent' ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              Inviati
            </button>
            <button 
              onClick={() => setSelectedStatus('accepted')}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${selectedStatus === 'accepted' ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              Accettati
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cerca preventivo..." 
              className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>

        {/* Quotes List */}
        {isLoading ? (
          <div className="bg-white rounded-[2.5rem] p-12 text-center">
            <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Caricamento preventivi...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-500 mb-2">Nessun preventivo trovato</p>
            <p className="text-sm text-gray-400">
              {searchQuery || selectedStatus
                ? 'Prova a modificare i filtri di ricerca'
                : 'Inizia creando il tuo primo preventivo'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 px-2">
            {filteredQuotes.map((quote) => {
              const margin = (quote.total || 0) - (quote.subtotal || 0);
              return (
                <div key={quote.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-black">{quote.client?.name || 'Cliente Sconosciuto'}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${getStatusColor(quote.status || 'draft')}`}>
                        {getStatusLabel(quote.status || 'draft')}
                      </span>
                    </div>
                    <div className="flex mt-4 space-x-8">
                      <div>
                        <p className="text-[9px] uppercase text-gray-300 font-black">Totale</p>
                        <p className="text-lg font-black text-black">€ {formatCurrency(quote.total || 0).replace('€', '').trim()}</p>
                      </div>
                      {quote.eventDate && (
                        <div>
                          <p className="text-[9px] uppercase text-gray-300 font-black">Data Evento</p>
                          <p className="text-lg font-black text-black">{formatDate(quote.eventDate)}</p>
                        </div>
                      )}
                      {quote.expectedPeople && (
                        <div>
                          <p className="text-[9px] uppercase text-gray-300 font-black">Persone</p>
                          <p className="text-lg font-black text-black">{quote.expectedPeople}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-3">
                    <button 
                      onClick={() => handlePrintQuote(quote)} 
                      className="bg-gray-50 p-3 rounded-2xl text-gray-400 border border-gray-100"
                      title="Stampa preventivo"
                    >
                      <Printer size={18} />
                    </button>
                    {onEditQuote && (
                      <button 
                        onClick={() => onEditQuote(quote)} 
                        className="bg-gray-50 p-3 rounded-2xl text-gray-400 border border-gray-100"
                        title="Modifica preventivo"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(quote)} 
                      className="bg-red-50 p-3 rounded-2xl text-red-300 border border-red-50"
                      title="Elimina preventivo"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          variant={confirmModal.variant}
        />

        {/* Alert Modal */}
        <AlertModal
          isOpen={alertModal.isOpen}
          title={alertModal.title}
          message={alertModal.message}
          buttonText={alertModal.buttonText}
          onClose={alertModal.onClose}
          variant={alertModal.variant}
        />
      </div>
    </>
  );
};

export default QuotesHistoryView;
