import type { VercelRequest, VercelResponse } from '@vercel/node';

// Endpoint callback per OAuth Fatture in Cloud
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Log per debug
  console.log('[OAuth Callback] Query params:', JSON.stringify(req.query));
  console.log('[OAuth Callback] Method:', req.method);
  console.log('[OAuth Callback] URL:', req.url);

  const { code, error, error_description, state } = req.query;

  // Gestisci errori da Fatture in Cloud
  if (error) {
    const errorMsg = error_description || error;
    let helpfulMessage = errorMsg;
    
    // Messaggio più utile per errore scope
    if (errorMsg.includes('scope') || errorMsg.includes('Scope')) {
      helpfulMessage = `❌ SCOPE NON VALIDI - Guida risoluzione:

1. Vai su Fatture in Cloud → Impostazioni → Applicazioni collegate
2. Clicca su "Gestisci" accanto alla tua app
3. Clicca su "Modifica" accanto alla sezione Permessi/Scope
4. Seleziona OBBLIGATORIAMENTE questi permessi:
   ✓ received_documents:r (lettura documenti ricevuti - FATTURE PASSIVE)
   ✓ situation:r (accesso dashboard/company - per ottenere company_id)
5. Salva le modifiche
6. IMPORTANTE: Gli scope nella richiesta OAuth devono corrispondere ESATTAMENTE a quelli configurati nell'app
7. Riprova l'autorizzazione da: /api/fattureincloud/auth

Se l'errore persiste, verifica che:
- L'app sia attiva
- Il CLIENT_ID sia corretto
- Gli scope selezionati nell'app corrispondano a quelli richiesti nel codice`;
    }
    
    return res.status(400).json({
      error: 'Autorizzazione negata',
      details: helpfulMessage,
      originalError: errorMsg,
      queryParams: req.query
    });
  }

  // Se non c'è code e non c'è errore, potrebbe essere un accesso diretto
  if (!code || typeof code !== 'string') {
    // Verifica se l'utente sta usando token personale invece di OAuth
    const hasToken = process.env.FATTUREINCLOUD_TOKEN || process.env.FATTUREINCLOUD_ACCESS_TOKEN;
    
    if (hasToken && !code && !error) {
      // L'utente ha un token personale configurato, non serve OAuth
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Token Personale Configurato - Fatture in Cloud</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { color: #22c55e; margin-bottom: 10px; }
    .info-icon { font-size: 60px; margin-bottom: 20px; }
    .info-box {
      background: #eff6ff;
      border: 1px solid #3b82f6;
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
    }
    .steps {
      background: #f0fdf4;
      border-radius: 10px;
      padding: 20px;
      margin-top: 20px;
    }
    .steps ol { margin: 0; padding-left: 20px; }
    .steps li { margin: 10px 0; }
    code {
      background: #e5e7eb;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="info-icon">ℹ️</div>
    <h1>Token Personale Configurato</h1>
    <p>Hai già configurato un <strong>Token Personale</strong> per Fatture in Cloud.</p>

    <div class="info-box">
      <strong>Non serve completare il flusso OAuth!</strong><br>
      Il token personale è già configurato e funzionante.
    </div>

    <div class="steps">
      <strong>Per testare l'integrazione:</strong>
      <ol>
        <li>Vai su: <code>/api/check-prices</code></li>
        <li>Verifica che il token abbia i permessi:
          <ul>
            <li><code>received_documents:r</code> (lettura documenti ricevuti)</li>
            <li><code>companies:r</code> (lettura aziende)</li>
          </ul>
        </li>
        <li>Se ricevi errori, controlla i log su Vercel</li>
      </ol>
    </div>

    <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
      Se vuoi usare OAuth 2.0 invece del token personale, vai su <code>/api/fattureincloud/auth</code>
    </p>
  </div>
</body>
</html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    }

    // Mostra pagina HTML con istruzioni invece di solo JSON
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Errore OAuth - Fatture in Cloud</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { color: #dc2626; margin-bottom: 10px; }
    .error-icon { font-size: 60px; margin-bottom: 20px; }
    .info-box {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
    }
    .steps {
      background: #eff6ff;
      border-radius: 10px;
      padding: 20px;
      margin-top: 20px;
    }
    .steps ol { margin: 0; padding-left: 20px; }
    .steps li { margin: 10px 0; }
    code {
      background: #e5e7eb;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
    .debug {
      background: #f3f4f6;
      border-radius: 10px;
      padding: 15px;
      margin-top: 20px;
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="error-icon">⚠️</div>
    <h1>Errore OAuth</h1>
    <p>Il parametro <code>code</code> non è stato ricevuto nel callback.</p>

    <div class="info-box">
      <strong>Possibili cause:</strong>
      <ul>
        <li>Il <code>REDIRECT_URI</code> configurato nell'app non corrisponde esattamente a questo URL</li>
        <li>L'utente ha annullato l'autorizzazione</li>
        <li>L'app su Fatture in Cloud non è configurata correttamente</li>
      </ul>
    </div>

    <div class="steps">
      <strong>Come risolvere:</strong>
      <ol>
        <li>Verifica che il <code>REDIRECT_URI</code> nell'app su Fatture in Cloud corrisponda <strong>esattamente</strong> a:
          <br><code>${process.env.FATTUREINCLOUD_REDIRECT_URI || 'https://tuo-dominio.vercel.app/api/fattureincloud/callback'}</code>
        </li>
        <li>Assicurati che l'URL non abbia trailing slash o differenze (http vs https, www vs non-www)</li>
        <li>Riprova l'autorizzazione da: <code>/api/fattureincloud/auth</code></li>
        <li>Se il problema persiste, verifica che l'app sia attiva su Fatture in Cloud</li>
      </ol>
    </div>

    <div class="debug">
      <strong>Debug Info:</strong><br>
      Query params ricevuti: ${JSON.stringify(req.query, null, 2)}<br>
      Method: ${req.method}<br>
      URL: ${req.url}
    </div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(html);
  }

  const clientId = process.env.FATTUREINCLOUD_CLIENT_ID;
  const clientSecret = process.env.FATTUREINCLOUD_CLIENT_SECRET;
  const redirectUri = process.env.FATTUREINCLOUD_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(500).json({
      error: 'Configurazione mancante',
      details: 'Variabili ambiente OAuth non configurate'
    });
  }

  try {
    // Scambia il code per access_token
    const tokenResponse = await fetch('https://api-v2.fattureincloud.it/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(400).json({
        error: 'Errore ottenimento token',
        details: tokenData.error_description || tokenData.error || 'Errore sconosciuto'
      });
    }

    // Token ottenuto con successo!
    const { access_token, refresh_token, expires_in } = tokenData;

    // Mostra pagina di successo con istruzioni
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Fatture in Cloud - Connesso!</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { color: #22c55e; margin-bottom: 10px; }
    .success-icon { font-size: 60px; margin-bottom: 20px; }
    .token-box {
      background: #f3f4f6;
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
      word-break: break-all;
      font-family: monospace;
      font-size: 12px;
    }
    .label { font-weight: bold; color: #374151; margin-bottom: 5px; }
    .warning {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 10px;
      padding: 15px;
      margin-top: 20px;
    }
    .steps {
      background: #eff6ff;
      border-radius: 10px;
      padding: 20px;
      margin-top: 20px;
    }
    .steps ol { margin: 0; padding-left: 20px; }
    .steps li { margin: 10px 0; }
    code {
      background: #e5e7eb;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="success-icon">✅</div>
    <h1>Connesso a Fatture in Cloud!</h1>
    <p>L'autorizzazione è stata completata con successo.</p>

    <div class="warning">
      <strong>⚠️ IMPORTANTE:</strong> Copia questi token e salvali su Vercel come variabili d'ambiente.
    </div>

    <div class="token-box">
      <div class="label">FATTUREINCLOUD_ACCESS_TOKEN:</div>
      <div>${access_token}</div>
    </div>

    <div class="token-box">
      <div class="label">FATTUREINCLOUD_REFRESH_TOKEN:</div>
      <div>${refresh_token}</div>
    </div>

    <p><strong>Scadenza:</strong> ${expires_in} secondi (circa ${Math.round(expires_in / 3600)} ore)</p>

    <div class="steps">
      <strong>Prossimi passi:</strong>
      <ol>
        <li>Vai su <strong>Vercel</strong> → Settings → Environment Variables</li>
        <li>Aggiungi <code>FATTUREINCLOUD_ACCESS_TOKEN</code> con il valore sopra</li>
        <li>Aggiungi <code>FATTUREINCLOUD_REFRESH_TOKEN</code> con il valore sopra</li>
        <li>Fai <strong>Redeploy</strong></li>
        <li>Testa: <code>/api/check-prices</code></li>
      </ol>
    </div>

    <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
      Puoi chiudere questa pagina dopo aver salvato i token.
    </p>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Errore callback OAuth:', error);
    return res.status(500).json({
      error: 'Errore interno',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
}
