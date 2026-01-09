import type { VercelRequest, VercelResponse } from '@vercel/node';

// Interfacce
interface FatturaInCloudProduct {
  id: number;
  name: string;
  code?: string;
  net_price: number;
  measure?: string;
}

interface FatturaInCloudItem {
  product?: FatturaInCloudProduct;
  name: string;
  net_price: number;
  qty: number;
  measure?: string;
}

interface FatturaInCloudDocument {
  id: number;
  type: string;
  entity: {
    name: string;
  };
  date: string;
  items_list: FatturaInCloudItem[];
}

interface PriceChange {
  ingrediente: string;
  fornitore: string;
  prezzoVecchio: number;
  prezzoNuovo: number;
  variazione: number;
  dataFattura: string;
}

// Funzione per inviare messaggio Telegram
async function sendTelegramAlert(changes: PriceChange[]): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Telegram credentials mancanti');
    return;
  }

  for (const change of changes) {
    const emoji = change.variazione > 0 ? '📈' : '📉';
    const direction = change.variazione > 0 ? 'AUMENTO' : 'DIMINUZIONE';

    const message = `
${emoji} *${direction} PREZZO*

*Prodotto:* ${change.ingrediente}
*Fornitore:* ${change.fornitore}
*Prezzo precedente:* €${change.prezzoVecchio.toFixed(2)}
*Prezzo nuovo:* €${change.prezzoNuovo.toFixed(2)}
*Variazione:* ${change.variazione > 0 ? '+' : ''}${change.variazione.toFixed(1)}%
*Data fattura:* ${change.dataFattura}
    `.trim();

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
    } catch (error) {
      console.error('Errore invio Telegram:', error);
    }
  }
}

