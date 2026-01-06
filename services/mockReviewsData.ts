import { Review, PlatformConnection, ReviewStats, RestaurantSearchResult } from '../types';

export const MOCK_TRIPADVISOR_CONNECTION: PlatformConnection = {
  id: 'ta-conn-1',
  platform: 'tripadvisor',
  isConnected: false, // Cambiato a false per testare il wizard
  restaurantId: 'd1234567',
  restaurantName: 'Pizzeria Da Michele',
  restaurantAddress: 'Via Cesare Sersale, 1',
  restaurantCity: 'Napoli',
  lastSync: new Date(Date.now() - 3600000), // 1 ora fa
  totalReviews: 2842,
  averageRating: 4.5
};

export const MOCK_GOOGLE_CONNECTION: PlatformConnection = {
  id: 'google-conn-1',
  platform: 'google',
  isConnected: false, // Cambiato a false per testare il wizard
  restaurantId: 'ChIJN1234567890',
  restaurantName: 'Pizzeria Da Michele',
  restaurantAddress: 'Via Cesare Sersale, 1',
  restaurantCity: 'Napoli',
  lastSync: new Date(Date.now() - 7200000), // 2 ore fa
  totalReviews: 2842,
  averageRating: 4.5
};

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'ta-rev-1',
    platform: 'tripadvisor',
    author: 'Marco R.',
    rating: 5,
    date: new Date(Date.now() - 86400000), // 1 giorno fa
    title: 'La migliore pizza di Napoli!',
    text: 'Incredibile! Impasto perfetto, ingredienti freschi e personale cordiale. Tornerò sicuramente!',
    language: 'it',
    sentiment: 'positive',
    keywords: ['impasto', 'ingredienti', 'personale', 'cordiale']
  },
  {
    id: 'google-rev-1',
    platform: 'google',
    author: 'Laura B.',
    authorAvatar: 'https://i.pravatar.cc/150?img=1',
    rating: 4,
    date: new Date(Date.now() - 172800000), // 2 giorni fa
    text: 'Ottima pizza e ambiente accogliente. Unico neo: tempi di attesa un po\' lunghi.',
    language: 'it',
    sentiment: 'positive',
    keywords: ['pizza', 'ambiente', 'attesa', 'ottima']
  },
  {
    id: 'ta-rev-2',
    platform: 'tripadvisor',
    author: 'John S.',
    rating: 5,
    date: new Date(Date.now() - 259200000), // 3 giorni fa
    title: 'Authentic Neapolitan Pizza',
    text: 'Best pizza I\'ve had outside of Italy! The dough is perfectly chewy and the toppings are fresh.',
    language: 'en',
    sentiment: 'positive',
    keywords: ['authentic', 'dough', 'fresh', 'best'],
    reply: {
      text: 'Thank you so much for your wonderful review! We\'re thrilled you enjoyed our authentic Neapolitan pizza. Hope to see you again soon!',
      date: new Date(Date.now() - 172800000),
      author: 'Pizzeria Napoletana'
    }
  },
  {
    id: 'google-rev-2',
    platform: 'google',
    author: 'Giuseppe M.',
    rating: 3,
    date: new Date(Date.now() - 345600000), // 4 giorni fa
    text: 'Pizza discreta ma il servizio potrebbe migliorare. Prezzi nella media.',
    language: 'it',
    sentiment: 'neutral',
    keywords: ['servizio', 'prezzi', 'discreta']
  },
  {
    id: 'ta-rev-3',
    platform: 'tripadvisor',
    author: 'Sofia L.',
    rating: 2,
    date: new Date(Date.now() - 432000000), // 5 giorni fa
    title: 'Delusa',
    text: 'Mi aspettavo di più. Pizza bruciata e servizio scortese. Non tornerò.',
    language: 'it',
    sentiment: 'negative',
    keywords: ['bruciata', 'servizio', 'delusa', 'scortese']
  }
];

export const MOCK_REVIEW_STATS: ReviewStats = {
  totalReviews: 870,
  averageRating: 4.55,
  ratingDistribution: {
    5: 620,
    4: 150,
    3: 60,
    2: 25,
    1: 15
  },
  sentimentDistribution: {
    positive: 770,
    neutral: 65,
    negative: 35
  },
  replyRate: 78.5,
  lastUpdate: new Date()
};

export const searchRestaurantsMock = async (
  query: string, 
  platform: 'tripadvisor' | 'google'
): Promise<RestaurantSearchResult[]> => {
  // Simula delay API
  await new Promise(resolve => setTimeout(resolve, 800));

  const mockDB: RestaurantSearchResult[] = [
    {
      id: platform === 'tripadvisor' ? 'd1234567' : 'ChIJN1234567890',
      name: 'Pizzeria Da Michele',
      address: 'Via Cesare Sersale, 1',
      city: 'Napoli',
      rating: 4.5,
      reviewCount: 2842,
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop',
      platform
    },
    {
      id: platform === 'tripadvisor' ? 'd2345678' : 'ChIJN2345678901',
      name: 'Pizzeria Brandi',
      address: 'Salita Sant\'Anna di Palazzo, 1',
      city: 'Napoli',
      rating: 4.3,
      reviewCount: 1956,
      imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&h=200&fit=crop',
      platform
    },
    {
      id: platform === 'tripadvisor' ? 'd3456789' : 'ChIJN3456789012',
      name: 'Antica Pizzeria Port\'Alba',
      address: 'Via Port\'Alba, 18',
      city: 'Napoli',
      rating: 4.2,
      reviewCount: 1234,
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
      platform
    },
    {
      id: platform === 'tripadvisor' ? 'd4567890' : 'ChIJN4567890123',
      name: 'Pizzeria Sorbillo',
      address: 'Via dei Tribunali, 32',
      city: 'Napoli',
      rating: 4.6,
      reviewCount: 3521,
      imageUrl: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=200&h=200&fit=crop',
      platform
    },
    {
      id: platform === 'tripadvisor' ? 'd5678901' : 'ChIJN5678901234',
      name: 'Pizzeria Di Matteo',
      address: 'Via dei Tribunali, 94',
      city: 'Napoli',
      rating: 4.4,
      reviewCount: 2156,
      imageUrl: 'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=200&h=200&fit=crop',
      platform
    }
  ];

  if (!query.trim() || query.length < 3) return [];

  // Filtra per query
  const lowerQuery = query.toLowerCase();
  return mockDB.filter(restaurant => 
    restaurant.name.toLowerCase().includes(lowerQuery) ||
    restaurant.address.toLowerCase().includes(lowerQuery) ||
    restaurant.city.toLowerCase().includes(lowerQuery)
  );
};

