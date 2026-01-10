# 🎯 Configurazione Platform Webhook con User ID - Guida Completa

## ⚠️ IMPORTANTE: URL Webhook Specifico per Utente

**Ogni utente deve configurare un URL webhook unico con il proprio User ID!**

I clienti in Platform sono specifici per ogni utente (ristorante), quindi dobbiamo sapere quale utente sta ricevendo i dati.

---

## 🔍 PASSO 1: Trova il Tuo Firebase User ID

Il User ID è il Firebase UID dell'utente loggato nell'app.

### **Come trovarlo:**

**Opzione A: Dal Browser (Più Facile)**

1. Vai all'app: `https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app`
2. Fai login
3. Apri la Console del Browser (F12 → Console)
4. Scrivi questo comando:
   ```javascript
   firebase.auth().currentUser?.uid
   ```
5. **COPIA** l'ID che appare (es. `abc123xyz789...`)

**Opzione B: Da Firebase Console**

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto `pizza-pro-tafuri`
3. Vai su **Authentication** → **Users**
4. Trova il tuo utente
5. **COPIA** l'UID (es. `abc123xyz789...`)

**Opzione C: Dalla URL dell'App**

Se l'app mostra l'UID da qualche parte, puoi prenderlo da lì.

⚠️ **SALVA QUESTO ID** - ti servirà per configurare il webhook!

---

## 🌐 PASSO 2: Costruisci l'URL Webhook Personale

L'URL del webhook deve includere il tuo User ID come parametro.

**Formato URL:**
```
https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/webhook?userId=TUO_USER_ID
```

**Esempio:**
Se il tuo User ID è `abc123xyz789`, l'URL sarà:
```
https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/webhook?userId=abc123xyz789
```

⚠️ **SOSTITUISCI `TUO_USER_ID`** con il tuo User ID reale!

---

## 🚀 PASSO 3: Configura l'Automazione su Platform

1. **Vai su Platform** → **Marketing** → **Automazioni**
2. Clicca su **"+ Nuova automazione"**
3. Nella sezione **"1 Azione"**:
   - Scegli **"Invia dati a Webhook"**
   - Seleziona il target (es. "A chi ha prenotato" - stato "Confermato")
4. Nella sezione **"2 Scenario"**:
   - Scegli quando attivare l'automazione (es. "Sempre")
5. Nella sezione **"3 Filtro"**:
   - Scegli come filtrare la clientela
6. Nella sezione **"4 Ritardo"**:
   - Scegli **"Nessun Ritardo"** per inviare immediatamente
7. Nella sezione **"Metodo d'invio"**:
   - **Webhook Url**: Incolla l'URL con il tuo User ID:
     ```
     https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/webhook?userId=TUO_USER_ID
     ```
     ⚠️ **SOSTITUISCI `TUO_USER_ID`** con il tuo User ID reale!
8. Clicca su **"Salva"**

---

## ✅ PASSO 4: Verifica la Configurazione

### **Test 1: Verifica che l'URL Sia Corretto**

L'URL nel webhook su Platform deve essere esattamente:
```
https://pizza-pro-pink.vercel.app/api/crm/webhook?userId=TUO_USER_ID
```

✅ Controlla:
- L'URL inizia con `https://`
- Non ci sono spazi extra
- Il `userId` è corretto (il tuo Firebase UID)

### **Test 2: Testa Manualmente il Webhook (Opzionale)**

Puoi testare il webhook con Postman o curl:

```bash
curl -X POST "https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/webhook?userId=TUO_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test123",
    "name": "Cliente Test",
    "email": "test@example.com"
  }'
```

Sostituisci `TUO_USER_ID` con il tuo User ID reale!

**Cosa dovresti vedere:**
```json
{
  "success": true,
  "message": "Client received and saved",
  "clientId": "test123"
}
```

### **Test 3: Verifica i Dati Salvati**

1. Dopo aver testato o dopo che Platform invia un webhook, vai su **Firebase Console**
2. Vai su **Firestore Database**
3. Cerca la collection: `users/TUO_USER_ID/crmClients`
4. Dovresti vedere i documenti con i dati dei clienti

