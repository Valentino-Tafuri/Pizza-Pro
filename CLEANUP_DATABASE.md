# 🧹 Guida alla Pulizia del Database Firebase

Questa guida spiega come eliminare tutti i clienti CRM dal database Firebase e rimuovere le configurazioni Platform.

## 📋 Prerequisiti

- Hai già esportato i clienti sul tuo PC (come hai indicato)
- Hai accesso alla console del browser (F12)
- Conosci il tuo Firebase User ID (lo trovi nella console Firebase o nella URL)

---

## 🗑️ Eliminare Tutti i Clienti CRM

### Metodo 1: Tramite UI (Consigliato)

1. Accedi all'applicazione e vai alla sezione **"PREVENTIVI" → "Clienti"**
2. Se ci sono clienti nella lista, vedrai un pulsante **"Elimina Tutti"** (rosso) in alto a destra
3. Clicca su **"Elimina Tutti"**
4. Conferma l'eliminazione nel modal che appare
5. Attendi il completamento dell'operazione

### Metodo 2: Tramite Console del Browser

1. Apri la console del browser (F12 → Console)
2. Accedi all'applicazione (devi essere loggato)
3. Trova il tuo User ID:
   ```javascript
   // Il User ID è disponibile in auth.currentUser.uid
   // Puoi ottenerlo eseguendo:
   firebase.auth().currentUser?.uid
   // O controllando nella console Firebase
   ```
4. Esegui il comando:
   ```javascript
   window.cleanupCRMData('TUO_USER_ID')
   ```
   Sostituisci `TUO_USER_ID` con il tuo Firebase User ID reale

5. Attendi il completamento. Vedrai un messaggio nella console con il numero di clienti eliminati

---

## 📊 Controllare l'Utilizzo del Database

Per vedere quanti documenti hai in ogni collezione e monitorare l'utilizzo di Firebase:

1. Apri la console del browser (F12 → Console)
2. Esegui:
   ```javascript
   window.checkDatabaseUsage('TUO_USER_ID')
   ```
   Sostituisci `TUO_USER_ID` con il tuo Firebase User ID reale

3. Vedrai un report dettagliato con:
   - Numero di documenti per ogni collezione
   - Totale documenti nel database

**Collezioni monitorate:**
- `ingredients` - Economato
- `subRecipes` - Topping
- `menu` - Menu
- `suppliers` - Fornitori
- `employees` - Dipendenti
- `preferments` - Prefermenti
- `crmClients` - **Clienti CRM** ⚠️
- `quotes` - Preventivi
- `fifoLabels` - Etichette FIFO
- `stockMovements` - Movimenti magazzino
- `preparationSettings` - Impostazioni preparazioni
- `platformConnections` - Connessioni Platform

---

## 🔧 Rimuovere Configurazioni Platform

Le configurazioni Platform sono variabili d'ambiente su **Vercel**, non documenti Firebase. Per rimuoverle:

### Su Vercel:

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Settings** → **Environment Variables**
4. Cerca e elimina queste variabili:
   - `CRM_API_KEY` (chiave API Platform)
   - `CRM_WEBHOOK_LOCATION` (URL webhook Platform)

⚠️ **Nota:** Dopo aver eliminato le variabili, è necessario fare un nuovo deployment per applicare le modifiche.

---

## 🎯 Ottimizzazioni per Evitare di Superare i Limiti Firebase

### 1. **Monitora l'Utilizzo**
Esegui periodicamente `window.checkDatabaseUsage()` per monitorare quanti documenti hai

### 2. **Elimina Dati Vecchi**
- Elimina preventivi vecchi non più necessari
- Elimina movimenti magazzino molto vecchi
- Pulisci etichette FIFO scadute

### 3. **Limitare i Dati Salvati**
- **Clienti CRM**: Considera di mantenere solo clienti attivi. Elimina quelli non utilizzati da molto tempo
- **Movimenti Magazzino**: Considera di archiviare o eliminare movimenti molto vecchi (es. > 1 anno)
- **Preventivi**: Elimina bozze vecchie e preventivi scaduti

### 4. **Usa la Paginazione**
Quando possibile, implementa la paginazione per limitare il numero di documenti caricati contemporaneamente

### 5. **Archivia Dati Importanti**
Prima di eliminare dati, esportali (CSV/JSON) per riferimento futuro

---

## 🔍 Verifica Post-Pulizia

Dopo aver eliminato i clienti:

1. Controlla nella console Firebase:
   - Vai su [Firebase Console](https://console.firebase.google.com)
   - Seleziona il tuo progetto
   - Vai su **Firestore Database**
   - Naviga a `users/TUO_USER_ID/crmClients`
   - Verifica che la collezione sia vuota

2. Controlla nell'applicazione:
   - Vai su **"PREVENTIVI" → "Clienti"**
   - Dovresti vedere "Nessun cliente trovato"

3. Controlla l'utilizzo:
   ```javascript
   window.checkDatabaseUsage('TUO_USER_ID')
   ```
   Verifica che `crmClients: 0` documenti

---

## ❓ Problemi Comuni

### Errore: "User ID richiesto"
- Assicurati di essere loggato nell'applicazione
- Verifica che il User ID sia corretto

### Errore: "Permission denied"
- Verifica le regole di sicurezza Firebase
- Assicurati di essere autenticato correttamente

### I clienti non si eliminano
- Controlla la console del browser per errori dettagliati
- Verifica la connessione internet
- Prova a ricaricare la pagina e riprovare

---

## 📞 Supporto

Se riscontri problemi:
1. Controlla la console del browser per errori dettagliati
2. Verifica le regole di sicurezza Firebase
3. Controlla i limiti del piano Firebase utilizzato

**Limiti Firebase Free Tier (Spark Plan):**
- 1 GB di storage
- 50,000 letture/giorno
- 20,000 scritture/giorno
- 20,000 eliminazioni/giorno

Se superi questi limiti, considera di aggiornare al piano Blaze (pay-as-you-go).

