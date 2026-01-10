import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, MapPin, Mail, Building2, FileText, Save, Loader2 } from 'lucide-react';
import { Client, Quote } from '../../types';
import { fetchCRMClients } from '../../services/crm';
import { saveData } from '../../services/database';
import { Timestamp } from 'firebase/firestore';

interface CreateQuoteViewProps {
  userId: string;
  onSave?: (quote: Quote) => Promise<void>;
}

const CreateQuoteView: React.FC<CreateQuoteViewProps> = ({ userId, onSave }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all clients on mount
  useEffect(() => {
    const loadClients = async () => {
      setIsLoading(true);
      try {
        const fetchedClients = await fetchCRMClients();
        setClients(fetchedClients);
        setFilteredClients(fetchedClients);
      } catch (error) {
        console.error('Error loading clients:', error);
        alert('Errore nel caricamento dei clienti. Verifica la configurazione CRM.');
      } finally {
        setIsLoading(false);
      }
    };
    loadClients();
  }, []);

  // Filter clients based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.vat_number?.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query)
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setSearchQuery(client.name);
    setIsSearchOpen(false);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleSaveDraft = async () => {
    if (!selectedClient) {
      alert('Seleziona un cliente prima di salvare il preventivo.');
      return;
    }

    setIsSaving(true);
    try {
      const draftQuote: Quote = {
        id: `quote_${Date.now()}`,
        clientId: selectedClient.id,
        client: selectedClient,
        status: 'draft',
        items: [],
        subtotal: 0,
        total: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
      };

      // Save to Firestore
      await saveData(userId, 'quotes', draftQuote);

      // Call optional onSave callback
      if (onSave) {
        await onSave(draftQuote);
      }

      alert('✅ Preventivo salvato come bozza con successo!');
      
      // Reset form
      handleClearClient();
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Errore nel salvataggio del preventivo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      {/* Client Selection Section */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
            <User className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
              Selezione Cliente
            </h3>
            <p className="text-sm font-bold text-gray-600">
              Cerca e seleziona un cliente dal CRM
            </p>
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cerca cliente per nome, email, P.IVA o indirizzo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-5 py-5 text-sm font-bold placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            />
            {searchQuery && (
              <button
                onClick={handleClearClient}
                className="absolute right-5 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
              >
                <X size={18} className="text-gray-400" />
              </button>
            )}
          </div>

          {/* Dropdown Results */}
          {isSearchOpen && (
            <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-2" />
                  <p className="text-xs font-bold text-gray-400">Caricamento clienti...</p>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs font-bold text-gray-400">
                    {searchQuery ? 'Nessun cliente trovato' : 'Nessun cliente disponibile'}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {filteredClients.slice(0, 10).map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm uppercase">
                          {client.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-black truncate">{client.name}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {client.vat_number && (
                              <span className="text-[9px] font-black uppercase text-gray-400">
                                P.IVA: {client.vat_number}
                              </span>
                            )}
                            {client.city && (
                              <span className="text-[9px] font-black uppercase text-gray-400">
                                {client.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredClients.length > 10 && (
                    <div className="px-6 py-3 text-center">
                      <p className="text-[9px] font-black uppercase text-gray-300">
                        Mostrati 10 di {filteredClients.length} clienti
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quote Header Card - Shows selected client details */}
      {selectedClient && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2.5rem] p-8 shadow-sm border border-blue-100 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-600/60 mb-1">
                  Dettagli Preventivo
                </h3>
                <p className="text-lg font-black text-black tracking-tight">
                  {selectedClient.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="bg-black text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Salva Bozza</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedClient.address && (
              <div className="flex items-start space-x-3">
                <MapPin className="text-blue-600 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">Indirizzo</p>
                  <p className="text-sm font-bold text-black">{selectedClient.address}</p>
                  {selectedClient.postalCode && selectedClient.city && (
                    <p className="text-xs font-bold text-gray-600 mt-1">
                      {selectedClient.postalCode} {selectedClient.city}
                      {selectedClient.country && selectedClient.country !== 'IT' && `, ${selectedClient.country}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedClient.vat_number && (
              <div className="flex items-start space-x-3">
                <Building2 className="text-blue-600 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">P.IVA / VAT Number</p>
                  <p className="text-sm font-black text-black">{selectedClient.vat_number}</p>
                </div>
              </div>
            )}

            {selectedClient.email && (
              <div className="flex items-start space-x-3">
                <Mail className="text-blue-600 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">Email</p>
                  <p className="text-sm font-bold text-black">{selectedClient.email}</p>
                </div>
              </div>
            )}

            {selectedClient.phone && (
              <div className="flex items-start space-x-3">
                <User className="text-blue-600 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">Telefono</p>
                  <p className="text-sm font-bold text-black">{selectedClient.phone}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-blue-200">
            <p className="text-[8px] font-black uppercase text-blue-600/40 tracking-widest">
              Questo preventivo sarà salvato come bozza. Potrai aggiungere prodotti e finalizzarlo in seguito.
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedClient && !isLoading && (
        <div className="bg-gray-50 rounded-[2.5rem] p-12 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="text-gray-400" size={32} />
          </div>
          <p className="text-sm font-bold text-gray-400">
            Seleziona un cliente per iniziare a creare un preventivo
          </p>
        </div>
      )}
    </div>
  );
};

export default CreateQuoteView;

