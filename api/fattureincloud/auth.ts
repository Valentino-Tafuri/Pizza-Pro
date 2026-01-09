import type { VercelRequest, VercelResponse } from '@vercel/node';

// Endpoint per iniziare il flow OAuth con Fatture in Cloud
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.FATTUREINCLOUD_CLIENT_ID;
  const redirectUri = process.env.FATTUREINCLOUD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: 'Configurazione mancante',
      details: 'FATTUREINCLOUD_CLIENT_ID o FATTUREINCLOUD_REDIRECT_URI non configurati'
    });
  }

  // Scope necessari per leggere fatture passive
  const scopes = [
    'entity:r',           // Lettura anagrafica
    'received_documents:r' // Lettura documenti ricevuti (fatture passive)
  ];

  // Genera URL di autorizzazione Fatture in Cloud
  const authUrl = new URL('https://api-v2.fattureincloud.it/oauth/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes.join(' '));

  // Redirect all'autorizzazione
  return res.redirect(302, authUrl.toString());
}
