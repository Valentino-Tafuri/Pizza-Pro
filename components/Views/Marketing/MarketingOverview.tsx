import React, { useMemo } from 'react';
import { Star, RefreshCw, ExternalLink, TrendingUp } from 'lucide-react';
import { PlatformConnection, Review, ReviewStats, ReviewPlatform } from '../../../types';
import RankingIndicator from '../../Marketing/RankingIndicator';

interface MarketingOverviewProps {
  tripAdvisorConnection: PlatformConnection;
  googleConnection: PlatformConnection;
  recentReviews: Review[];
  overallStats: ReviewStats;
  onSyncReviews: (platform: ReviewPlatform) => Promise<void>;
}

const MarketingOverview: React.FC<MarketingOverviewProps> = ({
  tripAdvisorConnection,
  googleConnection,
  recentReviews,
  overallStats,
  onSyncReviews
}) => {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={20}
        className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  const ratingDistribution = useMemo(() => {
    const total = Object.values(overallStats.ratingDistribution).reduce((a, b) => a + b, 0);
    return Object.entries(overallStats.ratingDistribution).map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    })).reverse();
  }, [overallStats]);

  const sentimentColors = {
    positive: 'bg-green-500',
    neutral: 'bg-yellow-500',
    negative: 'bg-red-500'
  };

  return (
    <div className="space-y-6">
      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TripAdvisor Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-green-600 rounded-lg p-2">
                <span className="text-white font-black text-xs">TA</span>
              </div>
              <span className="text-sm font-black text-gray-700">TripAdvisor</span>
            </div>
            {tripAdvisorConnection.isConnected && (
              <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded-full">
                Connesso
              </span>
            )}
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              {renderStars(Math.round(tripAdvisorConnection.averageRating || 0))}
              <span className="text-2xl font-black text-black">
                {tripAdvisorConnection.averageRating?.toFixed(1) || '0.0'}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-600">
              {tripAdvisorConnection.totalReviews || 0} recensioni
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSyncReviews('tripadvisor')}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2 px-4 text-xs font-black transition-all active:scale-95"
            >
              <RefreshCw size={14} />
              Sincronizza
            </button>
            <button
              onClick={() => window.open('https://www.tripadvisor.com', '_blank')}
              className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl py-2 px-4 text-xs font-black transition-all active:scale-95"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

        {/* Google Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg p-2">
                <span className="text-white font-black text-xs">G</span>
              </div>
              <span className="text-sm font-black text-gray-700">Google</span>
            </div>
            {googleConnection.isConnected && (
              <span className="text-xs font-bold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
                Connesso
              </span>
            )}
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              {renderStars(Math.round(googleConnection.averageRating || 0))}
              <span className="text-2xl font-black text-black">
                {googleConnection.averageRating?.toFixed(1) || '0.0'}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-600">
              {googleConnection.totalReviews || 0} recensioni
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSyncReviews('google')}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-4 text-xs font-black transition-all active:scale-95"
            >
              <RefreshCw size={14} />
              Sincronizza
            </button>
            <button
              onClick={() => window.open('https://www.google.com/maps', '_blank')}
              className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl py-2 px-4 text-xs font-black transition-all active:scale-95"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

        {/* Combined Stats Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-purple-600" size={20} />
            <span className="text-sm font-black text-gray-700">Statistiche Generali</span>
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              {renderStars(Math.round(overallStats.averageRating))}
              <span className="text-2xl font-black text-black">
                {overallStats.averageRating.toFixed(1)}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-600">
              {overallStats.totalReviews} recensioni totali
            </p>
            <p className="text-xs font-bold text-purple-700 mt-2">
              Reply Rate: {overallStats.replyRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Ranking Indicator */}
      <RankingIndicator
        position={12}
        totalRestaurants={156}
        city="Napoli"
        trend="up"
        trendChange={3}
        lastUpdate={new Date()}
      />

      {/* Rating Distribution */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-black text-black mb-4">Distribuzione Valutazioni</h3>
        <div className="space-y-3">
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-24">
                <span className="text-sm font-black text-gray-700">{rating}★</span>
                <span className="text-xs font-semibold text-gray-500">({count})</span>
              </div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    rating >= 4 ? 'bg-green-500' : rating === 3 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-600 w-12 text-right">
                {percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment Distribution */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-black text-black mb-4">Analisi Sentiment</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(overallStats.sentimentDistribution).map(([sentiment, count]) => {
            const total = Object.values(overallStats.sentimentDistribution).reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={sentiment} className="text-center">
                <div className={`w-16 h-16 ${sentimentColors[sentiment as keyof typeof sentimentColors]} rounded-full mx-auto mb-2 flex items-center justify-center`}>
                  <span className="text-white font-black text-xl">{count}</span>
                </div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">{sentiment}</p>
                <p className="text-sm font-black text-black">{percentage.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-black text-black mb-4">Ultime Recensioni</h3>
        <div className="space-y-4">
          {recentReviews.map((review) => {
            const reviewDate = review.date?.toDate ? review.date.toDate() : new Date(review.date);
            const timeAgo = Math.floor((Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <div
                key={review.id}
                className={`border-l-4 ${
                  review.sentiment === 'positive' ? 'border-green-500' :
                  review.sentiment === 'neutral' ? 'border-yellow-500' : 'border-red-500'
                } bg-gray-50 rounded-xl p-4`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {review.authorAvatar ? (
                      <img
                        src={review.authorAvatar}
                        alt={review.author}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-black text-gray-600">
                          {review.author.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-black text-black">{review.author}</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      review.platform === 'tripadvisor' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {review.platform === 'tripadvisor' ? 'TA' : 'G'}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      {timeAgo === 0 ? 'Oggi' : `${timeAgo} g fa`}
                    </span>
                  </div>
                </div>
                {review.title && (
                  <p className="text-sm font-black text-black mb-1">{review.title}</p>
                )}
                <p className="text-sm font-semibold text-gray-700 line-clamp-2">{review.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MarketingOverview;



