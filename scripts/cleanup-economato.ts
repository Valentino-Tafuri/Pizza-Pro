/**
 * Script per pulire i dati dell'economato di un utente
 * 
 * Uso:
 * 1. Installa Firebase Admin SDK: npm install firebase-admin
 * 2. Configura le credenziali Firebase (vedi README)
 * 3. Esegui: npx tsx scripts/cleanup-economato.ts <USER_UID>
 * 
 * Oppure con Node.js:
 * node --loader ts-node/esm scripts/cleanup-economato.ts <USER_UID>
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Configurazione Firebase Admin
// NOTA: Per usare questo script, devi avere un file di credenziali Firebase Admin
// Scaricalo da Firebase Console > Project Settings > Service Accounts
const firebaseConfig = {
  projectId: 'pizza-pro-tafuri',
  // Aggiungi qui le credenziali del service account
  // credential: cert(require('./path/to/serviceAccountKey.json'))
};

// Inizializza Firebase Admin (solo se non è già inizializzato)
if (getApps().length === 0) {
  try {
    initializeApp(firebaseConfig);
  } catch (error) {
    console.error('❌ Errore nell\'inizializzazione di Firebase Admin:', error);
    console.log('💡 Assicurati di aver configurato le credenziali del service account');
    process.exit(1);
  }
}

const db = getFirestore();

/**
 * Elimina tutti gli ingredienti dell'economato per un utente
 */
async function cleanupUserEconomato(uid: string): Promise<number> {
  if (!uid) {
    throw new Error('UID utente richiesto');
  }

  console.log(`🧹 Inizio pulizia economato per utente: ${uid}`);
  
  try {
    const ingredientsRef = db.collection(`users/${uid}/ingredients`);
    const snapshot = await ingredientsRef.get();
    
    if (snapshot.empty) {
      console.log('ℹ️ Nessun ingrediente trovato per questo utente');
      return 0;
    }
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    const deletedCount = snapshot.docs.length;
    console.log(`✅ Pulizia completata! Eliminati ${deletedCount} ingredienti.`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Errore durante la pulizia:', error);
    throw error;
  }
}

// Esegui lo script
const uid = process.argv[2];

if (!uid) {
  console.error('❌ UID utente richiesto');
  console.log('Uso: npx tsx scripts/cleanup-economato.ts <USER_UID>');
  process.exit(1);
}

cleanupUserEconomato(uid)
  .then(count => {
    console.log(`\n✨ Operazione completata: ${count} ingredienti eliminati`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  });



