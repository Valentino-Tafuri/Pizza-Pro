import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Inizializza Firebase Admin (se non già inizializzato)
let db: admin.firestore.Firestore;

try {
  if (!admin.apps.length) {
    // Prova con credenziali da variabili d'ambiente (se disponibili)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'pizza-pro-tafuri'
      });
    } else {
      // Fallback: inizializza senza credenziali (funziona solo se le regole Firebase lo permettono)
      admin.initializeApp({
        projectId: 'pizza-pro-tafuri'
      });
    }
  }
  db = admin.firestore();
  console.log('[Telegram] Firebase Admin inizializzato correttamente');
} catch (error) {
  console.error('[Telegram] Errore inizializzazione Firebase Admin:', error);
  // Fallback: usa Firestore REST API se Admin SDK non funziona
  db = null as any;
}

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { id: number; username?: string; first_name?: string };
  };
}

// Helper per inviare messaggio Telegram
async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN non configurato');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error('Errore invio Telegram:', error);
  }
}

// Trova user_id dal chat_id Telegram usando Firestore REST API
async function getUserIdFromTelegramChatId(chatId: number): Promise<string | null> {
  try {
    const chatIdStr = chatId.toString();
    const chatIdNum = chatId;
    
    console.log(`[Telegram] Cercando Chat ID: ${chatId} (stringa: "${chatIdStr}", numero: ${chatIdNum})`);
    
    // Usa Firestore REST API invece di Admin SDK
    const projectId = 'pizza-pro-tafuri';
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`;
    
    console.log(`[Telegram] Chiamata Firestore REST API: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[Telegram] Errore Firestore API: ${response.status} ${response.statusText}`);
      // Se Firebase Admin è disponibile, prova con quello
      if (db) {
        console.log(`[Telegram] Fallback a Firebase Admin SDK...`);
        return await getUserIdFromFirebaseAdmin(chatId);
      }
      return null;
    }
    
    const data = await response.json();
    const documents = data.documents || [];
    
    console.log(`[Telegram] Trovati ${documents.length} utenti totali`);
    
    for (const doc of documents) {
      const userId = doc.name.split('/').pop();
      const userData = doc.fields || {};
      
      // Estrai telegramChatId dai campi Firestore
      const savedChatId = userData.telegramChatId?.stringValue || 
                         userData.telegramChatId?.integerValue ||
                         userData.telegramChatId?.doubleValue;
      
      if (savedChatId) {
        const savedStr = String(savedChatId);
        console.log(`[Telegram] Utente ${userId}: telegramChatId="${savedStr}"`);
        
        // Verifica se corrisponde
        if (savedStr === chatIdStr || 
            Number(savedStr) === chatIdNum ||
            savedStr.trim() === chatIdStr) {
          console.log(`[Telegram] ✅ Utente trovato: ${userId}`);
          return userId;
        }
      }
    }
    
    console.log(`[Telegram] ❌ Nessun utente trovato con Chat ID: ${chatId}`);
    return null;
  } catch (error) {
    console.error('[Telegram] Errore ricerca user:', error);
    // Fallback a Firebase Admin se disponibile
    if (db) {
      console.log(`[Telegram] Fallback a Firebase Admin SDK...`);
      return await getUserIdFromFirebaseAdmin(chatId);
    }
    return null;
  }
}

// Fallback: usa Firebase Admin SDK se disponibile
async function getUserIdFromFirebaseAdmin(chatId: number): Promise<string | null> {
  try {
    if (!db) return null;
    
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    const chatIdStr = chatId.toString();
    const chatIdNum = chatId;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const savedChatId = userData.telegramChatId;
      
      if (savedChatId && (
        savedChatId === chatIdStr || 
        savedChatId === chatIdNum ||
        String(savedChatId).trim() === chatIdStr ||
        Number(savedChatId) === chatIdNum
      )) {
        return userDoc.id;
      }
    }
    return null;
  } catch (error) {
    console.error('[Telegram] Errore Firebase Admin:', error);
    return null;
  }
}

// Leggi dati da Firebase
async function getData(uid: string, collectionName: string): Promise<any[]> {
  try {
    const colRef = db.collection(`users/${uid}/${collectionName}`);
    const snapshot = await colRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Errore lettura ${collectionName}:`, error);
    return [];
  }
}

