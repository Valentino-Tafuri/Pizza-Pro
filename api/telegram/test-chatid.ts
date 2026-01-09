import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Inizializza Firebase Admin (se non già inizializzato)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: 'pizza-pro-tafuri'
    });
  } catch (error) {
    console.error('Errore inizializzazione Firebase Admin:', error);
  }
}

const db = admin.firestore();

// Endpoint per testare se il Chat ID è salvato
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const chatId = req.query.chatId as string;
  
  if (!chatId) {
    return res.status(400).json({ error: 'Chat ID richiesto' });
  }

  try {
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    
    const results: any[] = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const savedChatId = userData.telegramChatId;
      
      results.push({
        userId: userDoc.id,
        telegramChatId: savedChatId,
        type: typeof savedChatId,
        matches: savedChatId === chatId || String(savedChatId) === chatId || Number(savedChatId) === Number(chatId),
        firstName: userData.firstName,
        lastName: userData.lastName
      });
    }
    
    return res.status(200).json({
      searchedChatId: chatId,
      totalUsers: results.length,
      users: results,
      found: results.some(r => r.matches)
    });
  } catch (error) {
    console.error('Errore test:', error);
    return res.status(500).json({ 
      error: 'Errore interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

