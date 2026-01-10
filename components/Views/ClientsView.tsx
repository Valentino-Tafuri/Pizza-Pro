import React, { useState, useEffect, useRef } from 'react';
import { Search, MoreVertical, Edit2, User, Trash2, Download, Mail, Phone, Calendar, X } from 'lucide-react';
import { Client } from '../../types';
import { fetchCRMClients } from '../../services/crm';
import { deleteData } from '../../services/database';

interface ClientsViewProps {
  userId: string;
  onClientSelect?: (client: Client) => void;
}

const ClientsView: React.FC<ClientsViewProps> = ({ userId, onClientSelect }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Carica clienti all'avvio
  useEffect(() => {
    const loadClients = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const fetchedClients = await fetchCRMClients(undefined, userId);
        setClients(fetchedClients);
        setFilteredClients(fetchedClients);
      } catch (error) {
        console.error('Error loading clients:', error);
        alert('Errore nel caricamento dei clienti.');
      } finally {
        setIsLoading(false);
      }
    };
    loadClients();
  }, [userId]);

  // Filtra clienti in base alla ricerca
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
        client.phone?.toLowerCase().includes(query) ||
        client.vat_number?.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query)
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  // Chiudi menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        const menuElement = menuRefs.current[openMenuId];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleDelete = async (client: Client) => {
    if (!userId) return;
    
    if (!confirm(`Sei sicuro di voler eliminare il cliente "${client.name}"?`)) {
      return;
    }

    try {
      await deleteData(userId, 'crmClients', client.id);
      setClients(prev => prev.filter(c => c.id !== client.id));
      setFilteredClients(prev => prev.filter(c => c.id !== client.id));
      setOpenMenuId(null);
      alert('✅ Cliente eliminato con successo!');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('❌ Errore nell\'eliminazione del cliente.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'Telefono', 'Indirizzo', 'Città', 'P.IVA'];
    const rows = filteredClients.map(client => [
      client.name || '',
      client.email || '',
      client.phone || '',
      client.address || '',
      client.city || '',
      client.vat_number || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clienti_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShowDetails = (client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
    setOpenMenuId(null);
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      {/* Header con Statistiche e Esporta */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
              Database Clienti
            </h3>
            <p className="text-lg font-black text-black tracking-tight">
              {filteredClients.length > 0 
                ? `Sono stati trovati ${filteredClients.length} record`
                : 'Nessun cliente trovato'
              }
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={filteredClients.length === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span>Esporta</span>
          </button>
        </div>

        {/* Barra di Ricerca */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cerca cliente per nome, email, telefono, P.IVA o indirizzo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-5 py-5 text-sm font-bold placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* Tabella Clienti */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-400">Caricamento clienti...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="text-gray-300" size={32} />
            </div>
            <h3 className="text-lg font-black text-black mb-2">Nessun cliente trovato</h3>
            <p className="text-sm font-semibold text-gray-400">
              {searchQuery ? 'Prova con un altro termine di ricerca' : 'Importa clienti da Platform o configura il webhook'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">
                    Telefono
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">
                    Ultima visita
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm uppercase flex-shrink-0">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-black">{client.name}</p>
                          {client.city && (
                            <p className="text-xs text-gray-400 font-semibold">{client.city}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.email ? (
                        <div className="flex items-center space-x-2">
                          <Mail size={14} className="text-gray-400" />
                          <span className="text-sm font-bold text-gray-700">{client.email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.phone ? (
                        <div className="flex items-center space-x-2">
                          <Phone size={14} className="text-gray-400" />
                          <span className="text-sm font-bold text-gray-700">{client.phone}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">
                          {client.updatedAt || client.importedAt ? formatDate(client.updatedAt || client.importedAt) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === client.id ? null : client.id)}
                          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          <MoreVertical size={18} className="text-gray-400" />
                        </button>
                        
                        {openMenuId === client.id && (
                          <div
                            ref={(el) => (menuRefs.current[client.id] = el)}
                            className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50"
                          >
                            <button
                              onClick={() => handleShowDetails(client)}
                              className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                            >
                              <User size={16} className="text-gray-400" />
                              <span>Dettagli contatto</span>
                            </button>
                            {onClientSelect && (
                              <button
                                onClick={() => {
                                  onClientSelect(client);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                              >
                                <Edit2 size={16} className="text-gray-400" />
                                <span>Usa per Preventivo</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(client)}
                              className="w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                            >
                              <Trash2 size={16} className="text-red-400" />
                              <span>Elimina contatto</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dettagli Cliente */}
      {showDetailsModal && selectedClient && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl uppercase">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter text-black">{selectedClient.name}</h3>
                  {selectedClient.vat_number && (
                    <p className="text-xs font-black uppercase text-gray-400 tracking-widest mt-1">
                      P.IVA: {selectedClient.vat_number}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedClient.email && (
                <div className="flex items-start space-x-3">
                  <Mail className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">Email</p>
                    <p className="text-sm font-black text-black">{selectedClient.email}</p>
                  </div>
                </div>
              )}

              {selectedClient.phone && (
                <div className="flex items-start space-x-3">
                  <Phone className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">Telefono</p>
                    <p className="text-sm font-black text-black">{selectedClient.phone}</p>
                  </div>
                </div>
              )}

              {selectedClient.address && (
                <div className="flex items-start space-x-3 md:col-span-2">
                  <Calendar className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">Indirizzo</p>
                    <p className="text-sm font-black text-black">{selectedClient.address}</p>
                    {(selectedClient.postalCode || selectedClient.city) && (
                      <p className="text-xs font-bold text-gray-600 mt-1">
                        {selectedClient.postalCode && `${selectedClient.postalCode} `}
                        {selectedClient.city}
                        {selectedClient.country && selectedClient.country !== 'IT' && `, ${selectedClient.country}`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(selectedClient.updatedAt || selectedClient.importedAt) && (
                <div className="flex items-start space-x-3">
                  <Calendar className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-[9px] font-black uppercase text-blue-600/60 mb-1">Ultimo Aggiornamento</p>
                    <p className="text-sm font-black text-black">
                      {formatDate(selectedClient.updatedAt || selectedClient.importedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-4">
              {onClientSelect && (
                <button
                  onClick={() => {
                    onClientSelect(selectedClient);
                    setShowDetailsModal(false);
                  }}
                  className="flex-1 bg-black text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all"
                >
                  Usa per Preventivo
                </button>
              )}
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-200 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsView;

