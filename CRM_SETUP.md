# Guida Configurazione CRM - Variabili d'Ambiente

## 🎯 Obiettivo
Configurare le credenziali del CRM in modo sicuro su Vercel per permettere all'applicazione di recuperare i clienti.

---

## 📋 Informazioni Necessarie

Prima di iniziare, assicurati di avere:

1. **CRM_API_KEY**: La chiave API del tuo CRM
   - Esempio: `sk_live_1234567890abcdef` o `Bearer token_xyz`
   - Dove trovarla: Dashboard del tuo CRM → Impostazioni → API Keys

2. **CRM_WEBHOOK_LOCATION**: L'URL completo dell'endpoint che restituisce i clienti
   - Esempio: `https://api.tuocrm.com/v1/clients`
   - Esempio: `https://crm.example.com/api/clients`
   - Deve essere l'URL completo (con https://)

---

## 🚀 Configurazione su Vercel - Passo dopo Passo

### **PASSO 1: Accedi al Dashboard Vercel**

1. Vai su [https://vercel.com](https://vercel.com)
2. Accedi con il tuo account
3. Seleziona il progetto `pizzaprover.2` (o il nome del tuo progetto)

### **PASSO 2: Vai alle Impostazioni del Progetto**

1. Nella pagina del progetto, clicca su **"Settings"** (Impostazioni) nel menu in alto
2. Nel menu laterale sinistro, clicca su **"Environment Variables"** (Variabili d'Ambiente)

### **PASSO 3: Aggiungi la Prima Variabile (CRM_API_KEY)**

1. Vedi una sezione con input per aggiungere variabili
2. Nel campo **"Key"** (Chiave), inserisci:
   ```
   CRM_API_KEY
   ```
3. Nel campo **"Value"** (Valore), inserisci:
   ```
   la_tua_api_key_effettiva
   ```
   ⚠️ **ATTENZIONE**: Sostituisci `la_tua_api_key_effettiva` con la chiave API reale del tuo CRM!

4. Seleziona gli ambienti dove applicarla:
   - ✅ **Production** (Produzione)
   - ✅ **Preview** (Anteprima) - opzionale ma consigliato
   - ✅ **Development** (Sviluppo) - opzionale

5. Clicca su **"Add"** o **"Save"**

### **PASSO 4: Aggiungi la Seconda Variabile (CRM_WEBHOOK_LOCATION)**

1. Aggiungi una nuova variabile:
   - **Key**: `CRM_WEBHOOK_LOCATION`
   - **Value**: `https://url-del-tuo-crm.com/api/clients`
     ⚠️ **ATTENZIONE**: Sostituisci con l'URL reale del tuo CRM!

2. Seleziona gli stessi ambienti (Production, Preview, Development)

3. Clicca su **"Add"** o **"Save"**

### **PASSO 5: Verifica le Variabili Aggiunte**

Dovresti vedere una tabella con:
- `CRM_API_KEY` → `***` (nascosta per sicurezza)
- `CRM_WEBHOOK_LOCATION` → `https://...`

### **PASSO 6: Riedploya l'Applicazione**

⚠️ **IMPORTANTE**: Le variabili d'ambiente vengono applicate solo dopo un nuovo deploy!

1. Vai alla tab **"Deployments"** (Deploy)
2. Clicca sui **"..."** (tre puntini) sull'ultimo deployment
3. Seleziona **"Redeploy"** (Rideploya)
4. Oppure fai un nuovo commit e push al repository (se hai auto-deploy attivo)

---

## 🧪 Test della Configurazione

### Dopo il Deploy, testa l'endpoint:

1. Vai all'URL del tuo sito Vercel (es: `https://pizzaprover.2.vercel.app`)
2. Aggiungi `/api/crm/clients` alla fine dell'URL
3. Dovresti vedere una risposta JSON con i clienti

**Esempio di URL da testare:**
```
https://tuo-progetto.vercel.app/api/crm/clients
```

### Risposta Attesa (successo):
```json
{
  "clients": [
    {
      "id": "123",
      "name": "Nome Cliente",
      "address": "Via Esempio 123",
      "email": "cliente@example.com",
      "vat_number": "IT12345678901"
    }
  ],
  "count": 1
}
```

### Se Vedi Errori:

**Errore 500 - "CRM configuration missing"**
→ Le variabili d'ambiente non sono configurate correttamente o non è stato fatto il redeploy

**Errore 401/403**
→ La `CRM_API_KEY` è errata o non ha i permessi necessari

**Errore di connessione**
→ Verifica che `CRM_WEBHOOK_LOCATION` sia l'URL corretto e che il server CRM sia raggiungibile

---

## 🔧 Configurazione per Sviluppo Locale (Opzionale)

Se vuoi testare in locale, crea un file `.env.local` nella root del progetto:

```bash
CRM_API_KEY=la_tua_api_key
CRM_WEBHOOK_LOCATION=https://url-del-tuo-crm.com/api/clients
```

⚠️ **NON** committare questo file nel repository! È già in `.gitignore`.

---

## ❓ Domande Frequenti

**Q: Come trovo la mia API Key del CRM?**
A: Dipende dal CRM che usi. Di solito è in:
   - Dashboard del CRM → Impostazioni → API / Integrazioni → Genera API Key

**Q: Come trovo l'URL dell'endpoint?**
A: Controlla la documentazione API del tuo CRM. Di solito è:
   - `https://api.nomecrm.com/v1/clients`
   - `https://crm.nomecrm.com/api/clients`
   - Contatta il supporto del tuo CRM se non lo trovi

**Q: Devo fare il redeploy dopo ogni modifica?**
A: Sì, le variabili d'ambiente vengono caricate solo all'avvio dell'applicazione

**Q: Le variabili sono visibili nel codice client?**
A: No, le variabili d'ambiente in Vercel sono solo sul server. Il proxy API mantiene le credenziali sicure.

---

## 🆘 Serve Aiuto?

Se hai problemi:
1. Controlla i log di Vercel (Deployments → clicca su un deploy → Logs)
2. Verifica che l'endpoint CRM risponda correttamente
3. Controlla che la formattazione delle variabili sia corretta (niente spazi extra)

