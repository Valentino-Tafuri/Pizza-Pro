import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Star, AlertTriangle, CheckCircle2, ExternalLink, Loader2, X, Info } from 'lucide-react';
import { RestaurantSearchResult, ReviewPlatform } from '../../types';
import { searchRestaurantsMock } from '../../services/mockReviewsData';

interface RestaurantSearchProps {
  platform: ReviewPlatform;
  onConnect: (restaurant: RestaurantSearchResult) => Promise<void>;
}

const RestaurantSearch: React.FC<RestaurantSearchProps> = ({ platform, onConnect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RestaurantSearchResult[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantSearchResult | null>(null);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Debounce search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.trim().length >= 3) {
      setIsSearching(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const results = await searchRestaurantsMock(searchQuery, platform);
          setSearchResults(results);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 500);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, platform]);

  const handleSelectRestaurant = (restaurant: RestaurantSearchResult) => {
    setSelectedRestaurant(restaurant);
    setOwnershipConfirmed(false);
  };

  const handleConnect = async () => {
    if (!selectedRestaurant || !ownershipConfirmed) return;
    
    setIsConnecting(true);
    try {
      await onConnect(selectedRestaurant);
    } catch (error) {
      console.error('Connection error:', error);
      alert('Errore durante la connessione. Riprova.');
    } finally {
      setIsConnecting(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  const platformName = platform === 'tripadvisor' ? 'TripAdvisor' : 'Google My Business';
  const platformHelpUrl = platform === 'tripadvisor' 
    ? 'https://www.tripadvisor.com/Owners' 
    : 'https://www.google.com/business/';
  
  const platformClasses = platform === 'tripadvisor' 
    ? {
        bg: 'bg-green-600',
        bgHover: 'hover:bg-green-700',
        border: 'border-green-200',
        text: 'text-green-700'
      }
    : {
        bg: 'bg-blue-600',
        bgHover: 'hover:bg-blue-700',
        border: 'border-blue-200',
        text: 'text-blue-700'
      };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className={`${platformClasses.bg} rounded-lg p-3`}>
            <span className="text-white font-black text-lg">
              {platform === 'tripadvisor' ? 'TA' : 'G'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-black text-black">Connetti {platformName}</h2>
            <p className="text-sm font-semibold text-gray-500">Trova e collega la tua attività</p>
          </div>
        </div>

        {/* Step 1: Search */}
        {!selectedRestaurant && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Es: Pizzeria Da Michele, Napoli`}
                className="w-full bg-white border-2 border-gray-200 rounded-xl py-4 pl-12 pr-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="animate-spin text-gray-400" size={20} />
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    onClick={() => handleSelectRestaurant(restaurant)}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 rounded-xl transition-all active:scale-[0.98] text-left"
                  >
                    {restaurant.imageUrl ? (
                      <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <MapPin className="text-gray-400" size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-black mb-1 truncate">{restaurant.name}</h3>
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-1">
                        <MapPin size={12} />
                        <span className="truncate">{restaurant.address}, {restaurant.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {renderStars(restaurant.rating)}
                        </div>
                        <span className="text-xs font-bold text-gray-700">
                          {restaurant.rating.toFixed(1)}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">
                          • {restaurant.reviewCount.toLocaleString()} recensioni
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="text-gray-300 flex-shrink-0" size={20} />
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 3 && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm font-semibold text-gray-400">
                  Nessun risultato trovato. Prova con un altro nome o città.
                </p>
              </div>
            )}

            {searchQuery.length < 3 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h4 className="text-sm font-black text-blue-900 mb-2">Come cercare</h4>
                    <p className="text-xs font-semibold text-blue-800">
                      Inserisci almeno 3 caratteri per iniziare la ricerca. Puoi cercare per nome del ristorante, indirizzo o città.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Selected Restaurant & Verification */}
        {selectedRestaurant && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 flex-1">
                {selectedRestaurant.imageUrl ? (
                  <img
                    src={selectedRestaurant.imageUrl}
                    alt={selectedRestaurant.name}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-gray-400" size={32} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-black mb-1">{selectedRestaurant.name}</h3>
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                    <MapPin size={14} />
                    <span>{selectedRestaurant.address}, {selectedRestaurant.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {renderStars(selectedRestaurant.rating)}
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      {selectedRestaurant.rating.toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold text-gray-500">
                      • {selectedRestaurant.reviewCount.toLocaleString()} recensioni
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedRestaurant(null);
                  setOwnershipConfirmed(false);
                }}
                className="text-gray-400 hover:text-black transition-colors p-2"
              >
                <X size={20} />
              </button>
            </div>

            {/* Warning Box */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
                <div className="flex-1">
                  <h4 className="text-sm font-black text-yellow-900 mb-2">
                    ⚠️ Verifica Proprietà
                  </h4>
                  <p className="text-xs font-semibold text-yellow-800 mb-3">
                    Assicurati che questa sia la TUA attività. Solo i proprietari o gestori autorizzati possono collegare un'attività.
                  </p>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="ownership-check"
                      checked={ownershipConfirmed}
                      onChange={(e) => setOwnershipConfirmed(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black cursor-pointer"
                    />
                    <label htmlFor="ownership-check" className="text-xs font-bold text-yellow-900 cursor-pointer">
                      Confermo di essere il proprietario/gestore autorizzato di questa attività
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Links */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <h4 className="text-sm font-black text-blue-900 mb-2">Come verificare la proprietà</h4>
                  <ul className="text-xs font-semibold text-blue-800 space-y-1 list-disc list-inside mb-3">
                    <li>Accedi al {platformName} Management Center</li>
                    <li>Verifica che l'attività sia associata al tuo account</li>
                    <li>Assicurati di avere i permessi di gestione</li>
                  </ul>
                  <a
                    href={platformHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-black text-blue-700 hover:text-blue-900 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Vai a {platformName} Management
                  </a>
                </div>
              </div>
            </div>

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={!ownershipConfirmed || isConnecting}
              className={`w-full ${platformClasses.bg} ${platformClasses.bgHover} text-white rounded-xl py-4 px-6 text-sm font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Connessione in corso...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Connetti questa attività</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantSearch;

