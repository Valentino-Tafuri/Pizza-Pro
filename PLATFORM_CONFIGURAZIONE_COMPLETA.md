# ✅ Configurazione Platform CRM - Guida Completa

## 🎯 Cosa Hai Visto nelle Impostazioni Platform

Nelle impostazioni di Platform → Integrazioni → Generale vedi **DUE campi**:

1. **"Chiave API"** (API Key) - Il codice per autenticazione
2. **"Webhook Location"** - L'URL dell'endpoint per i clienti

✅ **Entrambi sono già forniti da Platform!** Devi solo copiarli.

---

## 📋 PASSO 1: Copia i Valori da Platform

### **1.1 Apri le Impostazioni Platform**

1. Vai su Platform CRM (admin.plateform.app)
2. Vai su **Impostazioni** → **Integrazioni** → Tab **"Generale"**
3. Trova i due campi:
   - **"Chiave API"** 
   - **"Webhook Location"**

### **1.2 Copia i Valori**

1. **Copia il valore di "Chiave API"**
   - Clicca sul campo
   - Seleziona tutto (Cmd+A su Mac, Ctrl+A su Windows)
   - Copia (Cmd+C o Ctrl+C)
   - ✅ Salva in un posto sicuro temporaneamente

2. **Copia il valore di "Webhook Location"**
   - Clicca sul campo
   - Seleziona tutto
   - Copia
   - ✅ Salva in un posto sicuro temporaneamente

⚠️ **ATTENZIONE**: 
- Copia TUTTI i caratteri (anche se sembra un URL lungo)
- Non aggiungere spazi extra
- Se è un URL, deve iniziare con `https://`

---

## 🚀 PASSO 2: Configurazione su Vercel

### **2.1 Accedi a Vercel**

1. Vai su **[https://vercel.com](https://vercel.com)**
2. Accedi con il tuo account
3. Seleziona il progetto **"pizzaprover.2"**

### **2.2 Vai alle Environment Variables**

1. Nella pagina del progetto, clicca su **"Settings"** (in alto)
2. Nel menu laterale sinistro, clicca su **"Environment Variables"**

### **2.3 Aggiungi CRM_API_KEY**

1. **Key**: `CRM_API_KEY`
2. **Value**: `[incolla qui il valore di "Chiave API" da Platform]`
   - Esempio: Se Platform mostra `abc123xyz789`, incolla esattamente quello
   - ⚠️ **COPIA TUTTO IL VALORE** così come appare in Platform

3. **Seleziona ambienti**:
   - ✅ **Production** (OBBLIGATORIO)
   - ✅ **Preview** (consigliato)
   - ✅ **Development** (opzionale)

4. Clicca su **"Add"** o **"Save"**

### **2.4 Aggiungi CRM_WEBHOOK_LOCATION**

1. **Key**: `CRM_WEBHOOK_LOCATION`
2. **Value**: `[incolla qui il valore di "Webhook Location" da Platform]`
   - Esempio: Se Platform mostra `https://api.plateform.app/webhook/clients`, incolla esattamente quello
   - ⚠️ **COPIA TUTTO L'URL** così come appare in Platform
   - Deve essere un URL completo (inizia con `https://`)

3. **Seleziona gli stessi ambienti** (Production, Preview, Development)

4. Clicca su **"Add"** o **"Save"**

### **2.5 Verifica**

Dovresti vedere nella lista:
```
┌──────────────────────────┬──────────────────────────┐
│ CRM_API_KEY              │ ***                      │
│ CRM_WEBHOOK_LOCATION     │ https://api.plateform... │
└──────────────────────────┴──────────────────────────┘
```

✅ Se vedi entrambe, sei a posto!

---

## 🔄 PASSO 3: Riedploya l'Applicazione

⚠️ **IMPORTANTE**: Le variabili funzionano solo dopo un nuovo deploy!

### **Redeploy Manuale (Più Veloce)**

1. Vai alla tab **"Deployments"** (Deploy)
2. Trova l'ultimo deployment nella lista
3. Clicca sui **"..."** (tre puntini) accanto al deployment
4. Seleziona **"Redeploy"**
5. Clicca su **"Redeploy"** nella conferma
6. ⏳ Aspetta 1-2 minuti che finisca

---

## ✅ PASSO 4: Testa la Configurazione

### **Test 1: Endpoint di Test**

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
- Verifica di aver copiato esattamente i valori da Platform
- Controlla di aver fatto il redeploy
- Guarda i log di Vercel per errori specifici

### **Test 2: Endpoint Clienti**

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

### **Test 3: Testa nell'App**

1. Vai all'applicazione: `https://tuo-progetto.vercel.app`
2. Fai login
3. Nel menu laterale, clicca su **"Nuovo Preventivo"**
4. Nel campo di ricerca, prova a cercare un cliente
5. ✅ **Se vedi i clienti nel dropdown**, tutto funziona! 🎉

---

## 🐛 Problemi Comuni

### **Errore 401 Unauthorized**
→ La "Chiave API" è sbagliata o non copiata correttamente
**Soluzione**: 
- Vai su Platform → Impostazioni → Integrazioni → Generale
- Controlla di aver copiato TUTTO il valore di "Chiave API"
- Verifica che non ci siano spazi extra

### **Errore 404 Not Found**
→ Il "Webhook Location" è sbagliato o non copiato correttamente
**Soluzione**: 
- Vai su Platform → Impostazioni → Integrazioni → Generale
- Controlla di aver copiato TUTTO l'URL di "Webhook Location"
- Verifica che inizi con `https://`
- Verifica che sia l'URL completo (non tagliato)

### **Errore: "CRM configuration missing"**
→ Le variabili non sono configurate o non hai fatto il redeploy
**Soluzione**: 
- Controlla di aver aggiunto entrambe le variabili su Vercel
- Fai il redeploy dell'applicazione

### **Nessun cliente restituito**
→ L'URL webhook potrebbe non essere l'endpoint corretto per i clienti
**Soluzione**: 
- Controlla i log di Vercel per vedere la risposta
- Potrebbe essere necessario modificare l'endpoint in `/api/crm/clients.ts`
- Controlla la documentazione di Platform per l'endpoint corretto

---

## ✅ Checklist Finale

- [ ] Ho copiato il valore di **"Chiave API"** da Platform
- [ ] Ho copiato il valore di **"Webhook Location"** da Platform
- [ ] Ho aggiunto `CRM_API_KEY` su Vercel con il valore di "Chiave API"
- [ ] Ho aggiunto `CRM_WEBHOOK_LOCATION` su Vercel con il valore di "Webhook Location"
- [ ] Ho fatto il redeploy dell'applicazione
- [ ] Ho testato `/api/crm/test-clients` e funziona
- [ ] Ho testato `/api/crm/clients` e restituisce i clienti
- [ ] Ho testato l'app e vedo i clienti nel modulo Preventivi

**Se tutte le caselle sono spuntate, sei pronto! 🎉**

---

## 💡 Nota Importante

**Non hai bisogno di cercare o costruire URL!** Platform ti ha già fornito tutto:
- ✅ La "Chiave API" = `CRM_API_KEY`
- ✅ Il "Webhook Location" = `CRM_WEBHOOK_LOCATION`

**Devi solo copiare e incollare!** 🎯

