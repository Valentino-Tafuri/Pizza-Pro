import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import axios from 'axios';

// Inizializza Firebase Admin se non già inizializzato
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// --- CONFIGURAZIONE ---
// I tuoi token sono già inseriti qui sotto
const FIC_API_TOKEN = 'a/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZWYiOiJGb0txUXlvS1doajlUeGN0bFdDTlNZN1E2SVprUHFoSSJ9.XRKVmFGweqbVDj_MZT9fHp-nPvZ0Uy4tlkQKZ7g6Ufw';
const FIC_COMPANY_ID = '1170597';
const TELEGRAM_BOT_TOKEN = '8584110756:AAG54kP34VVJM0pIQRbAUtHlO0R1SwNIXwI';

/**
 * Helper function per inviare messaggi Telegram
 */
async function sendTelegram(chatId: string, text: string): Promise<void> {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Errore invio Telegram:', error);
    // Non blocchiamo l'esecuzione se Telegram fallisce
  }
}

/**
 * Cloud Function che controlla i prezzi delle fatture ogni ora
 */
export const checkInvoicePrices = functions.pubsub.schedule('every 60 minutes').onRun(async (context: functions.EventContext) => {
  console.log('[checkInvoicePrices] Avvio controllo prezzi fatture...');

  try {
    // STEP A: Recupera tutti gli utenti dal database
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('[checkInvoicePrices] Nessun utente trovato');
      return null;
    }

    // Data di oggi in formato YYYY-MM-DD
    const today = new Date();
    // Se serve gestire il fuso orario, puoi decommentare la riga sotto:
    // today.setHours(today.getHours() + 1); 
    const todayStr = today.toISOString().split('T')[0];

    console.log(`[checkInvoicePrices] Controllo fatture del ${todayStr}`);

    // STEP B: Chiama l'API Fatture in Cloud
    const ficUrl = `https://api-v2.fattureincloud.it/c/${FIC_COMPANY_ID}/received_documents`;
    
    // USIAMO <any> PER EVITARE ERRORI TYPESCRIPT SULLA RISPOSTA
    const ficResponse = await axios.get<any>(ficUrl, {
      headers: {
        'Authorization': `Bearer ${FIC_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        type: 'expense',
        date: todayStr, // Cerca solo le fatture con data documento di OGGI
        fieldset: 'detailed'
      }
    });

    const invoices = ficResponse.data?.data || [];
    console.log(`[checkInvoicePrices] Trovate ${invoices.length} fatture per oggi`);

    // Processa ogni utente
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const telegramChatId = userData.telegramChatId;

      if (!telegramChatId) {
        console.log(`[checkInvoicePrices] Utente ${userId} non ha telegramChatId configurato, skip`);
        continue;
      }

      // STEP C: Loop su ogni fattura e ogni riga articolo
      for (const invoice of invoices) {
        // Cast esplicito <any[]> per evitare errori se items manca o ha struttura strana
        const items: any[] = invoice.items || [];
        
        for (const item of items) {
          const itemName = item.name || '';
          const itemQuantity = parseFloat(item.qty) || 1;
          const itemNetAmount = parseFloat(item.net_amount) || 0;
          
          // Calcola prezzo unitario
          const prezzoUnitario = itemQuantity > 0 ? itemNetAmount / itemQuantity : 0;
          
          // Pulisci il nome articolo
          const nomePulito = itemName.trim().toLowerCase();
          
          if (!nomePulito) {
            continue;
          }

          // STEP D: Cerca l'articolo nel database Firestore
          // NOTA BENE: Qui cerchiamo nella collection 'ingredients' dentro l'utente
          const ingredientsRef = db.collection(`users/${userId}/ingredients`);
          
          const ingredientsSnapshot = await ingredientsRef
            .where('nomi_fornitori', 'array-contains', nomePulito)
            .limit(1)
            .get();

          // STEP E: Decisione
          if (ingredientsSnapshot.empty) {
            // Caso 1: Articolo NON ESISTE -> Avviso "Nuovo articolo"
            const message = `⚠️ <b>Nuovo articolo non mappato</b>\n\n` +
                          `📦 Articolo: <b>${itemName}</b>\n` +
                          `💰 Prezzo unitario: €${prezzoUnitario.toFixed(2)}\n` +
                          `📄 Fattura: ${invoice.num || 'N/A'}\n` +
                          `📅 Data: ${todayStr}`;
            
            await sendTelegram(telegramChatId, message);
            console.log(`[checkInvoicePrices] Articolo non mappato notificato: ${itemName}`);
          } else {
            // Caso 2: Articolo ESISTE -> Controllo differenza prezzo
            const ingredientDoc = ingredientsSnapshot.docs[0];
            const ingredientData = ingredientDoc.data();
            
            // Cerchiamo il prezzo nel DB (gestiamo vari nomi possibili del campo prezzo)
            const prezzoDB = parseFloat(ingredientData.pricePerUnit || ingredientData.prezzo_ultimo || ingredientData.price || 0);
            
            const differenza = Math.abs(prezzoUnitario - prezzoDB);
            
            // Soglia di tolleranza (es. 5 centesimi)
            if (differenza > 0.05 && prezzoDB > 0) {
              const message = `📊 <b>Prezzo cambiato</b>\n\n` +
                            `📦 Articolo: <b>${itemName}</b>\n` +
                            `💰 Prezzo DB: €${prezzoDB.toFixed(2)}\n` +
                            `💰 Prezzo Fattura: €${prezzoUnitario.toFixed(2)}\n` +
                            `📈 Differenza: €${differenza.toFixed(2)}\n` +
                            `📄 Fattura: ${invoice.num || 'N/A'}\n` +
                            `📅 Data: ${todayStr}`;
              
              await sendTelegram(telegramChatId, message);
              console.log(`[checkInvoicePrices] Prezzo cambiato notificato: ${itemName} (diff: €${differenza.toFixed(2)})`);
            }
          }
        }
      }
    }

    console.log('[checkInvoicePrices] Controllo completato con successo');
    return null;
  } catch (error) {
    console.error('[checkInvoicePrices] Errore durante il controllo:', error);
    return null;
  }
});