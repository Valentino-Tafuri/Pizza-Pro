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

// Trova user_id dal chat_id Telegram
async function getUserIdFromTelegramChatId(chatId: number): Promise<string | null> {
  try {
    // Cerca in tutti gli utenti chi ha questo chat_id configurato
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    
    const chatIdStr = chatId.toString();
    const chatIdNum = chatId;
    
    console.log(`[Telegram] Cercando Chat ID: ${chatId} (stringa: "${chatIdStr}", numero: ${chatIdNum})`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const savedChatId = userData.telegramChatId;
      
      // Log per debug
      if (savedChatId) {
        console.log(`[Telegram] Utente ${userDoc.id}: telegramChatId="${savedChatId}" (tipo: ${typeof savedChatId})`);
      }
      
      // Verifica se l'utente ha configurato il chat_id (confronta come stringa e numero)
      if (savedChatId && (
        savedChatId === chatIdStr || 
        savedChatId === chatIdNum ||
        String(savedChatId).trim() === chatIdStr ||
        Number(savedChatId) === chatIdNum
      )) {
        console.log(`[Telegram] ✅ Utente trovato: ${userDoc.id}`);
        return userDoc.id;
      }
    }
    
    console.log(`[Telegram] ❌ Nessun utente trovato con Chat ID: ${chatId}`);
    return null;
  } catch (error) {
    console.error('[Telegram] Errore ricerca user:', error);
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
  // Verifica metodo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update: TelegramUpdate = req.body;

    // Verifica che sia un messaggio
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const from = update.message.from;

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

