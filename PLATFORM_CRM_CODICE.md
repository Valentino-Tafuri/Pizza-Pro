# 🔑 Configurazione Platform CRM con Codice (Non URL)

## 📋 Situazione
Platform CRM ti ha fornito un **codice** (token/secret) invece di un URL webhook completo. Questo è normale! Il codice va usato per l'autenticazione.

---

## 🎯 Cosa Ti Serve

### 1. **Il Codice/Token da Platform**
- È il codice che ti hanno dato nelle impostazioni
- Può essere qualcosa come: `abc123xyz789`, `sk_live_...`, `pk_...`, ecc.
- ⚠️ **COPIA** questo codice - lo useremo come `CRM_API_KEY`

### 2. **L'URL Base dell'API Platform**
- Questo è l'URL standard dell'API di Platform
- Esempi comuni:
  - `https://api.platform.com/v1`
  - `https://api.getplatform.com/api`
  - `https://platform.com/api/v1`
- Se non lo sai, cerca nella documentazione di Platform o contatta il supporto
- Lo useremo come `CRM_WEBHOOK_LOCATION`

---

## 📝 Configurazione su Vercel - Passo Passo

### **PASSO 1: Accedi a Vercel**

1. Vai su **[https://vercel.com](https://vercel.com)**
2. Accedi con il tuo account
3. Seleziona il progetto **"pizzaprover.2"**

### **PASSO 2: Vai alle Environment Variables**

1. Nella pagina del progetto, clicca su **"Settings"** (in alto)
2. Nel menu laterale sinistro, clicca su **"Environment Variables"**

### **PASSO 3: Aggiungi CRM_API_KEY (Il Codice)**

1. **Key**: `CRM_API_KEY`
2. **Value**: `[incolla qui il CODICE che ti ha dato Platform]`
   - Esempio: `abc123xyz789`
   - Esempio: `sk_live_1234567890abcdef`
   - ⚠️ **COPIA TUTTO IL CODICE** esattamente come ti è stato fornito (senza spazi extra)

3. **Seleziona ambienti**:
   - ✅ **Production** (OBBLIGATORIO)
   - ✅ **Preview** (consigliato)
   - ✅ **Development** (opzionale)

4. Clicca su **"Add"** o **"Save"**

### **PASSO 4: Aggiungi CRM_WEBHOOK_LOCATION (URL Base API)**

1. **Key**: `CRM_WEBHOOK_LOCATION`
2. **Value**: `[inserisci l'URL base dell'API Platform]`
   - Esempio: `https://api.platform.com/v1`
   - Esempio: `https://api.getplatform.com/api`
   - ⚠️ **NON** includere `/clients` alla fine, lo aggiungerà il codice automaticamente
   - Deve essere l'URL base (senza endpoint specifico)

3. **Seleziona gli stessi ambienti** (Production, Preview, Development)

4. Clicca su **"Add"** o **"Save"**

### **PASSO 5: Verifica**

Dovresti vedere:
```
┌──────────────────────────┬──────────────────────────┐
│ CRM_API_KEY              │ ***                      │
│ CRM_WEBHOOK_LOCATION     │ https://api.platform... │
└──────────────────────────┴──────────────────────────┘
```

---

## 🔍 Come Trovare l'URL Base dell'API Platform

### **Opzione 1: Documentazione**
1. Cerca "Platform CRM API Documentation" su Google
2. Cerca la sezione "Base URL" o "Endpoint"
3. Di solito è nella forma: `https://api.platform.com/v1`

### **Opzione 2: Supporto Platform**
- Contatta il supporto di Platform
- Chiedi: "Qual è l'URL base dell'API per recuperare i clienti?"

### **Opzione 3: Pattern Comuni**
Platform CRM usa spesso questi pattern:
```
https://api.platform.com/v1
https://api.getplatform.com/api
https://platform.com/api/v1
https://app.platform.com/api
```

### **Opzione 4: Test**
Puoi provare a testare diversi URL:
1. Vai su Postman o usa curl
2. Prova: `GET https://api.platform.com/v1/clients`
3. Usa il tuo codice come header: `Authorization: Bearer TUA_CODICE`
4. Se funziona, allora l'URL base è `https://api.platform.com/v1`

---

## 🚀 PASSO 6: Riedploya l'Applicazione

⚠️ **IMPORTANTE**: Le variabili funzionano solo dopo un nuovo deploy!

1. Vai a **"Deployments"**
2. Clicca sui **"..."** sull'ultimo deployment
3. Seleziona **"Redeploy"**
4. ⏳ Aspetta 1-2 minuti

---

## ✅ PASSO 7: Testa la Configurazione

### **Test 1: Endpoint di Test**
Dopo il deploy, visita:
```
https://tuo-progetto.vercel.app/api/crm/test-clients
```

**Cosa dovresti vedere:**
- ✅ **Success**: "Connessione al CRM riuscita! 🎉"
- ❌ **Error**: Controlla i log per vedere cosa manca

### **Test 2: Endpoint Clienti**
Prova anche:
```
https://tuo-progetto.vercel.app/api/crm/clients
```

**Dovresti vedere:**
```json
{
  "clients": [...],
  "count": X
}
```

---

## 🐛 Problemi Comuni e Soluzioni

### **Errore 401 Unauthorized**
→ Il codice è sbagliato o non ha i permessi giusti
**Soluzione:**
- Verifica di aver copiato tutto il codice (senza spazi)
- Controlla che il codice sia attivo in Platform
- Verifica i permessi del codice in Platform

### **Errore 404 Not Found**
→ L'URL base è sbagliato
**Soluzione:**
- Controlla di aver inserito l'URL base corretta
- Verifica nella documentazione di Platform
- Prova a testare l'URL direttamente con Postman/curl

### **Errore: "CRM configuration missing"**
→ Le variabili non sono configurate o non hai fatto il redeploy
**Soluzione:**
- Controlla di aver aggiunto entrambe le variabili
- Fai il redeploy dell'applicazione

### **Nessun cliente restituito**
→ L'endpoint potrebbe essere diverso (es. `/contacts` invece di `/clients`)
**Soluzione:**
- Controlla i log di Vercel per vedere la risposta
- Potrebbe essere necessario modificare l'endpoint in `/api/crm/clients.ts`

---

## 🔧 Se l'Endpoint è Diverso da `/clients`

Se Platform usa un endpoint diverso (es. `/contacts`, `/customers`, `/api/v1/partners`), possiamo modificarlo.

**Dimmi:**
- Quale endpoint usa Platform per i clienti?
- Oppure testa `/api/crm/test-clients` e guarda cosa restituisce

---

## 📞 Informazioni da Fornire se Serve Aiuto

Se hai problemi, dimmi:

1. **Che errore vedi?**
   - Esempio: "401 Unauthorized", "404 Not Found", ecc.

2. **Hai trovato l'URL base dell'API?**
   - Quale URL hai provato?

3. **Il codice è nel formato corretto?**
   - Quanto è lungo? (es. 20 caratteri, 40 caratteri, ecc.)
   - Inizia con qualcosa di specifico? (es. `sk_`, `pk_`, ecc.)

4. **Hai fatto il redeploy?**
   - Dopo aver aggiunto le variabili, hai fatto il redeploy?

---

## ✅ Checklist

- [ok ] Ho copiato il CODICE da Platform (non URL)
- [ ] Ho trovato l'URL base dell'API Platform
- [ok ] Ho aggiunto `CRM_API_KEY` su Vercel con il codice
- [ ] Ho aggiunto `CRM_WEBHOOK_LOCATION` su Vercel con l'URL base
- [ ] Ho fatto il redeploy dell'applicazione
- [ ] Ho testato `/api/crm/test-clients` e funziona
- [ ] Ho testato `/api/crm/clients` e restituisce i clienti

**Se tutte le caselle sono spuntate, sei pronto! 🎉**

