import type { VercelRequest, VercelResponse } from '@vercel/node';

// Endpoint callback per OAuth Fatture in Cloud
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error, error_description } = req.query;

  // Gestisci errori da Fatture in Cloud
  if (error) {
    return res.status(400).json({
      error: 'Autorizzazione negata',
      details: error_description || error
    });
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      error: 'Codice mancante',
      details: 'Il parametro code non è stato ricevuto'
    });
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