---

## 🔄 PASSO 5: Sincronizza i Clienti Esistenti

Platform invierà i clienti quando succede un evento **nuovo**. Per sincronizzare i clienti esistenti:

**Opzione A: Crea un'automazione che invia TUTTI i clienti**

1. Vai su Platform → Marketing → Automazioni
2. Crea una nuova automazione
3. Filtro: **Tutti i clienti**
4. Scenario: **Attiva una volta** (o manualmente)
5. Webhook URL: `https://pizza-pro-pink.vercel.app/api/crm/webhook?userId=TUO_USER_ID`
6. Salva e attiva manualmente l'automazione

**Opzione B: Attendi che i clienti vengano inviati automaticamente**

Quando un cliente fa una nuova prenotazione o viene aggiornato, Platform lo invierà automaticamente.

---

## 🧪 PASSO 6: Testa nell'App

1. Vai all'applicazione: `https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app`
2. Fai login (con l'utente che ha configurato il webhook)
3. Nel menu laterale, clicca su **"Nuovo Preventivo"**
4. Nel campo di ricerca, prova a cercare un cliente
5. ✅ **Se vedi i clienti nel dropdown**, tutto funziona! 🎉

⚠️ **IMPORTANTE**: Vedrai SOLO i clienti dell'utente loggato, non quelli di altri utenti!

---

## 🐛 Risoluzione Problemi

### **Errore: "Missing userId"**

Se vedi questo errore, significa che l'URL del webhook non include il parametro `userId`.

**Soluzione:**
- Verifica che l'URL su Platform sia esattamente: 
  ```
  https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/webhook?userId=TUO_USER_ID
  ```
- Assicurati di aver sostituito `TUO_USER_ID` con il tuo User ID reale

### **Il webhook riceve i dati ma non vedo i clienti nell'app**

1. **Verifica che tu sia loggato con l'utente corretto:**
   - Il webhook deve usare lo stesso User ID dell'utente loggato
   - Controlla che il `userId` nell'URL del webhook corrisponda al tuo User ID

2. **Verifica che i dati siano stati salvati:**
   - Firebase Console → Firestore → `users/TUO_USER_ID/crmClients`
   - Dovresti vedere i documenti dei clienti

3. **Controlla i log di Vercel:**
   - Vai su Vercel → Deployments → Clicca sul deploy → Logs
   - Cerca messaggi che iniziano con `[CRM Webhook]`

### **Vedo clienti di altri utenti**

Questo non dovrebbe succedere! Se vedi clienti di altri utenti, significa che:

1. Il webhook è configurato con un User ID sbagliato
2. I clienti sono salvati nella collection sbagliata

**Soluzione:**
- Verifica che l'URL del webhook su Platform sia corretto
- Controlla che il `userId` nell'URL corrisponda al tuo User ID reale

---

## 🔐 Sicurezza

✅ **I clienti sono isolati per utente:**
- Ogni utente vede solo i propri clienti
- I clienti sono salvati in `users/{userId}/crmClients`
- L'app legge solo i clienti dell'utente loggato

⚠️ **Attenzione:**
- Non condividere il tuo User ID con altri utenti
- Ogni utente deve configurare il proprio webhook URL

---

## ✅ Checklist

- [ ] Ho trovato il mio Firebase User ID
- [ ] Ho costruito l'URL webhook con il mio User ID: `https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/webhook?userId=MIO_USER_ID`
- [ ] Ho configurato l'automazione su Platform con l'URL corretto
- [ ] Ho testato che il webhook funzioni (controllato i log di Vercel)
- [ ] Ho verificato che i clienti siano salvati in Firestore in `users/MIO_USER_ID/crmClients`
- [ ] Ho testato l'app e vedo SOLO i miei clienti nel modulo Preventivi

**Se tutte le caselle sono spuntate, sei pronto! 🎉**

---

## 📝 Note

- **Ogni utente ha il proprio webhook URL** - non condividere lo stesso URL con più utenti
- **I clienti sono salvati per utente** - ogni utente vede solo i propri clienti
- **Il User ID è il Firebase UID** - lo stesso che usi per fare login nell'app

