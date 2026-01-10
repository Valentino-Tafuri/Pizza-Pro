# 📋 Configurazione Platform CRM - Guida Passo Passo

## 🎯 Obiettivo
Configurare Platform CRM per recuperare i clienti nel modulo Preventivi.

---

## 🔑 PASSO 1: Trova le Credenziali API di Platform

### Dove trovare la tua API Key:

1. **Accedi al Dashboard di Platform**
   - Vai al sito di Platform CRM
   - Fai login con il tuo account

2. **Vai alle Impostazioni API**
   - Menu → **Impostazioni** o **Settings**
   - Sezione **API** o **Integrazioni**
   - Oppure **Sviluppatori** / **Developers**

3. **Genera o Copia la tua API Key**
   - Se non ce l'hai, clicca su **"Genera API Key"** o **"Create API Key"**
   - **COPIA** la chiave (avrai bisogno dopo)
   - ⚠️ **SALVA** la chiave in un posto sicuro, non la perderai più dopo!

4. **Trova l'URL dell'Endpoint**
   - Di solito è qualcosa come:
     - `https://api.platform.com/v1/clients`
     - `https://api.getplatform.com/api/clients`
     - `https://your-account.platform.com/api/v1/clients`
   - Controlla la documentazione API di Platform
   - O contatta il supporto se non lo trovi

---

## 🌐 PASSO 2: Configurazione su Vercel

### **2.1 Accedi a Vercel**

