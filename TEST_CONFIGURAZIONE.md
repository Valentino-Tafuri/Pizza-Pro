# ✅ Test Configurazione Platform CRM

## 🎯 Variabili Configurate su Vercel

✅ `CRM_API_KEY` - Configurata  
✅ `CRM_WEBHOOK_LOCATION` - Configurata

---

## 🧪 Test 1: Verifica Deploy

1. Vai su **Vercel Dashboard** → progetto **"pizzaprover.2"** → **Deployments**
2. Verifica che l'ultimo deploy sia **completato** (status verde ✅)
3. Se è ancora in corso, aspetta 1-2 minuti

---

## 🧪 Test 2: Test Endpoint Configurazione

Dopo che il deploy è completato, visita:

```
https://pizza-pro-pink.vercel.app/api/crm/test-clients
```

### **Cosa dovresti vedere:**

✅ **Successo:**
```json
{
  "status": "success",
  "message": "Connessione al CRM riuscita! 🎉",
  ...
}
```

❌ **Variabili non configurate:**
```json
{
  "status": "configuration_missing",
  "message": "Le variabili d'ambiente non sono configurate..."
}
```
→ Hai già detto che le hai configurate, quindi probabilmente devi fare un **redeploy**

❌ **Errore connessione:**
```json
{
  "status": "connection_error",
  "message": "Il CRM ha restituito un errore: 401 Unauthorized"
}
```
→ Verifica che i valori copiati da Platform siano corretti

---

## 🔄 Se Vedi "configuration_missing"

Le variabili sono configurate ma Vercel le carica solo all'avvio:

1. Vai su **Deployments**
2. Clicca sui **"..."** sull'ultimo deploy
3. Seleziona **"Redeploy"**
4. ⏳ Aspetta 1-2 minuti
5. Testa di nuovo `/api/crm/test-clients`

---

## 🧪 Test 3: Test Endpoint Clienti

Se il test di configurazione funziona, prova:

```
https://pizza-pro-pink.vercel.app/api/crm/clients
```

### **Cosa dovresti vedere:**

✅ **Clienti restituiti:**
```json
{
  "clients": [
    {
      "id": "123",
      "name": "Nome Cliente",
      "email": "cliente@example.com",
      "vat_number": "IT12345678901",
      ...
    }
  ],
  "count": 1
}
```

---

## 🧪 Test 4: Test nell'App

1. Vai all'applicazione: `https://pizza-pro-pink.vercel.app`
2. Fai login
3. Nel menu laterale, clicca su **"Nuovo Preventivo"** (sezione "Preventivi")
4. Nel campo di ricerca, prova a cercare un cliente
5. ✅ **Se vedi i clienti nel dropdown**, tutto funziona! 🎉

---

## 🐛 Risoluzione Problemi

### **Errore 404: NOT_FOUND**
→ Il deploy non è ancora completato o i file non sono stati deployati
**Soluzione**: Aspetta 1-2 minuti e riprova

### **Errore 401 Unauthorized**
→ La "Chiave API" è errata
**Soluzione**: 
- Vai su Platform → Impostazioni → Integrazioni → Generale
- Controlla di aver copiato esattamente il valore di "Chiave API"
- Verifica su Vercel che non ci siano spazi extra

### **Errore 404 nell'endpoint del CRM**
→ Il "Webhook Location" è errato o incompleto
**Soluzione**: 
- Vai su Platform → Impostazioni → Integrazioni → Generale
- Controlla di aver copiato TUTTO l'URL di "Webhook Location"
- Deve iniziare con `https://` ed essere l'URL completo

### **Nessun cliente restituito**
→ L'endpoint potrebbe restituire dati in un formato diverso
**Soluzione**: 
- Controlla i log di Vercel (Deployments → clicca sul deploy → Logs)
- Guarda la risposta effettiva del CRM

---

## ✅ Checklist Finale

- [ ] Il deploy è completato su Vercel
- [ ] Ho testato `/api/crm/test-clients` e funziona
- [ ] Ho testato `/api/crm/clients` e restituisce i clienti
- [ ] Ho testato l'app e vedo i clienti nel modulo Preventivi

**Se tutte le caselle sono spuntate, sei pronto! 🎉**

