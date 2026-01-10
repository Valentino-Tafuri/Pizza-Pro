/**
 * Script di test per verificare la configurazione CRM
 * 
 * Come usare:
 * 1. Configura le variabili d'ambiente su Vercel
 * 2. Dopo il deploy, visita: https://tuo-progetto.vercel.app/api/crm/test-clients
 * 
 * Questo endpoint testa la connessione al CRM senza esporre credenziali sensibili
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.CRM_API_KEY;
  const webhookLocation = process.env.CRM_WEBHOOK_LOCATION;

  // Test configurazione
  const config = {
    hasApiKey: !!apiKey,
    hasWebhookLocation: !!webhookLocation,
    webhookLocation: webhookLocation || 'NOT CONFIGURED',
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET'
  };

  // Se non configurato, restituisci solo lo stato
  if (!apiKey || !webhookLocation) {
    return res.status(200).json({
      status: 'configuration_missing',
      message: 'Le variabili d\'ambiente non sono configurate. Configura CRM_API_KEY e CRM_WEBHOOK_LOCATION su Vercel.',
      config: {
        hasApiKey: config.hasApiKey,
        hasWebhookLocation: config.hasWebhookLocation
      },
      nextSteps: [
        '1. Vai su Vercel Dashboard → Settings → Environment Variables',
        '2. Aggiungi CRM_API_KEY con la tua chiave API',
        '3. Aggiungi CRM_WEBHOOK_LOCATION con l\'URL dell\'endpoint CRM',
        '4. Riedploya l\'applicazione'
      ]
    });
  }

  // Prova a connettersi al CRM
  try {
    console.log('[CRM Test] Tentativo di connessione a:', webhookLocation);

    const response = await fetch(webhookLocation, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    const status = response.status;
    const statusText = response.statusText;
    const headers = Object.fromEntries(response.headers.entries());

    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = await response.text();
    }

    if (!response.ok) {
      return res.status(200).json({
        status: 'connection_error',
        message: `Il CRM ha restituito un errore: ${status} ${statusText}`,
        config: {
          ...config,
          testUrl: webhookLocation
        },
        response: {
          status,
          statusText,
          headers,
          data: responseData
        },
        suggestions: {
          '401': 'La API Key potrebbe essere errata o scaduta',
          '403': 'La API Key non ha i permessi necessari',
          '404': 'L\'URL dell\'endpoint potrebbe essere errato',
          '500': 'Errore sul server CRM - contatta il supporto del CRM'
        }
      });
    }

    // Successo!
    return res.status(200).json({
      status: 'success',
      message: 'Connessione al CRM riuscita! 🎉',
      config: {
        ...config,
        testUrl: webhookLocation
      },
      response: {
        status,
        statusText,
        dataPreview: Array.isArray(responseData) 
          ? `Array con ${responseData.length} elementi`
          : typeof responseData === 'object'
          ? `Oggetto con ${Object.keys(responseData).length} chiavi`
          : `Tipo: ${typeof responseData}`,
        firstItem: Array.isArray(responseData) && responseData.length > 0
          ? responseData[0]
          : typeof responseData === 'object'
          ? responseData
          : null
      },
      nextSteps: [
        '✅ La configurazione è corretta!',
        'Ora puoi usare il modulo Preventivi nell\'app',
        'I clienti verranno caricati automaticamente dal CRM'
      ]
    });

  } catch (error) {
    return res.status(200).json({
      status: 'connection_failed',
      message: 'Impossibile connettersi al CRM',
      config: {
        ...config,
        testUrl: webhookLocation
      },
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      suggestions: [
        'Verifica che l\'URL del CRM sia corretto e raggiungibile',
        'Controlla che il CRM accetti richieste da Vercel (firewall, CORS)',
        'Verifica che il formato della API Key sia corretto',
        'Controlla i log di Vercel per maggiori dettagli'
      ]
    });
  }
}

