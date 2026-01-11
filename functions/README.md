# Firebase Cloud Functions - checkInvoicePrices

Questa Cloud Function controlla automaticamente i prezzi delle fatture di acquisto da Fatture in Cloud e invia notifiche Telegram quando ci sono cambiamenti.

## Installazione

1. Installa le dipendenze:
```bash
cd functions
npm install
```

2. Configura le variabili d'ambiente su Firebase:
```bash
firebase functions:config:set fic.api_token="TUO_TOKEN_FIC"
firebase functions:config:set fic.company_id="TUO_COMPANY_ID"
firebase functions:config:set telegram.bot_token="TUO_TELEGRAM_BOT_TOKEN"
```

3. Compila il codice TypeScript:
```bash
npm run build
```

4. Deploy della funzione:
```bash
firebase deploy --only functions:checkInvoicePrices
```

## Funzionalità

La funzione viene eseguita automaticamente ogni ora e:

1. **Recupera tutti gli utenti** dal database Firestore
2. **Scarica le fatture** del giorno corrente da Fatture in Cloud API
3. **Confronta i prezzi** con il database Firestore
4. **Invia notifiche Telegram** quando:
   - Un articolo ha un prezzo diverso di più di €0.05
   - Un nuovo articolo non è mappato nel database

## Struttura Database

La funzione cerca gli ingredienti nella collection `users/{userId}/ingredients` usando il campo `nomi_fornitori` (array) che deve contenere il nome dell'articolo dalla fattura (normalizzato: lowercase, trimmed).

**Importante:** Assicurati che i documenti ingredienti abbiano il campo `nomi_fornitori` come array di stringhe che contenga i nomi possibili dell'articolo come appaiono nelle fatture.

## Configurazione Utente

Ogni utente deve avere nel documento `users/{userId}` il campo `telegramChatId` configurato per ricevere le notifiche.

## Note API Fatture in Cloud

- Endpoint: `https://api-v2.fattureincloud.it/c/{COMPANY_ID}/received_documents`
- Tipo: `expense` (fatture passive)
- Fieldset: `detailed` (per avere le righe articoli)
- Filtra per data odierna in formato YYYY-MM-DD

