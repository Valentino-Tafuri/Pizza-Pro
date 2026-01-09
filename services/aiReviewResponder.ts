import { GoogleGenAI } from '@google/genai';
import { Review, AIReviewResponse } from '../types';

export const generateReviewResponse = async (
  review: Review,
  restaurantName: string
): Promise<AIReviewResponse> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey.includes('PLACEHOLDER')) {
    // Fallback response se API key non configurata
    return {
      suggestedText: `Grazie per la tua recensione! Il tuo feedback è molto importante per noi. ${
        review.rating >= 4 
          ? 'Siamo felici che tu abbia apprezzato la tua esperienza. Ti aspettiamo presto!' 
          : 'Ci scusiamo per l\'inconveniente. Contattaci per risolvere la situazione.'
      }`,
      tone: 'formal',
      keyPoints: ['Ringraziamento', 'Feedback importante', 'Invito/Scuse'],
      sentiment: 'neutral'
    };
  }

  const genAI = new GoogleGenAI({ apiKey });
  const model = genAI.models.generateContent;

  const prompt = `
Sei l'assistente di ${restaurantName}, un ristorante italiano.
Genera una risposta professionale, cordiale e personalizzata a questa recensione.

RECENSIONE:
Platform: ${review.platform}
Rating: ${review.rating}/5 stelle
${review.title ? `Titolo: ${review.title}` : ''}
Testo: ${review.text}

ISTRUZIONI:
1. Scrivi in italiano corretto
2. Tono: ${review.rating >= 4 ? 'caloroso e ringraziamento' : review.rating === 3 ? 'professionale e costruttivo' : 'empatico e scuse sincere'}
3. Menziona almeno 1 punto specifico della recensione
4. ${review.rating >= 4 ? 'Invita a tornare' : 'Offri di risolvere il problema'}
5. Firma come "${restaurantName}"
6. Max 120 parole
7. Usa un tono umano, NON robotico

IMPORTANTE: Genera SOLO il testo della risposta, senza introduzioni o spiegazioni.
`;

  try {
    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-pro',
      contents: prompt
    });
    const text = result.text;

    // Analizza sentiment e key points
    const tone = review.rating >= 4 ? 'friendly' : review.rating === 3 ? 'formal' : 'apologetic';
    
    // Estrai punti chiave (semplice regex per frasi)
    const sentences = text.split('.').filter(s => s.trim().length > 10);
    const keyPoints = sentences.slice(0, 3).map(s => s.trim());

    return {
      suggestedText: text.trim(),
      tone,
      keyPoints,
      sentiment: review.rating >= 4 ? 'positive' : review.rating === 3 ? 'neutral' : 'negative'
    };
  } catch (error: any) {
    console.error('AI Response Generation Error:', error);
    const errorMsg = error?.message || error?.toString() || 'Errore sconosciuto';
    
    // Log specifico per limiti API
    if (errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('rate limit') || errorMsg.includes('429')) {
      console.warn('⚠️ Limite API Gemini raggiunto - usando risposta fallback');
    }
    
    // Fallback response
    return {
      suggestedText: `Grazie per la tua recensione! Il tuo feedback è molto importante per noi. ${
        review.rating >= 4 
          ? 'Siamo felici che tu abbia apprezzato la tua esperienza. Ti aspettiamo presto!' 
          : 'Ci scusiamo per l\'inconveniente. Contattaci per risolvere la situazione.'
      }`,
      tone: 'formal',
      keyPoints: ['Ringraziamento', 'Feedback importante', 'Invito/Scuse'],
      sentiment: 'neutral'
    };
  }
};

export const analyzeSentiment = (text: string, rating: number): 'positive' | 'neutral' | 'negative' => {
  if (rating >= 4) return 'positive';
  if (rating === 3) return 'neutral';
  return 'negative';
};

export const extractKeywords = (text: string): string[] => {
  // Keyword extraction semplice (migliora con NLP se necessario)
  const commonWords = ['il', 'la', 'di', 'da', 'un', 'una', 'per', 'con', 'sono', 'essere', 'avere', 'molto', 'più', 'the', 'and', 'is', 'are', 'was', 'were'];
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4 && !commonWords.includes(w));
  
  // Conta occorrenze
  const freq = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Top 5 keywords
  return Object.entries(freq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
};

