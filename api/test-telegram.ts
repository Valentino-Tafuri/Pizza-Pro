import type { VercelRequest, VercelResponse } from '@vercel/node';

// Endpoint per testare l'integrazione Telegram
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(400).json({
      error: 'Configurazione mancante',
      details: 'TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID non configurati'
    });
  }

  const testMessage = `
🧪 *TEST PIZZA PRO ALERT*

Connessione Telegram funzionante!
Il sistema di alert prezzi è attivo.

📊 Soglia alert: ${process.env.PRICE_ALERT_THRESHOLD || 5}%
⏰ Controllo: Giornaliero
  `.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();

    if (data.ok) {
      return res.status(200).json({
        success: true,
        message: 'Messaggio di test inviato su Telegram!'
      });
    } else {
      return res.status(400).json({
        error: 'Errore Telegram API',
        details: data.description
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Errore invio messaggio',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
