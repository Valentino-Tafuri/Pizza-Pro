import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Inizializza Firebase Admin (se non già inizializzato)
let db: admin.firestore.Firestore | null = null;

try {
  const apps = admin.apps || [];
  if (apps.length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'pizza-pro-tafuri'
        });
        console.log('[CRM Webhook] Firebase Admin inizializzato con Service Account');
      } catch (parseError) {
        console.error('[CRM Webhook] Errore parsing Service Account:', parseError);
        admin.initializeApp({
          projectId: 'pizza-pro-tafuri'
        });
        console.log('[CRM Webhook] Firebase Admin inizializzato senza credenziali (fallback)');
      }
    } else {
      admin.initializeApp({
        projectId: 'pizza-pro-tafuri'
      });
      console.log('[CRM Webhook] Firebase Admin inizializzato senza credenziali');
    }
  }
  db = admin.firestore();
  console.log('[CRM Webhook] Firebase Admin inizializzato correttamente');
} catch (error) {
  console.error('[CRM Webhook] Errore inizializzazione Firebase Admin:', error);
  db = null;
}

interface PlatformWebhookData {
  // Struttura dati che Platform invia via webhook
  // Adatta in base ai dati effettivi che Platform invia
  id?: string;
  client_id?: string;
  name?: string;
  company_name?: string;
  business_name?: string;
  email?: string;
  email_address?: string;
  phone?: string;
  phone_number?: string;
  telephone?: string;
  address?: string;
  street_address?: string;
  full_address?: string;
  city?: string;
  vat_number?: string;
  vat?: string;
  piva?: string;
  tax_id?: string;
  postal_code?: string;
  postcode?: string;
  zip_code?: string;
  country?: string;
  country_code?: string;
  // Altri campi che Platform potrebbe inviare
  [key: string]: any;
}

/**
 * Endpoint Webhook per ricevere clienti da Platform CRM
 * 
 * IMPORTANTE: Ogni utente deve configurare un URL webhook unico con il proprio userId!
 * 
 * URL formato: https://tuo-progetto.vercel.app/api/crm/webhook?userId=USER_ID_DELL_UTENTE
 * 
 * Dove USER_ID_DELL_UTENTE è il Firebase UID dell'utente loggato
 * 
 * Configura questo URL in Platform → Marketing → Automazioni per ogni utente
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo POST requests (webhook ricevono POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // IMPORTANTE: Estrai userId dall'URL (query parameter)
    // L'URL deve essere: /api/crm/webhook?userId=USER_ID
    const userId = req.query.userId as string | undefined;
    
    if (!userId) {
      console.error('[CRM Webhook] userId mancante nell\'URL');
      return res.status(400).json({ 
        error: 'Missing userId',
        message: 'L\'URL del webhook deve includere il parametro userId. Esempio: /api/crm/webhook?userId=USER_ID',
        instructions: [
          '1. Vai su Firebase Console e trova il tuo User ID (uid)',
          '2. Configura il webhook URL su Platform come:',
          '   https://pizza-pro-pink.vercel.app/api/crm/webhook?userId=TUO_USER_ID',
          '3. Sostituisci TUO_USER_ID con il tuo Firebase User ID reale'
        ]
      });
    }

    const webhookSecret = process.env.CRM_API_KEY; // Chiave API per validare il webhook
    const data = req.body;

    console.log('[CRM Webhook] Ricevuto webhook da Platform per userId:', userId);
    console.log('[CRM Webhook] Payload:', JSON.stringify(data).substring(0, 200));

    // Valida il webhook se necessario (alcuni webhook includono un header di autenticazione)
    // Platform potrebbe inviare l'autenticazione in diversi modi
    const authHeader = req.headers.authorization;
    const xWebhookSecret = req.headers['x-webhook-secret'] as string;
    const xApiKey = req.headers['x-api-key'] as string;

    // Verifica autenticazione (adatta in base a come Platform autentica i webhook)
    if (webhookSecret) {
      const isValid = 
        (authHeader && authHeader === `Bearer ${webhookSecret}`) ||
        (xWebhookSecret && xWebhookSecret === webhookSecret) ||
        (xApiKey && xApiKey === webhookSecret);

      if (!isValid) {
        console.warn('[CRM Webhook] Autenticazione fallita o non fornita');
        // Per ora accettiamo comunque il webhook, ma puoi attivare la validazione se necessario
        // return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Estrai i dati del cliente dal payload di Platform
    // La struttura dipende da come Platform invia i dati
    const clientData: PlatformWebhookData = data;

    // Mappa i dati di Platform al formato Client standard
    const client = {
      id: clientData.id || clientData.client_id || `platform_${Date.now()}`,
      name: clientData.name || clientData.company_name || clientData.business_name || '',
      email: clientData.email || clientData.email_address || '',
      phone: clientData.phone || clientData.phone_number || clientData.telephone || '',
      address: clientData.address || clientData.street_address || clientData.full_address || '',
      city: clientData.city || '',
      postalCode: clientData.postal_code || clientData.postcode || clientData.zip_code || '',
      country: clientData.country || clientData.country_code || 'IT',
      vat_number: clientData.vat_number || clientData.vat || clientData.piva || clientData.tax_id || '',
      // Metadati aggiuntivi
      source: 'platform_webhook',
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      rawData: clientData, // Salva anche i dati raw per riferimento
    };

    // Valida che ci siano dati minimi (almeno il nome o email)
    if (!client.name && !client.email) {
      console.warn('[CRM Webhook] Dati cliente incompleti, ignorato:', client);
      return res.status(400).json({ 
        error: 'Invalid data',
        message: 'Client data must include at least name or email'
      });
    }

    // Salva il cliente in Firestore nella collection dell'utente specifico
    // Struttura: users/{userId}/crmClients/{clientId}
    if (db) {
      const clientsRef = db.collection(`users/${userId}/crmClients`);
      
      // Usa l'ID come documento ID per evitare duplicati
      await clientsRef.doc(client.id).set({
        ...client,
        userId: userId, // Aggiungi userId per riferimento
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }); // merge: true per aggiornare se esiste già

      console.log('[CRM Webhook] Cliente salvato in Firestore per userId:', userId, 'cliente:', client.id, client.name);
    } else {
      console.error('[CRM Webhook] Firebase Admin non disponibile, impossibile salvare');
      return res.status(500).json({ 
        error: 'Database not available',
        message: 'Firebase Admin non è configurato correttamente'
      });
    }

    // Risposta positiva a Platform
    return res.status(200).json({ 
      success: true,
      message: 'Client received and saved',
      clientId: client.id
    });

  } catch (error) {
    console.error('[CRM Webhook] Errore elaborazione webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

