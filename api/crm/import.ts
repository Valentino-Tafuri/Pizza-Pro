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
        console.log('[CRM Import] Firebase Admin inizializzato con Service Account');
      } catch (parseError) {
        console.error('[CRM Import] Errore parsing Service Account:', parseError);
        admin.initializeApp({
          projectId: 'pizza-pro-tafuri'
        });
        console.log('[CRM Import] Firebase Admin inizializzato senza credenziali (fallback)');
      }
    } else {
      admin.initializeApp({
        projectId: 'pizza-pro-tafuri'
      });
      console.log('[CRM Import] Firebase Admin inizializzato senza credenziali');
    }
  }
  db = admin.firestore();
  console.log('[CRM Import] Firebase Admin inizializzato correttamente');
} catch (error) {
  console.error('[CRM Import] Errore inizializzazione Firebase Admin:', error);
  db = null;
}

interface PlatformClient {
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
  // Altri campi che Platform potrebbe esportare
  [key: string]: any;
}

/**
 * Endpoint per importare clienti in batch da Platform
 * 
 * POST /api/crm/import
 * Body: {
 *   userId: string, // Firebase User ID
 *   clients: PlatformClient[] // Array di clienti da importare
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, clients } = req.body;

    // Valida userId
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ 
        error: 'Missing userId',
        message: 'userId è obbligatorio nel body della richiesta'
      });
    }

    // Valida clients array
    if (!Array.isArray(clients) || clients.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid clients data',
        message: 'clients deve essere un array non vuoto di oggetti cliente'
      });
    }

    console.log(`[CRM Import] Importazione ${clients.length} clienti per userId: ${userId}`);

    if (!db) {
      console.error('[CRM Import] Firebase Admin non disponibile');
      return res.status(500).json({ 
        error: 'Database not available',
        message: 'Firebase Admin non è configurato correttamente'
      });
    }

    const clientsRef = db.collection(`users/${userId}/crmClients`);
    const batch = db.batch();
    
    let imported = 0;
    let updated = 0;
    let errors: Array<{ index: number; error: string; client: any }> = [];

    // Processa ogni cliente
    for (let i = 0; i < clients.length; i++) {
      const clientData: PlatformClient = clients[i];

      try {
        // Mappa i dati di Platform al formato Client standard
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
          importedAt: admin.firestore.FieldValue.serverTimestamp(),
          userId: userId,
          rawData: clientData, // Salva anche i dati raw per riferimento
        };

        // Aggiungi al batch write
        const clientRef = clientsRef.doc(clientId);
        batch.set(clientRef, {
          ...client,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Conta se nuovo o aggiornato (non possiamo saperlo prima, quindi assumiamo aggiornato)
        updated++;

      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          client: clientData
        });
      }
    }

    // Esegui il batch write
    try {
      await batch.commit();
      imported = updated - errors.length;
      
      console.log(`[CRM Import] Importati ${imported} clienti, ${errors.length} errori per userId: ${userId}`);

      return res.status(200).json({
        success: true,
        message: `Importazione completata`,
        stats: {
          total: clients.length,
          imported,
          updated,
          errors: errors.length
        },
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (batchError) {
      console.error('[CRM Import] Errore batch write:', batchError);
      return res.status(500).json({
        error: 'Batch write failed',
        message: batchError instanceof Error ? batchError.message : 'Unknown error',
        stats: {
          total: clients.length,
          imported: 0,
          updated: 0,
          errors: clients.length
        },
        errors: errors
      });
    }

  } catch (error) {
    console.error('[CRM Import] Errore elaborazione import:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

