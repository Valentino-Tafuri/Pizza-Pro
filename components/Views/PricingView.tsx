import React, { useState, useMemo } from 'react';
import { Calculator, PieChart, TrendingUp, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp, Euro, Users, Package } from 'lucide-react';
import { BepConfig, ProductCategory, ProductMix, Employee } from '../../types';
import { INITIAL_PRODUCT_MIX } from '../../constants';

interface PricingViewProps {
  bepConfig: BepConfig;
  employees: Employee[];
  onUpdateBep: (config: BepConfig) => Promise<void>;
}

const PricingView: React.FC<PricingViewProps> = ({
  bepConfig,
  employees,
  onUpdateBep
}) => {
  // Usa productMix dal config o il default
  const productMix = bepConfig.productMix || INITIAL_PRODUCT_MIX;

  // State per la sezione espansa
  const [expandedSection, setExpandedSection] = useState<'mix' | 'calculator' | null>('mix');

  // State per il calculator
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('pizza');
  const [costoMateriaPrima, setCostoMateriaPrima] = useState<number>(1.00);
  const [margineProfitto, setMargineProfitto] = useState<number>(10);

  // Calcola costi fissi totali (personale + altri)
  const costiTotali = useMemo(() => {
    const costoPersonale = employees.reduce((acc, emp) => {
      const salary = Number(emp.monthlySalary) || 0;
      const contribution = Number(emp.contributionPercentage) || 0;
      return acc + (salary * (1 + (contribution / 100)));
    }, 0);

    const altriCostiFissi = bepConfig.fixedCosts.reduce((acc, cost) => acc + cost.amount, 0);

    return {
      personale: costoPersonale,
      altri: altriCostiFissi,
      totale: costoPersonale + altriCostiFissi
    };
  }, [employees, bepConfig.fixedCosts]);

  // Calcola scontrino medio e fatturato target
  const metriche = useMemo(() => {
    const scontrinoMedio = productMix.categorie.reduce((acc, cat) => {
      return acc + ((cat.incidenzaFatturato / 100) * cat.prezzoMedio);
    }, 0);

    const fatturatoTarget = productMix.volumeMensile * scontrinoMedio;

    return {
      scontrinoMedio,
      fatturatoTarget
    };
  }, [productMix]);

  // Valida che le percentuali sommino a 100
  const totaleIncidenza = productMix.categorie.reduce((acc, cat) => acc + cat.incidenzaFatturato, 0);
  const incidenzaValida = Math.abs(totaleIncidenza - 100) < 0.01;

  // Calcolo pricing per categoria selezionata
  const pricingResult = useMemo(() => {
    const categoria = productMix.categorie.find(c => c.id === selectedCategoryId);
    if (!categoria) return null;

    // Volume unità per questa categoria
    const volumeUnita = Math.round(productMix.volumeMensile * categoria.volumeUnitario);

    // Costi fissi assegnati a questa categoria
    const costiFissiCategoria = costiTotali.totale * (categoria.incidenzaFatturato / 100);
    const costiFissiPerUnita = volumeUnita > 0 ? costiFissiCategoria / volumeUnita : 0;

    // Calcola costi variabili percentuali per questa categoria
    let costiVariabiliPerc = 0;
    if (categoria.costiVariabili.packaging) {
      costiVariabiliPerc += bepConfig.serviceIncidence;
    }
    if (categoria.costiVariabili.sfrido) {
      costiVariabiliPerc += bepConfig.wasteIncidence;
    }
    if (categoria.costiVariabili.delivery && bepConfig.deliveryEnabled) {
      costiVariabiliPerc += (bepConfig.deliveryIncidence || 0);
    }

    // Calcolo prezzo
    const denominatore = 1 - (costiVariabiliPerc / 100) - (margineProfitto / 100);

    if (denominatore <= 0) {
      return {
        valido: false,
        errore: "I costi superano il 100% - impossibile calcolare",
        categoria,
        volumeUnita,
        costiFissiCategoria,
        costiFissiPerUnita,
        costiVariabiliPerc
      };
    }

    const prezzoBreakEven = (costoMateriaPrima + costiFissiPerUnita) / (1 - (costiVariabiliPerc / 100));
    const prezzoConsigliato = (costoMateriaPrima + costiFissiPerUnita) / denominatore;

    // Breakdown
    const costiVariabiliEuro = prezzoConsigliato * (costiVariabiliPerc / 100);
    const profittoEuro = prezzoConsigliato * (margineProfitto / 100);

    // Proiezione mensile
    const fatturatoCategoria = volumeUnita * prezzoConsigliato;
    const costiTotaliCategoria = (volumeUnita * costoMateriaPrima) + costiFissiCategoria + (fatturatoCategoria * costiVariabiliPerc / 100);
    const profittoMensile = fatturatoCategoria - costiTotaliCategoria;

    return {
      valido: true,
      categoria,
      volumeUnita,
      costiFissiCategoria,
      costiFissiPerUnita,
      costiVariabiliPerc,
      prezzoBreakEven,
      prezzoConsigliato,
      breakdown: {
        materiaPrima: costoMateriaPrima,
        costiFissi: costiFissiPerUnita,
        costiVariabili: costiVariabiliEuro,
        profitto: profittoEuro
      },
      proiezione: {
        fatturato: fatturatoCategoria,
        costiTotali: costiTotaliCategoria,
        profitto: profittoMensile,
        margine: fatturatoCategoria > 0 ? (profittoMensile / fatturatoCategoria) * 100 : 0
      }
    };
  }, [selectedCategoryId, costoMateriaPrima, margineProfitto, productMix, costiTotali, bepConfig]);

  // Handler per aggiornare il product mix
  const handleUpdateProductMix = async (newMix: ProductMix) => {
    await onUpdateBep({
      ...bepConfig,
      productMix: newMix
    });
  };

  // Handler per aggiornare una categoria
  const handleUpdateCategoria = async (categoriaId: string, updates: Partial<ProductCategory>) => {
    const newCategorie = productMix.categorie.map(cat =>
      cat.id === categoriaId ? { ...cat, ...updates } : cat
    );
    await handleUpdateProductMix({ ...productMix, categorie: newCategorie });
  };

  // Handler per aggiornare volume mensile
  const handleUpdateVolume = async (volume: number) => {
    await handleUpdateProductMix({ ...productMix, volumeMensile: volume });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <Calculator size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black">Pricing Calculator</h1>
            <p className="text-white/70 text-sm font-semibold">Calcola prezzi basati sul product mix</p>
          </div>
        </div>

        {/* Metriche principali */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white/60 text-xs font-bold uppercase">Costi Fissi/Mese</p>
            <p className="text-2xl font-black">{costiTotali.totale.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white/60 text-xs font-bold uppercase">Scontrino Medio</p>
            <p className="text-2xl font-black">{metriche.scontrinoMedio.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white/60 text-xs font-bold uppercase">Fatturato Target</p>
            <p className="text-2xl font-black">{metriche.fatturatoTarget.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>

      {/* Sezione Product Mix */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'mix' ? null : 'mix')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <PieChart size={20} className="text-amber-600" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-black text-gray-900">Configurazione Product Mix</h2>
              <p className="text-sm text-gray-500 font-semibold">Volume mensile e distribuzione fatturato</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!incidenzaValida && (
              <div className="flex items-center gap-1 text-amber-600 text-sm font-bold">
                <AlertTriangle size={16} />
                <span>{totaleIncidenza.toFixed(0)}%</span>
              </div>
            )}
            {incidenzaValida && (
              <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                <CheckCircle size={16} />
                <span>100%</span>
              </div>
            )}
            {expandedSection === 'mix' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {expandedSection === 'mix' && (
          <div className="px-6 pb-6 space-y-6 border-t border-gray-100 pt-4">
            {/* Volume Mensile */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-gray-600" />
                  <span className="font-bold text-gray-700">Volume Mensile Target</span>
                </div>
                <span className="text-sm text-gray-500 font-semibold">
                  ~{Math.round(productMix.volumeMensile / 30)} coperti/giorno
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={10}
                  value={productMix.volumeMensile}
                  onChange={(e) => handleUpdateVolume(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <input
                    type="number"
                    value={productMix.volumeMensile}
                    onChange={(e) => handleUpdateVolume(parseInt(e.target.value) || 100)}
                    className="w-20 px-3 py-2 text-center font-bold text-gray-900 border-none focus:outline-none"
                  />
                  <span className="px-3 py-2 bg-gray-50 text-gray-500 font-semibold text-sm border-l border-gray-200">coperti</span>
                </div>
              </div>
            </div>

            {/* Categorie */}
            <div className="space-y-3">
              <h3 className="font-black text-gray-700 text-sm uppercase tracking-wider">Distribuzione Fatturato</h3>

              {productMix.categorie.map(categoria => (
                <div key={categoria.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{categoria.emoji}</span>
                      <div>
                        <p className="font-bold text-gray-900">{categoria.nome}</p>
                        <p className="text-xs text-gray-500 font-semibold">
                          {Math.round(productMix.volumeMensile * categoria.volumeUnitario)} unità/mese
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-gray-900">{categoria.incidenzaFatturato}%</p>
                      <p className="text-xs text-gray-500 font-semibold">
                        {(metriche.fatturatoTarget * categoria.incidenzaFatturato / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Incidenza */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Incidenza %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={categoria.incidenzaFatturato}
                        onChange={(e) => handleUpdateCategoria(categoria.id, { incidenzaFatturato: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    {/* Prezzo Medio */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Prezzo Medio</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={categoria.prezzoMedio}
                          onChange={(e) => handleUpdateCategoria(categoria.id, { prezzoMedio: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    {/* Volume Unitario */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Unità/Coperto</label>
                      <input
                        type="number"
                        min={0.1}
                        max={5}
                        step={0.1}
                        value={categoria.volumeUnitario}
                        onChange={(e) => handleUpdateCategoria(categoria.id, { volumeUnitario: parseFloat(e.target.value) || 0.1 })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Warning se non somma a 100 */}
            {!incidenzaValida && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold text-amber-800">Le percentuali non sommano a 100%</p>
                  <p className="text-sm text-amber-700 font-semibold">
                    Totale attuale: {totaleIncidenza.toFixed(1)}% -
                    {totaleIncidenza > 100 ? ` Riduci di ${(totaleIncidenza - 100).toFixed(1)}%` : ` Aggiungi ${(100 - totaleIncidenza).toFixed(1)}%`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sezione Calculator */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'calculator' ? null : 'calculator')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Euro size={20} className="text-green-600" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-black text-gray-900">Calcola Prezzo</h2>
              <p className="text-sm text-gray-500 font-semibold">Calcolo prezzo per categoria prodotto</p>
            </div>
          </div>
          {expandedSection === 'calculator' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSection === 'calculator' && (
          <div className="px-6 pb-6 space-y-6 border-t border-gray-100 pt-4">
            {/* Selezione Categoria */}
            <div>
              <label className="text-sm font-black text-gray-700 block mb-3">Seleziona Categoria</label>
              <div className="grid grid-cols-5 gap-2">
                {productMix.categorie.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      // Imposta food cost target della categoria
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all ${
                      selectedCategoryId === cat.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{cat.emoji}</span>
                    <span className="text-xs font-bold text-gray-700 block truncate">{cat.nome}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Costo e Margine */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <label className="text-xs font-bold text-gray-500 block mb-2">Costo Materia Prima</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={costoMateriaPrima}
                    onChange={(e) => setCostoMateriaPrima(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <label className="text-xs font-bold text-gray-500 block mb-2">Margine Profitto Target</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={margineProfitto}
                    onChange={(e) => setMargineProfitto(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                </div>
              </div>
            </div>

            {/* Risultato Pricing */}
            {pricingResult && pricingResult.valido && (
              <>
                {/* Prezzi Calcolati */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="text-xs font-bold text-red-700 uppercase">Break-Even</span>
                    </div>
                    <p className="text-3xl font-black text-red-700">
                      {pricingResult.prezzoBreakEven.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </p>
                    <p className="text-xs text-red-600 font-semibold mt-1">Copre solo i costi</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="text-xs font-bold text-green-700 uppercase">Consigliato</span>
                    </div>
                    <p className="text-3xl font-black text-green-700">
                      {pricingResult.prezzoConsigliato.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </p>
                    <p className="text-xs text-green-600 font-semibold mt-1">Include {margineProfitto}% profitto</p>
                  </div>
                </div>

                {/* Breakdown Costi */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h4 className="font-black text-gray-700 text-sm mb-4">Breakdown Costi per {pricingResult.categoria.emoji} {pricingResult.categoria.nome}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-orange-500" />
                        <span className="text-sm font-semibold text-gray-600">Materia Prima</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{pricingResult.breakdown.materiaPrima.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                        <span className="text-xs text-gray-500 ml-2">({((pricingResult.breakdown.materiaPrima / pricingResult.prezzoConsigliato) * 100).toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded" />
                        <span className="text-sm font-semibold text-gray-600">Costi Fissi</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{pricingResult.breakdown.costiFissi.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                        <span className="text-xs text-gray-500 ml-2">({((pricingResult.breakdown.costiFissi / pricingResult.prezzoConsigliato) * 100).toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-amber-500 rounded" />
                        <span className="text-sm font-semibold text-gray-600">Costi Variabili ({pricingResult.costiVariabiliPerc.toFixed(0)}%)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{pricingResult.breakdown.costiVariabili.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                        <span className="text-xs text-gray-500 ml-2">({((pricingResult.breakdown.costiVariabili / pricingResult.prezzoConsigliato) * 100).toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded" />
                        <span className="text-sm font-bold text-gray-700">Profitto ({margineProfitto}%)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-green-600">{pricingResult.breakdown.profitto.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proiezione Mensile */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={18} className="text-indigo-600" />
                    <h4 className="font-black text-indigo-800">Proiezione Mensile ({pricingResult.volumeUnita} unità)</h4>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase">Fatturato</p>
                      <p className="text-lg font-black text-indigo-900">
                        {pricingResult.proiezione.fatturato.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase">Costi</p>
                      <p className="text-lg font-black text-indigo-900">
                        {pricingResult.proiezione.costiTotali.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase">Profitto</p>
                      <p className={`text-lg font-black ${pricingResult.proiezione.profitto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pricingResult.proiezione.profitto.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase">Margine</p>
                      <p className={`text-lg font-black ${pricingResult.proiezione.margine >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pricingResult.proiezione.margine.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning prezzo alto */}
                {pricingResult.prezzoConsigliato > 25 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-bold text-amber-800">Prezzo elevato</p>
                      <p className="text-sm text-amber-700 font-semibold">
                        Il prezzo consigliato supera i €25. Verifica i costi fissi o considera di aumentare il volume.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Errore calcolo */}
            {pricingResult && !pricingResult.valido && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold text-red-800">Impossibile calcolare il prezzo</p>
                  <p className="text-sm text-red-700 font-semibold">{pricingResult.errore}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="text-sm font-black text-blue-900 mb-2">Come funziona il Pricing Calculator</h4>
            <ul className="text-xs font-semibold text-blue-800 space-y-1 list-disc list-inside">
              <li>Configura il <strong>Product Mix</strong> con le percentuali di fatturato per categoria</li>
              <li>I costi fissi vengono distribuiti proporzionalmente al fatturato di ogni categoria</li>
              <li>Inserisci il <strong>costo materia prima</strong> del prodotto che vuoi prezzare</li>
              <li>Il sistema calcola il prezzo che copre tutti i costi + il margine desiderato</li>
              <li>I parametri variabili (packaging, sfrido, delivery) sono presi dalle impostazioni BEP</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingView;
