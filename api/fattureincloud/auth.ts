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

  // Genera URL di autorizzazione Fatture in Cloud
  // Secondo la documentazione: https://developers.fattureincloud.it/docs/basics/scopes/
  // IMPORTANTE: Gli scope devono essere PRIMA configurati nell'app su Fatture in Cloud
  // Poi possono essere passati nella richiesta (opzionale, se già configurati nell'app)
  const authUrl = new URL('https://api-v2.fattureincloud.it/oauth/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  
  // Scope necessari per questa app (secondo documentazione ufficiale)
  // NOTA: Questi scope DEVONO essere configurati nell'app su Fatture in Cloud PRIMA
  // Vai su: Impostazioni → Applicazioni collegate → La tua app → Gestisci → Modifica permessi
  // Seleziona:
  // - received_documents:r (lettura documenti ricevuti)
  // - situation:r (accesso dashboard/company)
  const scopes = [
    'received_documents:r',  // Lettura fatture passive (acquisti)
    'situation:r'            // Accesso a informazioni dashboard/company
  ].join(' ');
  
  // Passa gli scope nella richiesta (devono corrispondere a quelli configurati nell'app)
  authUrl.searchParams.set('scope', scopes);

  // Redirect all'autorizzazione
  return res.redirect(302, authUrl.toString());
}