// Funzione per ottenere fatture recenti da Fatture in Cloud
async function getRecentInvoices(): Promise<FatturaInCloudDocument[]> {
  // Supporta sia OAuth (ACCESS_TOKEN) che Token Personale (TOKEN)
  const token = process.env.FATTUREINCLOUD_ACCESS_TOKEN || process.env.FATTUREINCLOUD_TOKEN;

  if (!token) {
    throw new Error('FATTUREINCLOUD_ACCESS_TOKEN o FATTUREINCLOUD_TOKEN non configurato');
  }

  // Verifica che il token non sia vuoto o solo spazi
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.length === 0) {
    throw new Error('Token vuoto o non valido. Verifica la variabile d\'ambiente su Vercel.');
  }

  console.log(`[CheckPrices] Token trovato (lunghezza: ${cleanToken.length} caratteri)`);

  // Ottieni fatture degli ultimi 7 giorni
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFrom = weekAgo.toISOString().split('T')[0];
  const dateTo = today.toISOString().split('T')[0];

  try {
    // Prima ottieni la company_id
    // NOTA: Per token personale, l'endpoint potrebbe essere diverso o richiedere un formato diverso
    console.log('[CheckPrices] Richiesta companies...');
    
    const companiesResponse = await fetch('https://api-v2.fattureincloud.it/user/companies', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const companiesResponseText = await companiesResponse.text();
    console.log(`[CheckPrices] Companies response status: ${companiesResponse.status}`);
    console.log(`[CheckPrices] Companies response body: ${companiesResponseText.substring(0, 500)}`);

    if (!companiesResponse.ok) {
      let errorDetails = `Errore API companies: ${companiesResponse.status}`;
      try {
        const errorJson = JSON.parse(companiesResponseText);
        errorDetails += ` - ${errorJson.error || errorJson.error_description || errorJson.message || JSON.stringify(errorJson)}`;
      } catch {
        errorDetails += ` - ${companiesResponseText.substring(0, 200)}`;
      }
      
      // Messaggi di aiuto specifici per 401 secondo documentazione ufficiale
      // https://developers.fattureincloud.it/docs/authentication/manual-authentication/
      if (companiesResponse.status === 401) {
        errorDetails += '\n\n🔍 GUIDA RISOLUZIONE (secondo documentazione ufficiale):\n\n';
        errorDetails += '1. VERIFICA IL TOKEN:\n';
        errorDetails += '   - Vai su Fatture in Cloud → Impostazioni → Applicazioni collegate\n';
        errorDetails += '   - Clicca su "Gestisci" accanto alla tua app\n';
        errorDetails += '   - Copia il token completo (inizia con "a/")\n';
        errorDetails += '   - Verifica che non ci siano spazi all\'inizio/fine\n\n';
        errorDetails += '2. VERIFICA I PERMESSI DEL TOKEN:\n';
        errorDetails += '   - Clicca su "Modifica" accanto ai permessi\n';
        errorDetails += '   - Seleziona OBBLIGATORIAMENTE:\n';
        errorDetails += '     ✓ situation:r (accesso dashboard/company)\n';
        errorDetails += '     ✓ received_documents:r (lettura documenti ricevuti)\n';
        errorDetails += '   - Salva le modifiche\n\n';
        errorDetails += '3. VERIFICA LE AZIENDE:\n';
        errorDetails += '   - Assicurati di aver selezionato la company corretta quando hai generato il token\n';
        errorDetails += '   - Il token funziona solo per le aziende selezionate\n\n';
        errorDetails += '4. SE SEI SUB-UTENTE (non admin):\n';
        errorDetails += '   - L\'admin deve assegnarti i permessi in:\n';
        errorDetails += '     Impostazioni → Utenti e Permessi\n';
        errorDetails += '   - Devi avere accesso a "Fatture e Doc"\n\n';
        errorDetails += '5. RIGENERA IL TOKEN (se necessario):\n';
        errorDetails += '   - Elimina il token vecchio\n';
        errorDetails += '   - Genera un nuovo token con i permessi corretti\n';
        errorDetails += '   - Aggiorna FATTUREINCLOUD_TOKEN su Vercel\n';
        errorDetails += '   - Fai redeploy';
      }
      
      throw new Error(errorDetails);
    }

    const companiesData = await companiesResponse.json();
    const companyId = companiesData.data?.companies?.[0]?.id;

    if (!companyId) {
      throw new Error('Company ID non trovato');
    }

    // Poi ottieni le fatture passive (acquisti)
    // L'API v2 di Fatture in Cloud richiede POST con body JSON
    // Secondo la documentazione, il body deve contenere i filtri
    const requestBody: any = {
      type: 'invoice'
    };
    
    // Aggiungi filtri data solo se specificati
    if (dateFrom) {
      requestBody.date_from = dateFrom;
    }
    if (dateTo) {
      requestBody.date_to = dateTo;
    }

    console.log(`[CheckPrices] Richiesta fatture per company ${companyId}:`, JSON.stringify(requestBody));
    console.log(`[CheckPrices] Date: ${dateFrom} - ${dateTo}`);

    const invoicesResponse = await fetch(
      `https://api-v2.fattureincloud.it/c/${companyId}/received_documents`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    const responseText = await invoicesResponse.text();
    console.log(`[CheckPrices] Response status: ${invoicesResponse.status}`);
    console.log(`[CheckPrices] Response body: ${responseText.substring(0, 500)}`);

    if (!invoicesResponse.ok) {
      let errorDetails = `Errore API invoices: ${invoicesResponse.status}`;
      try {
        const errorJson = JSON.parse(responseText);
        errorDetails += ` - ${errorJson.error || errorJson.error_description || errorJson.message || JSON.stringify(errorJson)}`;
      } catch {
        errorDetails += ` - ${responseText.substring(0, 200)}`;
      }
      throw new Error(errorDetails);
    }

    const invoicesData = JSON.parse(responseText);
    return invoicesData.data || [];
  } catch (error) {
    console.error('Errore fetch fatture:', error);
    throw error;
  }
}

// Handler principale
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verifica autorizzazione (per cron job Vercel)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Permetti anche chiamate manuali in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    console.log('[CheckPrices] Inizio controllo prezzi...');

    // Ottieni fatture recenti
    const invoices = await getRecentInvoices();
    console.log(`[CheckPrices] Trovate ${invoices.length} fatture recenti`);

    if (invoices.length === 0) {
      return res.status(200).json({
        message: 'Nessuna fattura recente trovata',
        checked: 0,
        alerts: 0
      });
    }

    // Qui dovresti confrontare con il tuo economato
    // Per ora, logghiamo i prodotti trovati
    const priceChanges: PriceChange[] = [];
    const threshold = parseFloat(process.env.PRICE_ALERT_THRESHOLD || '5');

    for (const invoice of invoices) {
      for (const item of invoice.items_list || []) {
        // TODO: Confronta con prezzi salvati in Firebase/economato
        // Per ora logghiamo solo
        console.log(`[CheckPrices] Prodotto: ${item.name}, Prezzo: €${item.net_price}, Fornitore: ${invoice.entity?.name}`);

        // Esempio di come funzionerebbe il confronto:
        // const savedPrice = await getPriceFromEconomato(item.name);
        // if (savedPrice) {
        //   const variation = ((item.net_price - savedPrice) / savedPrice) * 100;
        //   if (Math.abs(variation) >= threshold) {
        //     priceChanges.push({
        //       ingrediente: item.name,
        //       fornitore: invoice.entity?.name || 'Sconosciuto',
        //       prezzoVecchio: savedPrice,
        //       prezzoNuovo: item.net_price,
        //       variazione: variation,
        //       dataFattura: invoice.date
        //     });
        //   }
        // }
      }
    }

    // Invia alert se ci sono variazioni
    if (priceChanges.length > 0) {
      await sendTelegramAlert(priceChanges);
    }

    return res.status(200).json({
      message: 'Controllo completato',
      checked: invoices.length,
      alerts: priceChanges.length,
      changes: priceChanges
    });

  } catch (error) {
    console.error('[CheckPrices] Errore:', error);
    return res.status(500).json({
      error: 'Errore durante il controllo prezzi',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
