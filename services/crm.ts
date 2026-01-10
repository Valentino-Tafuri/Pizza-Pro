import { Client } from '../types';

/**
 * Fetches clients from the CRM via the Vercel serverless proxy
 * @param searchQuery - Optional search query to filter clients by name
 * @returns Array of Client objects
 */
export async function fetchCRMClients(searchQuery?: string): Promise<Client[]> {
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
    console.error('[CRM Service] Error fetching clients:', error);
    throw error;
  }
}