1. Vai su **[https://vercel.com](https://vercel.com)**
2. Clicca su **"Log In"** (se non sei loggato)
3. Seleziona il progetto **"pizzaprover.2"** dalla lista

### **2.2 Vai alle Impostazioni**

1. Nella pagina del tuo progetto, clicca su **"Settings"** (in alto nella barra del menu)
2. Nel menu laterale sinistro, clicca su **"Environment Variables"** (Variabili d'Ambiente)

### **2.3 Aggiungi la Prima Variabile: CRM_API_KEY**

1. Nella sezione **"Environment Variables"**, vedrai:
   - Campo **"Key"** (Chiave)
   - Campo **"Value"** (Valore)
   - Checkbox per selezionare gli ambienti

2. **Compila così:**
   - **Key**: `CRM_API_KEY`
   - **Value**: `[incolla qui la tua API Key di Platform]`
     - Esempio: `sk_live_abc123xyz789...`
     - Esempio: `pk_1234567890abcdef...`
     - ⚠️ **COPIA E INCOLLA** la chiave che hai salvato prima

3. **Seleziona gli ambienti:**
   - ✅ **Production** (Produzione) - OBBLIGATORIO
   - ✅ **Preview** (Anteprima) - consigliato
   - ✅ **Development** (Sviluppo) - opzionale

4. Clicca su **"Add"** o **"Save"**

### **2.4 Aggiungi la Seconda Variabile: CRM_WEBHOOK_LOCATION**

1. **Compila così:**
   - **Key**: `CRM_WEBHOOK_LOCATION`
   - **Value**: `https://api.platform.com/v1/clients`
     - ⚠️ **SOSTITUISCI** con l'URL reale del tuo Platform CRM!
     - Deve essere l'URL completo con `https://`

2. **Seleziona gli stessi ambienti** (Production, Preview, Development)

3. Clicca su **"Add"** o **"Save"**

### **2.5 Verifica le Variabili Aggiunte**

Dovresti vedere una tabella con:
```
┌──────────────────────────┬──────────────────────────┐
│ Key                      │ Value                    │
├──────────────────────────┼──────────────────────────┤
│ CRM_API_KEY              │ ***                      │
│ CRM_WEBHOOK_LOCATION     │ https://api.platform... │
└──────────────────────────┴──────────────────────────┘
```

✅ Se vedi entrambe, sei a posto!

---

## 🚀 PASSO 3: Riedploya l'Applicazione

⚠️ **IMPORTANTE**: Le variabili d'ambiente funzionano solo dopo un nuovo deploy!

### **Opzione A: Redeploy Manuale (Più Veloce)**

1. Vai alla tab **"Deployments"** (Deploy) nel menu del progetto
2. Trova l'ultimo deployment nella lista
3. Clicca sui **"..."** (tre puntini) accanto al deployment
4. Seleziona **"Redeploy"** dal menu
5. Clicca su **"Redeploy"** nella conferma
6. ⏳ Aspetta che il deploy finisca (1-2 minuti)

### **Opzione B: Deploy Automatico (Se usi Git)**

1. Fai un piccolo cambiamento al codice (anche solo uno spazio)
2. Fai commit e push al repository
3. Vercel farà il deploy automaticamente

---

## ✅ PASSO 4: Testa la Configurazione

### **4.1 Testa l'Endpoint di Test**

Dopo il deploy, apri nel browser:

```
https://tuo-progetto.vercel.app/api/crm/test-clients
```

**Sostituisci `tuo-progetto`** con il nome del tuo progetto Vercel!

**Cosa dovresti vedere:**

✅ **Se tutto è OK:**
```json
{
  "status": "success",
  "message": "Connessione al CRM riuscita! 🎉",
  ...
}
```

❌ **Se c'è un problema:**
```json
{
  "status": "configuration_missing",
  "message": "Le variabili d'ambiente non sono configurate..."
}
```
→ Torna al PASSO 3 e verifica di aver fatto il redeploy!

### **4.2 Testa l'Endpoint dei Clienti**

Prova anche:
```
https://tuo-progetto.vercel.app/api/crm/clients
```

**Dovresti vedere:**
```json
{
  "clients": [
    {
      "id": "123",
      "name": "Nome Cliente",
      "email": "cliente@example.com",
      ...
    }
  ],
  "count": 1
}
```

---

## 🧪 PASSO 5: Testa nell'App

1. Vai all'applicazione: `https://tuo-progetto.vercel.app`
2. Fai login
3. Nel menu laterale, clicca su **"Nuovo Preventivo"** (sezione "Preventivi")
4. Nel campo di ricerca, prova a cercare un cliente
5. ✅ **Se vedi i clienti nel dropdown**, tutto funziona! 🎉

---

## ❓ Problemi Comuni

### **Errore: "CRM configuration missing"**
→ Le variabili non sono configurate o non hai fatto il redeploy
**Soluzione**: Controlla il PASSO 3

### **Errore: 401 Unauthorized**
→ La API Key è sbagliata o scaduta
**Soluzione**: 
- Verifica che l'API Key sia corretta
- Controlla che non ci siano spazi extra
- Genera una nuova API Key se necessario

### **Errore: 404 Not Found**
→ L'URL dell'endpoint è sbagliato
**Soluzione**:
- Verifica l'URL nella documentazione di Platform
- Assicurati che inizi con `https://`
- Controlla che l'endpoint sia corretto

### **Errore: 403 Forbidden**
→ L'API Key non ha i permessi necessari
**Soluzione**:
- Controlla i permessi dell'API Key in Platform
- Assicurati che abbia permessi di "lettura clienti"

### **Nessun cliente nella lista**
→ L'endpoint restituisce dati in un formato diverso
**Soluzione**:
- Controlla i log di Vercel (Deployments → clicca sul deploy → Logs)
- Verifica la struttura della risposta del CRM
- Potrebbe essere necessario adattare il mapping in `/api/crm/clients.ts`

---

## 📝 Esempi di URL per Platform CRM

A seconda della versione e configurazione di Platform, l'URL potrebbe essere:

```
https://api.platform.com/v1/clients
https://api.getplatform.com/api/clients
https://api.platform.io/v1/customers
https://your-account.platform.com/api/v1/contacts
```

**Controlla la documentazione API del tuo Platform CRM per l'URL esatto!**

---

## 🆘 Serve Aiuto?

1. **Controlla i Log di Vercel:**
   - Deployments → Clicca su un deploy → Tab "Logs"
   - Cerca errori che iniziano con `[CRM Platform]`

2. **Testa l'Endpoint Platform direttamente:**
   - Usa Postman o curl per testare:
   ```bash
   curl -H "Authorization: Bearer TUA_API_KEY" \
        https://api.platform.com/v1/clients
   ```

3. **Controlla la Documentazione Platform:**
   - Cerca "API Documentation" nel sito di Platform
   - Verifica autenticazione e endpoint

---

## ✅ Checklist Finale

- [ ] Ho trovato la mia API Key di Platform
- [ ] Ho trovato l'URL dell'endpoint dei clienti
- [ ] Ho aggiunto `CRM_API_KEY` su Vercel
- [ ] Ho aggiunto `CRM_WEBHOOK_LOCATION` su Vercel
- [ ] Ho fatto il redeploy dell'applicazione
- [ ] Ho testato `/api/crm/test-clients` e funziona
- [ ] Ho testato `/api/crm/clients` e restituisce i clienti
- [ ] Ho testato l'app e vedo i clienti nel modulo Preventivi

**Se tutte le caselle sono spuntate, sei pronto! 🎉**

