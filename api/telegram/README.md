# Bot Telegram - Pizza Pro

Bot Telegram per accedere ai dati dell'applicazione Pizza Pro direttamente da Telegram.

## Funzionalità

Il bot supporta i seguenti comandi:

- `/start` o `/help` - Mostra la guida e il tuo Chat ID
- `/stock` - Mostra le scorte del magazzino (preparazioni attive)
- `/magazzino` - Dettagli completi del magazzino organizzati per categoria
- `/ricerca <termine>` - Cerca ricette, topping o pizze

## Configurazione

### 1. Usa il Bot Esistente

**Importante:** Questo sistema usa lo stesso bot Telegram già configurato per gli alert dell'economato. Non serve creare un nuovo bot!

Se non hai ancora un bot:
1. Apri Telegram e cerca `@BotFather`
2. Invia `/newbot` e segui le istruzioni
3. Copia il **Bot Token** che ti viene fornito
4. Aggiungilo su Vercel come `TELEGRAM_BOT_TOKEN` (se non l'hai già fatto)

### 2. Configura il Webhook URL

**Nota:** Se hai già configurato il webhook per gli alert, puoi saltare questo passaggio. Il webhook può gestire sia i comandi che le notifiche.

Dopo il deploy su Vercel, configura il webhook di Telegram (solo se non l'hai già fatto):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tuo-dominio.vercel.app/api/telegram/webhook"}'
```

Oppure usa questo comando dopo aver sostituito `<YOUR_BOT_TOKEN>` e l'URL:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://tuo-dominio.vercel.app/api/telegram/webhook"
```

### 3. Configura il Chat ID nell'App (per ogni utente)

1. Apri l'app Pizza Pro
2. Vai su **Impostazioni** → **Profilo Utente**
3. Avvia una conversazione con il bot su Telegram e invia `/start`
4. Il bot ti mostrerà il tuo Chat ID
5. Copia il Chat ID e incollalo nel campo "Telegram Chat ID" nelle impostazioni
6. Salva

### 5. Testa il Bot

Invia `/start` al bot su Telegram. Se tutto è configurato correttamente, vedrai i comandi disponibili.

## Comandi Dettagliati

### `/stock`
Mostra le scorte del magazzino, separando:
- ⚠️ **Scorte Basse** - Preparazioni sotto la soglia minima
- ✅ **Scorte Normali** - Preparazioni con stock sufficiente

### `/magazzino`
Mostra tutte le preparazioni attive organizzate per categoria.

### `/ricerca <termine>`
Cerca ricette, topping o pizze che contengono il termine specificato.

**Esempi:**
- `/ricerca margherita` - Trova tutte le ricette/pizze con "margherita"
- `/ricerca pomodoro` - Trova ingredienti/ricette con "pomodoro"

## Troubleshooting

### Il bot non risponde
1. Verifica che il webhook sia configurato correttamente:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```
2. Controlla i log su Vercel per eventuali errori
3. Verifica che `TELEGRAM_BOT_TOKEN` sia configurato su Vercel

### "Utente non configurato"
1. Assicurati di aver inserito il Chat ID nelle impostazioni dell'app
2. Verifica che il Chat ID corrisponda a quello mostrato dal bot con `/start`
3. Salva le impostazioni dopo aver inserito il Chat ID

### I dati non vengono mostrati
1. Verifica di aver configurato correttamente il Chat ID
2. Controlla che i dati esistano nell'app (ingredienti, ricette, menu)
3. Verifica i log su Vercel per errori di accesso a Firebase

## Note Tecniche

- Il bot usa Firebase Firestore per leggere i dati
- Il mapping tra Chat ID Telegram e User ID Firebase avviene tramite il campo `telegramChatId` nel documento utente
- I dati vengono letti in tempo reale da Firestore ad ogni comando
- **Lo stesso bot gestisce sia i comandi interattivi che le notifiche automatiche** (alert prezzi, scorte, ecc.)
- Ogni utente può configurare il proprio Chat ID, permettendo a più utenti di usare lo stesso bot

