/**
 * Script di utilità per pulire i dati dell'economato di un utente
 * 
 * Uso dalla console del browser:
 * 1. Apri la console del browser (F12)
 * 2. Importa la funzione: import { cleanupUserEconomato } from './utils/cleanupEconomato'
 * 3. Esegui: cleanupUserEconomato('USER_UID')
 * 
 * Oppure usa direttamente:
 * cleanupUserEconomato('0MRzrnNHtBhsw8tcrc1z2yVfaKT2')
 */

import { deleteAllData } from '../services/database';

/**
 * Pulisce tutti gli ingredienti dell'economato per un utente specifico
 * @param uid - User ID dell'utente
 * @returns Promise con il numero di ingredienti eliminati
 */
export const cleanupUserEconomato = async (uid: string): Promise<number> => {
  if (!uid) {
    throw new Error('UID utente richiesto');
  }

  console.log(`🧹 Inizio pulizia economato per utente: ${uid}`);
  
  try {
    const deletedCount = await deleteAllData(uid, 'ingredients');
    console.log(`✅ Pulizia completata! Eliminati ${deletedCount} ingredienti.`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Errore durante la pulizia:', error);
    throw error;
  }
};

// Esegui automaticamente se chiamato direttamente con l'UID fornito
if (import.meta.hot) {
  // Solo in sviluppo, esporta la funzione globalmente per uso nella console
  (window as any).cleanupUserEconomato = cleanupUserEconomato;
}