// Comando /stock - Mostra scorte magazzino
async function handleStockCommand(uid: string, chatId: number): Promise<void> {
  const [ingredients, subRecipes, preparationSettings] = await Promise.all([
    getData(uid, 'ingredients'),
    getData(uid, 'subRecipes'),
    getData(uid, 'preparationSettings')
  ]);

  // Crea mappa settings
  const settingsMap = new Map();
  preparationSettings.forEach((s: any) => {
    settingsMap.set(s.id, s);
  });

  // Filtra solo preparazioni attive
  const activePreparations = subRecipes
    .filter((sr: any) => {
      const settings = settingsMap.get(sr.id);
      const isActive = sr.fifoLabel === true ? true : (settings?.isActive || false);
      return isActive;
    })
    .map((sr: any) => {
      const settings = settingsMap.get(sr.id) || { minStock: 5, currentStock: 0 };
      return {
        name: sr.name,
        currentStock: settings.currentStock || 0,
        minStock: settings.minStock || 5,
        unit: 'pz'
      };
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  if (activePreparations.length === 0) {
    await sendTelegramMessage(chatId, '📦 *MAGAZZINO*\n\nNessuna preparazione attiva trovata.');
    return;
  }

  let message = '📦 *MAGAZZINO - SCORTE ATTIVE*\n\n';
  
  // Separa per scorte basse e normali
  const lowStock = activePreparations.filter((p: any) => p.currentStock <= p.minStock);
  const normalStock = activePreparations.filter((p: any) => p.currentStock > p.minStock);

  if (lowStock.length > 0) {
    message += '⚠️ *SCORTE BASSE:*\n';
    lowStock.forEach((p: any) => {
      const status = p.currentStock === 0 ? '🔴' : '🟡';
      message += `${status} *${p.name}*\n`;
      message += `   Stock: ${p.currentStock} / ${p.minStock} ${p.unit}\n`;
      if (p.currentStock < p.minStock) {
        message += `   ⚠️ Mancano ${p.minStock - p.currentStock} ${p.unit}\n`;
      }
      message += '\n';
    });
  }

  if (normalStock.length > 0) {
    message += '✅ *SCORTE NORMALI:*\n';
    normalStock.slice(0, 10).forEach((p: any) => {
      message += `✅ *${p.name}*\n`;
      message += `   Stock: ${p.currentStock} / ${p.minStock} ${p.unit}\n\n`;
    });
    if (normalStock.length > 10) {
      message += `\n... e altre ${normalStock.length - 10} preparazioni`;
    }
  }

  await sendTelegramMessage(chatId, message);
}

// Comando /magazzino - Dettagli magazzino completo
async function handleMagazzinoCommand(uid: string, chatId: number): Promise<void> {
  const [ingredients, subRecipes, preparationSettings] = await Promise.all([
    getData(uid, 'ingredients'),
    getData(uid, 'subRecipes'),
    getData(uid, 'preparationSettings')
  ]);

  const settingsMap = new Map();
  preparationSettings.forEach((s: any) => {
    settingsMap.set(s.id, s);
  });

  const activePreparations = subRecipes
    .filter((sr: any) => {
      const settings = settingsMap.get(sr.id);
      return sr.fifoLabel === true ? true : (settings?.isActive || false);
    })
    .map((sr: any) => {
      const settings = settingsMap.get(sr.id) || { minStock: 5, currentStock: 0 };
      return {
        name: sr.name,
        category: sr.category || 'Altro',
        currentStock: settings.currentStock || 0,
        minStock: settings.minStock || 5,
        unit: 'pz'
      };
    })
    .sort((a: any, b: any) => {
      // Prima per categoria, poi per nome
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

  if (activePreparations.length === 0) {
    await sendTelegramMessage(chatId, '📦 *MAGAZZINO COMPLETO*\n\nNessuna preparazione attiva.');
    return;
  }

  // Raggruppa per categoria
  const byCategory: { [key: string]: any[] } = {};
  activePreparations.forEach((p: any) => {
    if (!byCategory[p.category]) {
      byCategory[p.category] = [];
    }
    byCategory[p.category].push(p);
  });

  let message = '📦 *MAGAZZINO COMPLETO*\n\n';
  
  Object.keys(byCategory).sort().forEach(category => {
    message += `\n*${category.toUpperCase()}*\n`;
    byCategory[category].forEach((p: any) => {
      const emoji = p.currentStock <= p.minStock ? '⚠️' : '✅';
      message += `${emoji} *${p.name}*\n`;
      message += `   ${p.currentStock} / ${p.minStock} ${p.unit}\n`;
    });
  });

  await sendTelegramMessage(chatId, message);
}

// Comando /ricerca - Cerca ricette e topping
async function handleRicercaCommand(uid: string, chatId: number, searchTerm: string): Promise<void> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    await sendTelegramMessage(chatId, '🔍 *RICERCA*\n\nInserisci un termine di ricerca (minimo 2 caratteri).\n\nEsempio: `/ricerca margherita`');
    return;
  }

  const [subRecipes, menu] = await Promise.all([
    getData(uid, 'subRecipes'),
    getData(uid, 'menu')
  ]);

  const searchLower = searchTerm.toLowerCase();
  
  // Cerca in subRecipes (ricette/topping)
  const matchingSubRecipes = subRecipes.filter((sr: any) => 
    sr.name.toLowerCase().includes(searchLower) ||
    (sr.category && sr.category.toLowerCase().includes(searchLower))
  );

  // Cerca in menu (pizze)
  const matchingMenu = menu.filter((m: any) => 
    m.name.toLowerCase().includes(searchLower) ||
    (m.category && m.category.toLowerCase().includes(searchLower))
  );

  if (matchingSubRecipes.length === 0 && matchingMenu.length === 0) {
    await sendTelegramMessage(chatId, `🔍 *RICERCA: "${searchTerm}"*\n\nNessun risultato trovato.`);
    return;
  }

  let message = `🔍 *RICERCA: "${searchTerm}"*\n\n`;

  if (matchingSubRecipes.length > 0) {
    message += `*RICETTE/TOPPING (${matchingSubRecipes.length}):*\n`;
    matchingSubRecipes.slice(0, 10).forEach((sr: any) => {
      message += `\n📝 *${sr.name}*\n`;
      if (sr.category) message += `   Categoria: ${sr.category}\n`;
      if (sr.components && sr.components.length > 0) {
        message += `   Componenti: ${sr.components.length}\n`;
      }
    });
    if (matchingSubRecipes.length > 10) {
      message += `\n... e altre ${matchingSubRecipes.length - 10} ricette`;
    }
  }

  if (matchingMenu.length > 0) {
    message += `\n\n*PIZZE (${matchingMenu.length}):*\n`;
    matchingMenu.slice(0, 10).forEach((m: any) => {
      message += `\n🍕 *${m.name}*\n`;
      if (m.category) message += `   Categoria: ${m.category}\n`;
      if (m.sellingPrice) message += `   Prezzo: €${m.sellingPrice.toFixed(2)}\n`;
    });
    if (matchingMenu.length > 10) {
      message += `\n... e altre ${matchingMenu.length - 10} pizze`;
    }
  }

  await sendTelegramMessage(chatId, message);
}

// Handler principale
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Endpoint di test GET per verificare la configurazione
  if (req.method === 'GET' && req.query.test === 'true') {
    try {
      const chatId = req.query.chatId ? Number(req.query.chatId) : 7457662742;
      const userId = await getUserIdFromTelegramChatId(chatId);
      
      return res.status(200).json({
        chatId: chatId,
        userId: userId,
        found: !!userId,
        firebaseInitialized: !!db,
        message: userId 
          ? `✅ Utente trovato: ${userId}` 
          : '❌ Utente non trovato. Verifica che il Chat ID sia salvato in Firebase.'
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Errore test',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  // Verifica metodo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verifica che il body esista e sia valido
    if (!req.body) {
      console.error('[Telegram Webhook] Body mancante');
      return res.status(400).json({ error: 'Body mancante' });
    }

    const update: TelegramUpdate = req.body;

    // Verifica che sia un messaggio
    if (!update || !update.message || !update.message.text) {
      console.log('[Telegram Webhook] Nessun messaggio valido, ignorando');
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat?.id;
    const text = update.message.text?.trim();
    const from = update.message.from;

    if (!chatId) {
      console.error('[Telegram Webhook] Chat ID mancante nel messaggio');
      return res.status(400).json({ error: 'Chat ID mancante' });
    }

    console.log(`[Telegram] Messaggio da chat ${chatId}: ${text}`);

    // Trova user_id dal chat_id
    console.log(`[Telegram Webhook] Cercando utente per Chat ID: ${chatId}`);
    const userId = await getUserIdFromTelegramChatId(chatId);

    if (!userId) {
      console.log(`[Telegram Webhook] ❌ Utente non trovato per Chat ID: ${chatId}`);
      // Mostra anche informazioni di debug
      await sendTelegramMessage(
        chatId,
        '⚠️ *UTENTE NON CONFIGURATO*\n\nPer usare questo bot, configura il tuo Chat ID Telegram nelle impostazioni dell\'app.\n\nIl tuo Chat ID è: `' + chatId + '`\n\n*Verifica:*\n1. Hai inserito il Chat ID nel campo "Telegram Chat ID"?\n2. Hai cliccato "Salva Modifiche Profilo"?\n3. Hai atteso qualche secondo per la sincronizzazione?'
      );
      return res.status(200).json({ ok: true });
    }
    
    console.log(`[Telegram Webhook] ✅ Utente trovato: ${userId} per Chat ID: ${chatId}`);

    // Gestisci comandi
    if (text.startsWith('/start') || text.startsWith('/help')) {
      const userId = await getUserIdFromTelegramChatId(chatId);
      
      if (!userId) {
        // Se l'utente non è configurato, mostra il Chat ID
        const startMessage = `🤖 *PIZZA PRO BOT*\n\n` +
          `Benvenuto! Per usare questo bot, devi configurare il tuo Chat ID nelle impostazioni dell'app.\n\n` +
          `*Il tuo Chat ID è:*\n\`${chatId}\`\n\n` +
          `*Come configurare:*\n` +
          `1. Vai nelle Impostazioni dell'app\n` +
          `2. Sezione "Profilo Utente"\n` +
          `3. Inserisci questo Chat ID nel campo "Telegram Chat ID"\n` +
          `4. Salva\n\n` +
          `Dopo la configurazione, potrai usare i comandi:\n\n` +
          `📦 /stock - Mostra scorte magazzino\n` +
          `📦 /magazzino - Dettagli magazzino completo\n` +
          `🔍 /ricerca <termine> - Cerca ricette, topping o pizze`;
        await sendTelegramMessage(chatId, startMessage);
      } else {
        // Utente configurato, mostra help
        const helpMessage = `🤖 *PIZZA PRO BOT*\n\n*Comandi disponibili:*\n\n` +
          `📦 /stock - Mostra scorte magazzino\n` +
          `📦 /magazzino - Dettagli magazzino completo\n` +
          `🔍 /ricerca <termine> - Cerca ricette, topping o pizze\n\n` +
          `*Esempi:*\n` +
          `\`/ricerca margherita\`\n` +
          `\`/ricerca pomodoro\``;
        await sendTelegramMessage(chatId, helpMessage);
      }
    }
    else if (text.startsWith('/stock')) {
      await handleStockCommand(userId, chatId);
    }
    else if (text.startsWith('/magazzino')) {
      await handleMagazzinoCommand(userId, chatId);
    }
    else if (text.startsWith('/ricerca')) {
      const searchTerm = text.replace('/ricerca', '').trim();
      await handleRicercaCommand(userId, chatId, searchTerm);
    }
    else {
      await sendTelegramMessage(
        chatId,
        '❓ Comando non riconosciuto. Usa /help per vedere i comandi disponibili.'
      );
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[Telegram Webhook] Errore:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

