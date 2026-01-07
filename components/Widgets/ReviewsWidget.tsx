import React, { useState } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { Review } from '../../types';

interface ReviewsWidgetProps {
  reviews: Review[];
  averageRating: number;
  onViewAll: () => void;
}

const ReviewsWidget: React.FC<ReviewsWidgetProps> = ({
  reviews,
  averageRating,
  onViewAll
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tripadvisor' | 'google'>('all');

  const filteredReviews = reviews.filter(review => {
    if (activeTab === 'all') return true;
    return review.platform === activeTab;
  }).slice(0, 5);

  const renderStars = (rating: number, size: number = 14) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  const formatTimeAgo = (date: Date | any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Oggi';
    if (days === 1) return 'Ieri';
    if (days < 7) return `${days} giorni fa`;
    if (days < 30) return `${Math.floor(days / 7)} settimane fa`;
    return `${Math.floor(days / 30)} mesi fa`;
  };

  const getSentimentDot = (sentiment: string) => {
    const color = 
      sentiment === 'positive' ? 'bg-green-500' :
      sentiment === 'neutral' ? 'bg-yellow-500' : 'bg-red-500';
    return <div className={`w-2 h-2 rounded-full ${color}`} />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-black text-black">Recensioni Online</h3>
          <div className="flex items-center gap-2 mt-1">
            {renderStars(Math.round(averageRating), 16)}
            <span className="text-sm font-black text-black">{averageRating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'tripadvisor', 'google'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
              activeTab === tab
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'all' ? 'Tutte' : tab === 'tripadvisor' ? 'TA' : 'G'}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {filteredReviews.length === 0 ? (
          <p className="text-sm font-semibold text-gray-400 text-center py-4">
            Nessuna recensione disponibile
          </p>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className="p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {review.authorAvatar ? (
                    <img
                      src={review.authorAvatar}
                      alt={review.author}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black text-gray-600">
                        {review.author.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-black truncate">{review.author}</p>
                      {getSentimentDot(review.sentiment)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {renderStars(review.rating, 12)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    review.platform === 'tripadvisor' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {review.platform === 'tripadvisor' ? 'TA' : 'G'}
                  </span>
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-600 line-clamp-2 mb-1">
                {review.title ? `${review.title}: ` : ''}{review.text}
              </p>
              <p className="text-[10px] font-semibold text-gray-400">
                {formatTimeAgo(review.date)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <button
        onClick={onViewAll}
        className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-black text-gray-600 hover:text-black transition-colors pt-4 border-t border-gray-100"
      >
        Vedi tutte le recensioni
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default ReviewsWidget;



