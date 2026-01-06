/**
 * Utility per generare PDF professionali delle ricette
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Ingredient } from '../types';
import { DoughCalculationResult } from './doughCalculator';
import { Preferment } from '../components/Views/PrefermentiView';

// Parametri di gestione per ogni fase
interface PhaseManagement {
  time: string;
  temp: string;
  procedure: string;
}

interface RecipePDFData {
  name: string;
  category: string;
  hydration: number;
  result: DoughCalculationResult;
  ingredients: Ingredient[];
  portionWeight?: number;
  preferment?: Preferment | null;
  userName?: string; // Nome utente per il PDF
  // Parametri di gestione fasi
  management?: {
    preferment?: PhaseManagement;
    autolysis?: PhaseManagement;
    mixing?: PhaseManagement;
    puntata?: PhaseManagement;
    appretto?: PhaseManagement;
    cooking?: PhaseManagement;
  };
}

export function generateRecipePDF(data: RecipePDFData): void {
  const doc = new jsPDF();
  
  const { name, category, hydration, result, ingredients, portionWeight, preferment, userName, management } = data;
  
  // Helper per ottenere nome ingrediente
  const getIngredientName = (id: string): string => {
    return ingredients.find(i => i.id === id)?.name || 'Ingrediente sconosciuto';
  };
  
  // Calcola farina totale
  const totalFlour = (result.preferment?.flour || 0) + 
                     (result.autolysis?.flour || 0) + 
                     result.closure.remainingFlour;
  
  // Colori personalizzati
  const primaryColor = [0, 0, 0]; // Nero
  const secondaryColor = [100, 100, 100]; // Grigio
  
  // HEADER con nome utente e titolo (stile professionale)
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Nome utente (al posto del logo)
  if (userName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 140, 0);
    const userNameWidth = doc.getTextWidth(userName.toUpperCase());
    doc.text(userName.toUpperCase(), 14, 17);
    
    // Testo "LE RICETTE" sotto il nome
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('LE RICETTE', 14, 22);
  } else {
    // Fallback se non c'è nome utente
    doc.setFontSize(8);
    doc.setTextColor(255, 140, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('LE RICETTE', 14, 17);
  }
  
  // Titolo principale (centrato, grande, bold)
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  const title = name.toUpperCase();
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, 38);
  
  let yPosition = 55;
  
  // ============================================
  // TABELLA BILANCIAMENTO
  // ============================================
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('BILANCIAMENTO', 14, yPosition);
  yPosition += 5;
  
  const balanceData: any[] = [];
  
  // Pre-fermento
  if (result.preferment) {
    result.preferment.flourBreakdown.forEach(flour => {
      const amount = flour.amount;
      const percentage = totalFlour > 0 ? ((amount / totalFlour) * 100).toFixed(1) : '0.0';
      balanceData.push([
        'PRE-FERMENTO',
        getIngredientName(flour.flourId),
        `${amount.toFixed(1)} g`,
        `${percentage}%`
      ]);
    });
    
    if (result.preferment.water > 0) {
      const percentage = totalFlour > 0 ? ((result.preferment.water / totalFlour) * 100).toFixed(1) : '0.0';
      balanceData.push([
        'PRE-FERMENTO',
        'Acqua',
        `${result.preferment.water.toFixed(1)} g`,
        `${percentage}%`
      ]);
    }
    
    if (result.preferment.yeast > 0) {
      const percentage = totalFlour > 0 ? ((result.preferment.yeast / totalFlour) * 100).toFixed(2) : '0.00';
      balanceData.push([
        'PRE-FERMENTO',
        'Lievito',
        `${result.preferment.yeast.toFixed(2)} g`,
        `${percentage}%`
      ]);
    }
    
    if (result.preferment.salt && result.preferment.salt > 0) {
      const percentage = totalFlour > 0 ? ((result.preferment.salt / totalFlour) * 100).toFixed(2) : '0.00';
      balanceData.push([
        'PRE-FERMENTO',
        'Sale',
        `${result.preferment.salt.toFixed(2)} g`,
        `${percentage}%`
      ]);
    }
  }
  
  // Autolisi
  if (result.autolysis) {
    result.autolysis.flourBreakdown.forEach(flour => {
      const amount = flour.amount;
      const percentage = totalFlour > 0 ? ((amount / totalFlour) * 100).toFixed(1) : '0.0';
      balanceData.push([
        'AUTOLISI',
        getIngredientName(flour.flourId),
        `${amount.toFixed(1)} g`,
        `${percentage}%`
      ]);
    });
    
    if (result.autolysis.water > 0) {
      const percentage = totalFlour > 0 ? ((result.autolysis.water / totalFlour) * 100).toFixed(1) : '0.0';
      balanceData.push([
        'AUTOLISI',
        'Acqua',
        `${result.autolysis.water.toFixed(1)} g`,
        `${percentage}%`
      ]);
    }
    
    if (result.autolysis.salt && result.autolysis.salt > 0) {
      const percentage = totalFlour > 0 ? ((result.autolysis.salt / totalFlour) * 100).toFixed(2) : '0.00';
      balanceData.push([
        'AUTOLISI',
        'Sale',
        `${result.autolysis.salt.toFixed(2)} g`,
        `${percentage}%`
      ]);
    }
  }
  
  // Chiusura
  result.closure.flourBreakdown.forEach(flour => {
    const amount = flour.amount;
    const percentage = totalFlour > 0 ? ((amount / totalFlour) * 100).toFixed(1) : '0.0';
    balanceData.push([
      'CHIUSURA',
      getIngredientName(flour.flourId),
      `${amount.toFixed(1)} g`,
      `${percentage}%`
    ]);
  });
  
  if (result.closure.water > 0) {
    const percentage = totalFlour > 0 ? ((result.closure.water / totalFlour) * 100).toFixed(1) : '0.0';
    balanceData.push([
      'CHIUSURA',
      'Acqua',
      `${result.closure.water.toFixed(1)} g`,
      `${percentage}%`
    ]);
  }
  
  if (result.closure.salt > 0) {
    const percentage = totalFlour > 0 ? ((result.closure.salt / totalFlour) * 100).toFixed(2) : '0.00';
    balanceData.push([
      'CHIUSURA',
      'Sale',
      `${result.closure.salt.toFixed(2)} g`,
      `${percentage}%`
    ]);
  }
  
  if (result.closure.yeast > 0) {
    const percentage = totalFlour > 0 ? ((result.closure.yeast / totalFlour) * 100).toFixed(2) : '0.00';
    balanceData.push([
      'CHIUSURA',
      'Lievito',
      `${result.closure.yeast.toFixed(2)} g`,
      `${percentage}%`
    ]);
  }
  
  if (result.closure.oil > 0) {
    const percentage = totalFlour > 0 ? ((result.closure.oil / totalFlour) * 100).toFixed(2) : '0.00';
    balanceData.push([
      'CHIUSURA',
      'Olio',
      `${result.closure.oil.toFixed(2)} g`,
      `${percentage}%`
    ]);
  }
  
  if (result.closure.malt > 0) {
    const percentage = totalFlour > 0 ? ((result.closure.malt / totalFlour) * 100).toFixed(2) : '0.00';
    balanceData.push([
      'CHIUSURA',
      'Malto',
      `${result.closure.malt.toFixed(2)} g`,
      `${percentage}%`
    ]);
  }
  
  result.closure.additionalIngredients.forEach(ing => {
    if (ing.amount > 0) {
      const percentage = totalFlour > 0 ? ((ing.amount / totalFlour) * 100).toFixed(2) : '0.00';
      balanceData.push([
        'CHIUSURA',
        getIngredientName(ing.ingredientId),
        `${ing.amount.toFixed(2)} g`,
        `${percentage}%`
      ]);
    }
  });
  
  autoTable(doc, {
    startY: yPosition,
    head: [['FASE', 'INGREDIENTI', 'QUANTITÀ (G)', '% SULLA FARINA']],
    body: balanceData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 }
    },
    margin: { left: 14, right: 14 }
  });
  
  // ============================================
  // TABELLA GESTIONE
  // ============================================
  let finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;
  finalY += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('GESTIONE', 14, finalY);
  finalY += 5;
  
  const managementData: any[] = [];
  const mgmt = data.management;

  // Pre-fermento
  if (result.preferment && preferment) {
    const prefMgmt = mgmt?.preferment;
    managementData.push([
      'PRE-FERMENTO',
      prefMgmt?.procedure || preferment.procedure || 'Preparazione pre-fermento secondo le specifiche del tipo selezionato.',
      prefMgmt?.time ? `${prefMgmt.time} ore` : `${preferment.storageTime} ore`,
      prefMgmt?.temp ? `${prefMgmt.temp}°C` : `${preferment.storageTemperature}°C`
    ]);
  }

  // Autolisi
  if (result.autolysis) {
    const autoMgmt = mgmt?.autolysis;
    managementData.push([
      'AUTOLISI',
      autoMgmt?.procedure || 'Mescolare farina e acqua fino a formare un impasto omogeneo. Lasciare riposare coperto.',
      autoMgmt?.time ? `${autoMgmt.time} min` : '30-60 min',
      autoMgmt?.temp || 'T.A.'
    ]);
  }

  // Impasto (chiusura)
  const mixMgmt = mgmt?.mixing;
  let defaultMixProcedure = 'Versare l\'acqua nella macchina con sale e lievito. Aggiungere la farina a pioggia. Impastare fino a incordatura.';
  if (result.closure.oil > 0) {
    defaultMixProcedure += ' Aggiungere l\'olio verso la fine.';
  }
  if (result.closure.malt > 0) {
    defaultMixProcedure += ' Aggiungere il malto insieme alla farina.';
  }

  managementData.push([
    'IMPASTO',
    mixMgmt?.procedure || defaultMixProcedure,
    mixMgmt?.time ? `${mixMgmt.time} min` : '15-20 min',
    mixMgmt?.temp ? `${mixMgmt.temp}°C` : '24°C'
  ]);

  // Puntata
  const puntMgmt = mgmt?.puntata;
  managementData.push([
    'PUNTATA',
    puntMgmt?.procedure || 'Lasciare l\'impasto coperto a temperatura ambiente. Eseguire pieghe se necessario.',
    puntMgmt?.time ? `${puntMgmt.time} ore` : '1-2 ore',
    puntMgmt?.temp || 'T.A.'
  ]);

  // Appretto
  const apprMgmt = mgmt?.appretto;
  managementData.push([
    portionWeight ? `APPRETTO (${portionWeight}g)` : 'APPRETTO',
    apprMgmt?.procedure || `Formare i panetti${portionWeight ? ` da ${portionWeight}g` : ''}. Lasciar lievitare, conservare in frigorifero se necessario.`,
    apprMgmt?.time ? `${apprMgmt.time} ore` : '4-8 ore',
    apprMgmt?.temp || 'T.A. / 4°C'
  ]);

  // Cottura
  const cookMgmt = mgmt?.cooking;
  managementData.push([
    'COTTURA',
    cookMgmt?.procedure || 'Cuocere in forno preriscaldato fino a doratura uniforme.',
    cookMgmt?.time ? `${cookMgmt.time} sec` : '60-90 sec',
    cookMgmt?.temp ? `${cookMgmt.temp}°C` : '450-480°C'
  ]);
  
  autoTable(doc, {
    startY: finalY,
    head: [['FASI', 'PREPARAZIONI', 'TEMPO', 'T°']],
    body: managementData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 }
    },
    margin: { left: 14, right: 14 }
  });
  
  // Footer con costi (opzionale)
  finalY = (doc as any).lastAutoTable.finalY || finalY + 50;
  if (finalY > 250) {
    doc.addPage();
    finalY = 20;
  }
  
  finalY += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ANALISI COSTI', 14, finalY);
  finalY += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Peso Totale: ${(result.totalWeight / 1000).toFixed(3)} kg`, 14, finalY);
  finalY += 6;
  doc.text(`Costo Totale: €${result.totalCost.toFixed(2)}`, 14, finalY);
  finalY += 6;
  doc.text(`Costo al Kg: €${result.costPerKg.toFixed(2)}`, 14, finalY);
  
  if (portionWeight) {
    const costPerPortion = (result.totalCost / result.totalWeight) * portionWeight;
    finalY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(138, 43, 226); // Viola
    doc.text(`Costo per Porzione (${portionWeight}g): €${costPerPortion.toFixed(2)}`, 14, finalY);
  }
  
  // Salva il PDF
  const fileName = `${name.replace(/\s+/g, '_')}_Ricetta.pdf`;
  doc.save(fileName);
}

