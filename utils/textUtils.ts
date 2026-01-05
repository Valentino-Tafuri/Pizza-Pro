// Funzione helper per normalizzare il testo (prima maiuscola, resto minuscolo)
export const normalizeText = (text: string): string => {
  if (!text) return '';
  // Gestisce anche nomi composti (es. "MARIO ROSSI" -> "Mario Rossi")
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

