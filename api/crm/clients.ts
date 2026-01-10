import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CRMClient {
  id: string;
  name: string;
  address?: string;
  email?: string;
  vat_number?: string;
  phone?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

/**
 * Vercel Serverless Function to proxy CRM client requests (Platform CRM)
 * This keeps the API key secure on the server side
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get credentials from environment variables
  // CRM_API_KEY: Il codice/token che ti ha fornito Platform CRM per i webhook
  // CRM_WEBHOOK_LOCATION: 
  //   - Se fornito: URL completo dell'endpoint (es. https://api.platform.com/v1/clients)
  //   - Opzionale: Se non fornito, usa solo il codice nel webhook configurato in Platform
  const apiKey = process.env.CRM_API_KEY;
  let webhookLocation = process.env.CRM_WEBHOOK_LOCATION;

  // Se manca il codice, è obbligatorio
  if (!apiKey) {
    console.error('[CRM Platform] Missing CRM_API_KEY');
    return res.status(500).json({ 
      error: 'CRM configuration missing',
      message: 'CRM_API_KEY (il codice webhook che ti ha fornito Platform) deve essere configurato in Vercel'
    });
  }

  // Se manca l'URL, proviamo a costruirlo dal webhook o usiamo un endpoint standard
  // Il codice webhook potrebbe essere sufficiente se Platform ha già configurato l'endpoint
  if (!webhookLocation) {
    console.warn('[CRM Platform] CRM_WEBHOOK_LOCATION non configurato, usando solo codice webhook');
    // Potresti dover configurare l'URL webhook direttamente in Platform CRM
    // e usare solo il codice per autenticarti
  }

  try {
    // Optional: Get search query parameter
    const searchQuery = req.query.search as string | undefined;
    
    // Construct the Platform CRM API endpoint
    // Se il webhook è già configurato in Platform, potrebbe bastare il codice
    // Altrimenti costruiamo l'URL dall'endpoint fornito
    
    let apiUrl: string;
    
    if (!webhookLocation) {
      // Se non c'è URL, il webhook potrebbe essere già configurato in Platform
      // In questo caso, usa il codice per fare richieste all'endpoint webhook di Platform
      // NOTA: Potresti dover configurare l'URL webhook direttamente nel pannello Platform
      return res.status(500).json({
        error: 'Webhook URL not configured',
        message: 'Configura CRM_WEBHOOK_LOCATION con l\'URL dell\'endpoint webhook configurato in Platform, oppure configura l\'endpoint nel pannello Platform CRM'
      });
    }
    
    // Se l'URL termina con /clients o contiene già l'endpoint, usalo direttamente
    if (webhookLocation.includes('/clients') || webhookLocation.includes('/contacts') || webhookLocation.includes('/customers')) {
      apiUrl = webhookLocation;
    } else {
      // Altrimenti aggiungi /clients all'URL base
      apiUrl = `${webhookLocation.replace(/\/$/, '')}/clients`;
    }
    
    // Aggiungi parametro di ricerca se fornito
    if (searchQuery) {
      const url = new URL(apiUrl);
      // Prova diversi parametri di ricerca comuni
      url.searchParams.append('search', searchQuery);
      // Alternative: 'q', 'query', 'filter', 'name'
      apiUrl = url.toString();
    }

    console.log('[CRM Platform] Fetching clients from:', apiUrl);
    console.log('[CRM Platform] Using Webhook Code:', apiKey.substring(0, 4) + '...');

    // Fetch clients from Platform CRM
    // Il codice webhook può essere usato in diversi modi:
    // 1. Header Authorization Bearer (più comune per webhook)
    // 2. Header X-Webhook-Secret o X-Webhook-Token
    // 3. Header X-API-Key
    // 4. Query parameter ?webhook_secret=... o ?token=...
    // Proviamo diversi metodi comuni per webhook
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`, // Metodo più comune
        'X-Webhook-Secret': apiKey, // Alcuni webhook usano questo header
        'X-Webhook-Token': apiKey, // Alternativa
        'X-API-Key': apiKey, // Altra alternativa
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[CRM] API error:', response.status, response.statusText);
      return res.status(response.status).json({
        error: 'CRM API error',
        status: response.status,
        message: response.statusText
      });
    }

    const data = await response.json();

    // Transform CRM response to match our Client interface
    // Adjust this transformation based on your CRM's response structure
    let clients: CRMClient[] = [];
    
    if (Array.isArray(data)) {
      clients = data;
    } else if (data.clients && Array.isArray(data.clients)) {
      clients = data.clients;
    } else if (data.data && Array.isArray(data.data)) {
      clients = data.data;
    } else {
      console.warn('[CRM] Unexpected response structure:', data);
      clients = [];
    }

    // Map CRM fields to our Client interface
    const mappedClients = clients.map((client: any) => ({
      id: client.id || client.client_id || client._id || String(Date.now()),
      name: client.name || client.company_name || client.business_name || '',
      address: client.address || client.street_address || client.full_address || '',
      email: client.email || client.email_address || '',
      vat_number: client.vat_number || client.vat || client.piva || client.tax_id || '',
      phone: client.phone || client.phone_number || client.telephone || '',
      city: client.city || '',
      postalCode: client.postal_code || client.postcode || client.zip_code || '',
      country: client.country || client.country_code || 'IT',
    })).filter((client: CRMClient) => client.name); // Filter out clients without name

    console.log(`[CRM] Successfully fetched ${mappedClients.length} clients`);

    return res.status(200).json({
      clients: mappedClients,
      count: mappedClients.length
    });

  } catch (error) {
    console.error('[CRM] Error fetching clients:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
