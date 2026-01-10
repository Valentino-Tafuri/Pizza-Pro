/**
 * Script di pulizia per eliminare tutti i clienti CRM e le configurazioni Platform
 * 
 * UTILIZZO:
 * 1. Apri la console del browser (F12)
 * 2. Esegui: window.cleanupCRMData()
 * 
 * Oppure importa e usa nel codice:
 * import { cleanupCRMData, checkDatabaseUsage } from './scripts/cleanup-crm-data';
 */

import { db } from '../firebase';
import { collection, getDocs, deleteDoc, query, limit } from 'firebase/firestore';
import { deleteAllData } from '../services/database';

/**
 * Elimina tutti i clienti CRM per un utente specifico
 * @param userId - Firebase User ID
 * @returns Numero di clienti eliminati
 */
export async function cleanupCRMData(userId: string): Promise<number> {
  if (!userId) {
    throw new Error('User ID richiesto');
  }

  try {
    console.log(`🧹 Inizio pulizia clienti CRM per utente: ${userId}`);
    
    // Usa la funzione deleteAllData esistente
    const deletedCount = await deleteAllData(userId, 'crmClients');
    
    console.log(`✅ Pulizia completata! Eliminati ${deletedCount} clienti.`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Errore durante la pulizia:', error);
    throw error;
  }
}

/**
 * Controlla l'utilizzo del database per un utente
 * @param userId - Firebase User ID
 * @returns Statistiche sull'utilizzo del database
 */
export async function checkDatabaseUsage(userId: string): Promise<{
  collections: Array<{ name: string; count: number }>;
  totalDocuments: number;
}> {
  if (!userId) {
    throw new Error('User ID richiesto');
  }

  try {
    console.log(`📊 Controllo utilizzo database per utente: ${userId}`);
    
    // Liste delle collezioni principali
    const collections = [
      'ingredients',
      'subRecipes',
      'menu',
      'suppliers',
      'employees',
      'preferments',
      'crmClients',
      'quotes',
      'fifoLabels',
      'stockMovements',
      'preparationSettings',
      'platformConnections'
    ];

    const stats: Array<{ name: string; count: number }> = [];
    let totalDocuments = 0;

    for (const collectionName of collections) {
      try {
        const colRef = collection(db, `users/${userId}/${collectionName}`);
        // Limita a 1000 per evitare timeout (Firestore ha limiti di lettura)
        const q = query(colRef, limit(1000));
        const snapshot = await getDocs(q);
        const count = snapshot.size;
        stats.push({ name: collectionName, count });
        totalDocuments += count;
        
        if (count > 0) {
          console.log(`  - ${collectionName}: ${count} documenti`);
        }
      } catch (error) {
        console.warn(`  - ${collectionName}: errore nel conteggio`, error);
        stats.push({ name: collectionName, count: 0 });
      }
    }

    console.log(`\n📈 Totale documenti: ${totalDocuments}`);
    
    return {
      collections: stats,
      totalDocuments
    };
  } catch (error) {
    console.error('❌ Errore durante il controllo:', error);
    throw error;
  }
}

/**
 * Funzione globale esposta al window per uso dalla console
 * Esegui dalla console: window.cleanupCRMData('USER_ID')
 */
if (typeof window !== 'undefined') {
  (window as any).cleanupCRMData = cleanupCRMData;
  (window as any).checkDatabaseUsage = checkDatabaseUsage;
  
  console.log('✅ Funzioni di pulizia disponibili:');
  console.log('  - window.cleanupCRMData(userId) - Elimina tutti i clienti CRM');
  console.log('  - window.checkDatabaseUsage(userId) - Controlla utilizzo database');
}
