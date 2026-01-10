# 🎯 Configurazione Platform Webhook - Guida Completa

## 📋 Come Funziona

Invece di fare richieste API per recuperare i clienti, **Platform invia automaticamente i clienti al nostro endpoint** quando succede un evento (es. nuova prenotazione, nuovo cliente, ecc.).

✅ **Vantaggi:**
- Più veloce (leggi da Firestore locale invece di fare richieste API)
- Dati sempre aggiornati (Platform invia automaticamente)
- Più affidabile (non dipendi da API esterne)
- Gratuito (meno chiamate API)

---

## 🚀 Configurazione - Passo Passo

### **PASSO 1: Configura il Webhook Endpoint su Vercel**

Il webhook endpoint è già creato: `/api/crm/webhook`

**L'URL completo è:**
```
https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/webhook?userId=TUO_USER_ID
```

⚠️ **IMPORTANTE**: Devi aggiungere `?userId=TUO_USER_ID` all'URL, dove `TUO_USER_ID` è il tuo Firebase User ID!

⚠️ **SALVA QUESTO URL** - ti servirà per Platform!

---

### **PASSO 2: Configura l'Automazione su Platform**

Segui la guida ufficiale: [Marketing | Automazioni: invia dati a WebHook](https://supporto.plateform.app/it/articles/8957954-marketing-automazioni-invia-dati-a-webhook)

**Riassunto:**

1. **Vai su Platform** → **Marketing** → **Automazioni**
2. Clicca su **"+ Nuova automazione"**
3. Nella sezione **"1 Azione"**:
   - Scegli **"Invia dati a Webhook"**
   - Seleziona il target (es. "A chi ha prenotato" - stato "Confermato")
4. Nella sezione **"2 Scenario"**:
   - Scegli quando attivare l'automazione (es. "Sempre" o "Solo in determinati giorni/orari")
5. Nella sezione **"3 Filtro"**:
   - Scegli come filtrare la clientela
6. Nella sezione **"4 Ritardo"**:
   - Scegli **"Nessun Ritardo"** per inviare immediatamente
7. Nella sezione **"Metodo d'invio"**:
   - **Webhook Url**: Incolla `https://pizza-pro-pink.vercel.app/api/crm/webhook`
8. Clicca su **"Salva"**

---

### **PASSO 3: Crea l'Automazione per Tutti i Clienti Esistenti**

Platform invierà i dati quando succede un evento **nuovo**. Per sincronizzare i clienti esistenti, puoi:

**Opzione A: Crea un'automazione che invia TUTTI i clienti**
- Filtro: Tutti i clienti
- Scenario: Attiva una volta (o manualmente)
- In questo modo Platform invierà tutti i clienti al nostro endpoint

**Opzione B: Attendi che i clienti vengano inviati automaticamente**
- Quando un cliente fa una nuova prenotazione o viene aggiornato, Platform lo invierà automaticamente

---

### **PASSO 4: Verifica che i Dati Arrivino**

1. Dopo aver configurato l'automazione, fai un'azione che trigger l'evento (es. crea una nuova prenotazione)
2. Vai su **Vercel Dashboard** → **Deployments** → Clicca sull'ultimo deploy → **Logs**
3. Cerca messaggi che iniziano con `[CRM Webhook]`
4. Dovresti vedere: `[CRM Webhook] Cliente salvato in Firestore: [ID] [Nome]`

---

### **PASSO 5: Testa nell'App**

1. Vai all'applicazione: `https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app`
2. Fai login
3. Nel menu laterale, clicca su **"Nuovo Preventivo"**
4. Nel campo di ricerca, prova a cercare un cliente
5. ✅ **Se vedi i clienti nel dropdown**, tutto funziona! 🎉

---

## 🔍 Come Verificare i Dati Salvati

I clienti vengono salvati in Firestore nella collection `crm_clients`.

Per verificare:

1. Vai su **Firebase Console** → **Firestore Database**
2. Cerca la collection `crm_clients`
3. Dovresti vedere i documenti con i dati dei clienti inviati da Platform

---

## 📊 Cosa Succede Quando Platform Invia un Cliente

1. **Platform invia il webhook** al nostro endpoint (`/api/crm/webhook`)
2. **Il nostro endpoint riceve i dati** e li valida
3. **I dati vengono mappati** al formato Client standard
4. **Il cliente viene salvato in Firestore** nella collection `crm_clients`
5. **Quando cerchi un cliente** nell'app, legge direttamente da Firestore (velocissimo!)

---

## 🐛 Risoluzione Problemi

### **Il webhook non riceve dati**

1. **Verifica l'URL del webhook su Platform:**
   - Deve essere esattamente: `https://pizza-pro-pink.vercel.app/api/crm/webhook`
   - Non deve avere spazi o caratteri extra

2. **Verifica che l'automazione sia attiva:**
   - Vai su Platform → Marketing → Automazioni
   - Controlla che l'automazione sia attiva e configurata correttamente

3. **Controlla i log di Vercel:**
   - Vai su Vercel → Deployments → Clicca sul deploy → Logs
   - Cerca errori che iniziano con `[CRM Webhook]`

4. **Testa manualmente il webhook:**
   - Puoi usare Postman o curl per testare:
   ```bash
   curl -X POST "https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/webhook?userId=TUO_USER_ID" \
     -H "Content-Type: application/json" \
     -d '{"id":"test123","name":"Cliente Test","email":"test@example.com"}'
   ```

### **I clienti non appaiono nell'app**

1. **Verifica che siano stati salvati in Firestore:**
   - Firebase Console → Firestore → Collection `crm_clients`
   - Se non ci sono documenti, il webhook non sta ricevendo dati

2. **Verifica le regole Firestore:**
   - Assicurati che le regole Firestore permettano la lettura della collection `crm_clients`

3. **Controlla i log del browser:**
   - Apri la console del browser (F12)
   - Cerca errori quando cerchi un cliente

### **Autenticazione fallita**

Il webhook valida l'autenticazione usando `CRM_API_KEY`. Se Platform invia l'autenticazione in un modo diverso, potremmo dover adattare il codice.

**Per ora il webhook accetta richieste anche senza autenticazione** (per test). Se vuoi attivare la validazione, possiamo modificare il codice.

---

## 🔐 Sicurezza (Opzionale)

Per ora il webhook accetta tutte le richieste. Se vuoi renderlo più sicuro:

1. Platform potrebbe inviare la Chiave API in un header
2. Possiamo validare che la richiesta venga davvero da Platform
3. Contatta il supporto Platform per sapere come autenticare i webhook

---

## ✅ Checklist

- [ ] Ho configurato l'URL webhook su Platform: `https://pizza-pro-pink.vercel.app/api/crm/webhook`
- [ ] Ho creato un'automazione su Platform che invia dati al webhook
- [ ] Ho testato che i dati arrivino (controllato i log di Vercel)
- [ ] Ho verificato che i clienti siano salvati in Firestore
- [ ] Ho testato l'app e vedo i clienti nel modulo Preventivi

**Se tutte le caselle sono spuntate, sei pronto! 🎉**

---

## 📝 Note

- I clienti vengono salvati in una collection condivisa (`crm_clients`) per tutti gli utenti
- Se vuoi separare i clienti per utente, possiamo modificare il codice
- I dati vengono aggiornati automaticamente quando Platform invia un webhook per un cliente esistente (merge)

---

## 🔗 Link Utili

- [Guida ufficiale Platform: Marketing | Automazioni](https://supporto.plateform.app/it/articles/8957954-marketing-automazioni-invia-dati-a-webhook)
- [Supporto Platform](mailto:support@plateform.app)

