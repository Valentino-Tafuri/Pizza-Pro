# 🎯 URL Webhook - Riepilogo Rapido

## ✅ Il Tuo URL Base

```
https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app
```

---

## 🔗 URL Webhook Completo

### **Formato Generale:**
```
https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/webhook?userId=TUO_USER_ID
```

### **Come Usarlo:**

1. **Trova il tuo Firebase User ID:**
   - Vai all'app: https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app
   - Fai login
   - Apri Console Browser (F12) → Console
   - Scrivi: `firebase.auth().currentUser?.uid`
   - **COPIA** l'ID che appare

2. **Costruisci l'URL completo:**
   - Sostituisci `TUO_USER_ID` con l'ID che hai copiato
   - Esempio: Se il tuo User ID è `abc123xyz`, l'URL sarà:
     ```
     https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/webhook?userId=abc123xyz
     ```

3. **Configura su Platform:**
   - Vai su Platform → Marketing → Automazioni
   - Crea automazione → "Invia dati a Webhook"
   - Inserisci l'URL completo nella sezione "Webhook Url"
   - Salva

---

## ⚠️ IMPORTANTE

- **Ogni utente ha il proprio User ID**
- **Ogni utente deve configurare un URL webhook unico**
- **Non condividere lo stesso URL con più utenti**
- **I clienti sono salvati per utente** - ogni utente vede solo i propri

---

## 🧪 Test Endpoint

Dopo aver configurato, puoi testare:

**Endpoint di Test (senza userId):**
```
https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/test-clients
```

**Endpoint Clienti (legge da Firestore dell'utente corrente):**
```
https://pizza-pro-git-main-valentino-tafuris-projects.vercel.app/api/crm/clients
```

---

## 📝 Note

- Se l'URL di Vercel cambia (nuovo deploy o dominio), aggiorna l'URL su Platform
- Il dominio finale potrebbe essere diverso se hai configurato un dominio personalizzato su Vercel

