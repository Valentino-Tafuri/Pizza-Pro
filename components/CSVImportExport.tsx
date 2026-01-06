
import React, { useState, useRef } from 'react';
import { FileDown, Download, Upload, CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';
import { Ingredient, Unit, Supplier } from '../types';

interface CSVImportExportProps {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  onImport: (ingredients: Ingredient[]) => Promise<void>;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

const CSVImportExport: React.FC<CSVImportExportProps> = ({ ingredients, suppliers, onImport }) => {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validUnits: Unit[] = ['kg', 'g', 'l', 'ml', 'unit', 'pz'];

  // Parse CSV line handling quotes and commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Export ingredients to CSV
  const handleExport = () => {
    const headers = ['Nome', 'Unità', 'Prezzo per Unità (€)', 'Categoria', 'Fornitore'];
    const rows = ingredients.map(ing => {
      const supplierName = ing.supplierId 
        ? suppliers.find(s => s.id === ing.supplierId)?.name || ''
        : '';
      return [
        `"${ing.name}"`,
        `"${ing.unit}"`,
        ing.pricePerUnit.toString().replace('.', ','),
        `"${ing.category}"`,
        supplierName ? `"${supplierName}"` : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\ufeff';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const date = new Date().toISOString().split('T')[0];
    link.download = `ingredienti_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const template = [
      'Nome,Unità,Prezzo per Unità (€),Categoria,Fornitore',
      '"Farina Tipo 00","kg",1.20,"Farine","Global Food S.p.A."',
      '"Mozzarella di Bufala","kg",12.50,"Latticini","Caseificio Valfiorita"',
      '"Pomodoro San Marzano","kg",3.80,"Conserve","Orti del Sud"'
    ].join('\n');

    const BOM = '\ufeff';
    const blob = new Blob([BOM + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_ingredienti.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Validate and import CSV
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setImportResult({
            success: false,
            imported: 0,
            errors: ['Il file CSV deve contenere almeno l\'intestazione e una riga di dati']
          });
          setIsImporting(false);
          return;
        }

        // Skip header
        const dataLines = lines.slice(1);
        const validIngredients: Ingredient[] = [];
        const errors: string[] = [];

        dataLines.forEach((line, index) => {
          const rowNum = index + 2; // +2 because we skip header and arrays are 0-indexed
          const columns = parseCSVLine(line);

          // Remove quotes from values
          const cleanColumns = columns.map(col => col.replace(/^"|"$/g, ''));

          // Validation
          if (cleanColumns.length < 4) {
            errors.push(`Riga ${rowNum}: Formato non valido (colonne insufficienti)`);
            return;
          }

          const [name, unit, priceStr, category, supplierName] = cleanColumns;

          // Check required fields
          if (!name || !unit || !priceStr || !category) {
            errors.push(`Riga ${rowNum}: Campi obbligatori mancanti`);
            return;
          }

          // Validate unit
          const normalizedUnit = unit.toLowerCase().trim();
          if (!validUnits.includes(normalizedUnit as Unit)) {
            errors.push(`Riga ${rowNum}: Unità non valida "${unit}". Usa: ${validUnits.join(', ')}`);
            return;
          }

          // Validate price
          const priceClean = priceStr.replace(',', '.');
          const price = parseFloat(priceClean);
          if (isNaN(price) || price <= 0) {
            errors.push(`Riga ${rowNum}: Prezzo non valido "${priceStr}"`);
            return;
          }

          // Find supplier by name (case-insensitive)
          let supplierId: string | undefined;
          if (supplierName && supplierName.trim()) {
            const supplier = suppliers.find(
              s => s.name.toLowerCase().trim() === supplierName.toLowerCase().trim()
            );
            if (supplier) {
              supplierId = supplier.id;
            } else {
              errors.push(`Riga ${rowNum}: Fornitore "${supplierName}" non trovato (verrà ignorato)`);
            }
          }

          // Create ingredient (without ID - Firebase will generate it)
          // Use a temporary ID that will be ignored by saveData
          const ingredient: Ingredient = {
            id: '', // Empty ID will trigger addDoc instead of updateDoc
            name: name.trim(),
            unit: normalizedUnit as Unit,
            pricePerUnit: price,
            category: category.trim(),
            ...(supplierId && { supplierId }) // Only include supplierId if it exists
          };

          validIngredients.push(ingredient);
        });

        // Import valid ingredients
        if (validIngredients.length > 0) {
          await onImport(validIngredients);
        }

        setImportResult({
          success: validIngredients.length > 0,
          imported: validIngredients.length,
          errors
        });

        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Auto-clear result after 5 seconds
        setTimeout(() => {
          setImportResult(null);
        }, 5000);

      } catch (error) {
        setImportResult({
          success: false,
          imported: 0,
          errors: [`Errore durante la lettura del file: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`]
        });
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-top duration-500">
      {/* Export Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h4 className="text-sm font-black text-black mb-4 flex items-center space-x-2">
          <FileDown size={18} className="text-gray-400" />
          <span>Esporta Ingredienti</span>
        </h4>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={ingredients.length === 0}
            className="flex-1 bg-black text-white py-4 rounded-xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>Esporta CSV ({ingredients.length})</span>
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-6 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold text-sm hover:shadow-md active:scale-95 transition-all flex items-center space-x-2"
          >
            <Download size={18} />
            <span>Template</span>
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h4 className="text-sm font-black text-black mb-4 flex items-center space-x-2">
          <Upload size={18} className="text-gray-400" />
          <span>Importa Ingredienti</span>
        </h4>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Info size={18} className="text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-900 mb-1">Formato CSV richiesto:</p>
                <p className="text-[10px] font-semibold text-blue-700">
                  Nome, Unità, Prezzo per Unità (€), Categoria, Fornitore
                </p>
                <p className="text-[10px] font-semibold text-blue-600 mt-2">
                  Unità valide: kg, g, l, ml, unit, pz
                </p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
            id="csv-import-input"
          />
          <label
            htmlFor="csv-import-input"
            className={`block w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              isImporting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
            }`}
          >
            {isImporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Importazione in corso...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span>Carica File CSV</span>
              </>
            )}
          </label>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div
          className={`rounded-2xl p-6 shadow-sm border ${
            importResult.success
              ? 'bg-green-50 border-green-200'
              : importResult.errors.length > 0
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          } animate-in fade-in duration-300`}
        >
          <div className="flex items-start space-x-3">
            {importResult.success && importResult.imported > 0 ? (
              <CheckCircle2 size={20} className="text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
            )}
            <div className="flex-1">
              {importResult.success && importResult.imported > 0 && (
                <p className="text-sm font-black text-green-900 mb-2">
                  ✅ {importResult.imported} ingredienti importati con successo!
                </p>
              )}
              {importResult.errors.length > 0 && (
                <div>
                  <p className="text-sm font-black text-yellow-900 mb-2">
                    ⚠️ {importResult.errors.length} avviso/i durante l'importazione:
                  </p>
                  <ul className="space-y-1">
                    {importResult.errors.map((error, idx) => (
                      <li key={idx} className="text-xs font-semibold text-yellow-800">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!importResult.success && importResult.imported === 0 && (
                <p className="text-sm font-black text-red-900">
                  ❌ Nessun ingrediente importato. Controlla gli errori sopra.
                </p>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest mb-3">
          Istruzioni
        </h4>
        <ul className="space-y-2 text-xs font-semibold text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-gray-400">1.</span>
            <span>Scarica il template CSV per vedere il formato corretto</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-gray-400">2.</span>
            <span>Compila il CSV con i tuoi ingredienti (nome, unità, prezzo, categoria)</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-gray-400">3.</span>
            <span>Il fornitore è opzionale: inserisci il nome esatto del fornitore esistente</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-gray-400">4.</span>
            <span>Carica il file CSV per importare tutti gli ingredienti in una volta</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CSVImportExport;

