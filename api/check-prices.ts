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
  const token = process.env.FATTUREINCLOUD_TOKEN;

  if (!token) {
    throw new Error('FATTUREINCLOUD_TOKEN non configurato');
  }

  // Ottieni fatture degli ultimi 7 giorni
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFrom = weekAgo.toISOString().split('T')[0];
  const dateTo = today.toISOString().split('T')[0];

  try {
    // Prima ottieni la company_id
    const companiesResponse = await fetch('https://api-v2.fattureincloud.it/user/companies', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!companiesResponse.ok) {
      throw new Error(`Errore API companies: ${companiesResponse.status}`);
    }

    const companiesData = await companiesResponse.json();
    const companyId = companiesData.data?.companies?.[0]?.id;

    if (!companyId) {
      throw new Error('Company ID non trovato');
    }

    // Poi ottieni le fatture passive (acquisti)
    const invoicesResponse = await fetch(
      `https://api-v2.fattureincloud.it/c/${companyId}/received_documents?type=invoice&date_from=${dateFrom}&date_to=${dateTo}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!invoicesResponse.ok) {
      throw new Error(`Errore API invoices: ${invoicesResponse.status}`);
    }

    const invoicesData = await invoicesResponse.json();
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
