import React, { useState, useEffect } from 'react';
import { Store, MapPin, Phone, Mail as MailIcon, Globe, Save, CheckCircle2, ArrowLeft } from 'lucide-react';
import { BusinessConfig, PlatformConnection } from '../../types';

interface BusinessSettingsViewProps {
  businessConfig?: BusinessConfig;
  platformConnections: {
    tripadvisor: PlatformConnection;
    google: PlatformConnection;
  };
  onSave: (config: BusinessConfig) => Promise<void>;
  onDisconnectPlatform: (platform: 'tripadvisor' | 'google') => Promise<void>;
  onNavigateBack?: () => void;
}

const BusinessSettingsView: React.FC<BusinessSettingsViewProps> = ({
  businessConfig,
  platformConnections,
  onSave,
  onDisconnectPlatform,
  onNavigateBack
}) => {
  const [formData, setFormData] = useState<BusinessConfig>({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    website: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (businessConfig) {
      setFormData({
        name: businessConfig.name || '',
        address: businessConfig.address || '',
        city: businessConfig.city || '',
        phone: businessConfig.phone || '',
        email: businessConfig.email || '',
        website: businessConfig.website || ''
      });
    }
  }, [businessConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.city.trim()) {
      alert('Nome attività e città sono obbligatori');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving business config:', error);
      alert('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async (platform: 'tripadvisor' | 'google') => {
    if (confirm(`Sei sicuro di voler scollegare ${platform === 'google' ? 'Google' : 'TripAdvisor'}?`)) {
      await onDisconnectPlatform(platform);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-2">
          {onNavigateBack && (
            <button 
              onClick={onNavigateBack} 
              className="bg-gray-100 p-2 rounded-full active:scale-90 transition-transform mr-2"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
            <Store className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black">La Tua Attività</h1>
            <p className="text-sm font-semibold text-gray-500">
              Configura i dati della tua attività
            </p>
          </div>
        </div>
      </div>

      {/* Business Info Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-lg font-black text-black mb-6">Informazioni Attività</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome Attività */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nome Attività *
            </label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Es: Pizzeria Da Michele"
                className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
          </div>

          {/* Indirizzo */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Indirizzo
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Es: Via Cesare Sersale, 1"
                className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Città */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Città *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Es: Napoli"
              className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          {/* Telefono */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Telefono
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Es: +39 081 5539204"
                className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <MailIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Es: info@pizzeria.it"
                className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Sito Web
            </label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="Es: https://www.pizzeria.it"
                className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save size={18} />
                Salva Configurazione
              </>
            )}
          </button>

          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
              <CheckCircle2 size={18} />
              Salvato con successo!
            </div>
          )}
        </div>
      </form>

      {/* Connected Platforms Status */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-lg font-black text-black mb-6">Piattaforme Collegate</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google Connection */}
          <div className={`rounded-2xl p-6 border-2 ${
            platformConnections.google.isConnected
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 rounded-lg p-2">
                  <span className="text-white font-black text-sm">G</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-black">Google My Business</h3>
                  <p className="text-xs font-semibold text-gray-500">
                    {platformConnections.google.isConnected ? 'Collegato' : 'Non collegato'}
                  </p>
                </div>
              </div>
              {platformConnections.google.isConnected && (
                <CheckCircle2 className="text-green-600" size={20} />
              )}
            </div>

            {platformConnections.google.isConnected && platformConnections.google.restaurantName && (
              <div className="text-xs font-semibold text-gray-600 mb-4">
                <p><strong>Attività:</strong> {platformConnections.google.restaurantName}</p>
                {platformConnections.google.restaurantCity && (
                  <p><strong>Città:</strong> {platformConnections.google.restaurantCity}</p>
                )}
              </div>
            )}

            {platformConnections.google.isConnected ? (
              <button
                onClick={() => handleDisconnect('google')}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 rounded-xl py-2 px-4 text-xs font-black transition-all"
              >
                Scollega
              </button>
            ) : (
              <p className="text-xs font-semibold text-gray-500">
                Vai alla sezione Marketing → Google per collegare
              </p>
            )}
          </div>

          {/* TripAdvisor Connection */}
          <div className={`rounded-2xl p-6 border-2 ${
            platformConnections.tripadvisor.isConnected
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 rounded-lg p-2">
                  <span className="text-white font-black text-sm">TA</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-black">TripAdvisor</h3>
                  <p className="text-xs font-semibold text-gray-500">
                    {platformConnections.tripadvisor.isConnected ? 'Collegato' : 'Non collegato'}
                  </p>
                </div>
              </div>
              {platformConnections.tripadvisor.isConnected && (
                <CheckCircle2 className="text-green-600" size={20} />
              )}
            </div>

            {platformConnections.tripadvisor.isConnected && platformConnections.tripadvisor.restaurantName && (
              <div className="text-xs font-semibold text-gray-600 mb-4">
                <p><strong>Attività:</strong> {platformConnections.tripadvisor.restaurantName}</p>
                {platformConnections.tripadvisor.restaurantCity && (
                  <p><strong>Città:</strong> {platformConnections.tripadvisor.restaurantCity}</p>
                )}
              </div>
            )}

            {platformConnections.tripadvisor.isConnected ? (
              <button
                onClick={() => handleDisconnect('tripadvisor')}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 rounded-xl py-2 px-4 text-xs font-black transition-all"
              >
                Scollega
              </button>
            ) : (
              <p className="text-xs font-semibold text-gray-500">
                Vai alla sezione Marketing → TripAdvisor per collegare
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessSettingsView;
