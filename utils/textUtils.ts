// Funzione helper per normalizzare il testo (prima maiuscola, resto minuscolo)
export const normalizeText = (text: string): string => {
  if (!text) return '';
  // Gestisce anche nomi composti (es. "MARIO ROSSI" -> "Mario Rossi")
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Categorie del laboratorio che non devono apparire come topping
export const LAB_CATEGORIES = ['Pizza', 'Pane', 'Dolci', 'Panificazione', 'Focaccia', 'Taralli', 'Biscotti', 'Grissini', 'Crackers'];

// Verifica se una categoria è una categoria del laboratorio
export const isLabCategory = (category: string | null | undefined): boolean => {
  if (!category) return false;
  return LAB_CATEGORIES.includes(category);
};




