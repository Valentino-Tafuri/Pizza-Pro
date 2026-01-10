import { Client } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth } from '../firebase';

/**
 * Fetches clients from Firestore (ricevuti via webhook da Platform)
 * I clienti sono specifici per l'utente loggato: users/{userId}/crmClients
 * @param searchQuery - Optional search query to filter clients by name
 * @param userId - Optional userId (se non fornito, usa l'utente corrente loggato)
 * @returns Array of Client objects
 */
export async function fetchCRMClients(searchQuery?: string, userId?: string): Promise<Client[]> {
  try {
    // Usa userId fornito o quello dell'utente corrente loggato
    let currentUserId = userId;
    if (!currentUserId && auth.currentUser) {
      currentUserId = auth.currentUser.uid;
    }
    
    if (!currentUserId) {
      console.warn('[CRM Service] Nessun userId disponibile, restituisco array vuoto');
      return [];
    }

    // Leggi i clienti salvati in Firestore nella collection dell'utente
    // Struttura: users/{userId}/crmClients
    const clientsRef = collection(db, `users/${currentUserId}/crmClients`);
    
    let q;
    if (searchQuery && searchQuery.trim()) {
      // Per la ricerca, usiamo un filtro sul nome (case insensitive)
      // Nota: Firestore non supporta ricerca case-insensitive nativa,
      // quindi filtriamo dopo aver recuperato i dati
      q = query(clientsRef, orderBy('name'), limit(100));
    } else {
      q = query(clientsRef, orderBy('name'), limit(100));
    }

    const snapshot = await getDocs(q);
    const clients: Client[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      clients.push({
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        postalCode: data.postalCode || data.postal_code || '',
        country: data.country || 'IT',
        vat_number: data.vat_number || data.vat || '',
      });
    });

    // Filtra per ricerca se fornita
    if (searchQuery && searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      return clients.filter(
        (client) =>
          client.name.toLowerCase().includes(queryLower) ||
          client.email?.toLowerCase().includes(queryLower) ||
          client.vat_number?.toLowerCase().includes(queryLower) ||
          client.address?.toLowerCase().includes(queryLower)
      );
    }

    return clients;

  } catch (error) {
    console.error('[CRM Service] Error fetching clients from Firestore:', error);
    
    // Fallback: prova a recuperare via API se il webhook non è ancora configurato
    try {
      console.log('[CRM Service] Tentativo fallback API...');
      return await fetchCRMClientsFromAPI(searchQuery);
    } catch (apiError) {
      console.error('[CRM Service] Errore anche nel fallback API:', apiError);
      throw error; // Restituisci l'errore originale
    }
  }
}

/**
 * Fallback: Fetches clients from the CRM via the Vercel serverless proxy (API diretta)
 * Usa questo se il webhook non è ancora configurato
 */
async function fetchCRMClientsFromAPI(searchQuery?: string): Promise<Client[]> {
  try {
    const baseUrl = '/api/crm/clients';
    const url = searchQuery 
      ? `${baseUrl}?search=${encodeURIComponent(searchQuery)}`
      : baseUrl;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to fetch clients: ${response.statusText}`
      );
    }

    const data = await response.json();
    
    // Handle different response structures
    if (Array.isArray(data)) {
      return data;
    } else if (data.clients && Array.isArray(data.clients)) {
      return data.clients;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }

    console.warn('[CRM Service] Unexpected response structure:', data);
    return [];
  } catch (error) {
    console.error('[CRM Service] Error fetching clients from API:', error);
    throw error;
  }
}

