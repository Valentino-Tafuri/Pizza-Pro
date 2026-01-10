import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, Edit2, Download, Calendar, X, FileText, Printer, Eye } from 'lucide-react';
import { Quote, Client } from '../../types';
import { syncData } from '../../services/database';
import { Timestamp } from 'firebase/firestore';

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

  const handlePrintQuote = (quote: Quote) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Impossibile aprire la finestra di stampa. Verifica che i popup non siano bloccati.');
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

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-black mb-2">Storico Preventivi</h1>
            <p className="text-sm text-gray-500">Visualizza e gestisci tutti i preventivi salvati</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cerca per cliente, email, P.IVA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-gray-300 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedStatus(null)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                selectedStatus === null
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setSelectedStatus('draft')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                selectedStatus === 'draft'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Bozze
            </button>
            <button
              onClick={() => setSelectedStatus('sent')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                selectedStatus === 'sent'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Inviati
            </button>
            <button
              onClick={() => setSelectedStatus('accepted')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                selectedStatus === 'accepted'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Accettati
            </button>
          </div>
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
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-base uppercase shadow-sm">
                      {quote.client?.name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-black mb-1">
                        {quote.client?.name || 'Cliente Sconosciuto'}
                      </h3>
                      <div className="flex items-center gap-4 flex-wrap">
                        {quote.eventDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={12} />
                            <span>{formatDate(quote.eventDate)}</span>
                          </div>
                        )}
                        {quote.expectedPeople && (
                          <span className="text-xs text-gray-500">
                            {quote.expectedPeople} persone
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-black ${getStatusColor(
                            quote.status || 'draft'
                          )}`}
                        >
                          {getStatusLabel(quote.status || 'draft')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-4">
                    <div>
                      <span className="text-xs font-black uppercase text-gray-400">Totale</span>
                      <p className="text-xl font-black text-black mt-1">
                        {formatCurrency(quote.total || 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase text-gray-400">Creato il</span>
                      <p className="text-sm font-bold text-gray-600 mt-1">
                        {formatDate(quote.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handlePrintQuote(quote)}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    title="Stampa preventivo"
                  >
                    <Printer size={18} className="text-gray-700" />
                  </button>
                  {onEditQuote && (
                    <button
                      onClick={() => onEditQuote(quote)}
                      className="p-3 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors"
                      title="Modifica preventivo"
                    >
                      <Edit2 size={18} className="text-blue-700" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuotesHistoryView;
