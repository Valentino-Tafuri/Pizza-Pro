import React, { useState, useMemo } from 'react';
import { Star, Sparkles, Copy, RefreshCw, X, Check, ExternalLink } from 'lucide-react';
import { PlatformConnection, Review, AIReviewResponse, RestaurantSearchResult } from '../../../types';
import { generateReviewResponse } from '../../../services/aiReviewResponder';
import RestaurantSearch from '../../Marketing/RestaurantSearch';

interface TripAdvisorViewProps {
  connection: PlatformConnection;
  reviews: Review[];
  onConnect: (restaurant: RestaurantSearchResult) => Promise<void>;
  onGenerateAIResponse: (review: Review) => Promise<AIReviewResponse>;
  onSaveReply: (reviewId: string, reply: string) => Promise<void>;
}

const TripAdvisorView: React.FC<TripAdvisorViewProps> = ({
  connection,
  reviews,
  onConnect,
  onGenerateAIResponse,
  onSaveReply
}) => {
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1' | 'unreplied'>('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [aiResponse, setAiResponse] = useState<AIReviewResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredReviews = useMemo(() => {
    let filtered = reviews;
    
    if (filter !== 'all') {
      if (filter === 'unreplied') {
        filtered = filtered.filter(r => !r.reply);
      } else {
        filtered = filtered.filter(r => r.rating === parseInt(filter));
      }
    }
    
    return filtered.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
      const dateB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [reviews, filter]);

  const handleGenerateAI = async (review: Review) => {
    setSelectedReview(review);
    setIsGenerating(true);
    setAiResponse(null);
    
    try {
      const response = await onGenerateAIResponse(review);
      setAiResponse(response);
      setReplyText(response.suggestedText);
    } catch (error) {
      console.error('Error generating AI response:', error);
      alert('Errore nella generazione della risposta AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(replyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = replyText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (selectedReview) {
      await handleGenerateAI(selectedReview);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={20}
        className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  const formatDate = (date: Date | any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (!connection.isConnected) {
    return (
      <RestaurantSearch 
        platform={connection.platform}
        onConnect={onConnect}
      />
    );
  }

  const stats = useMemo(() => {
    const total = reviews.length;
    const avgRating = total > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total 
      : 0;
    const unreplied = reviews.filter(r => !r.reply).length;
    
    return { total, avgRating, unreplied };
  }, [reviews]);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 rounded-lg p-3">
              <span className="text-white font-black text-lg">TA</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-black">TripAdvisor</h2>
              <p className="text-sm font-semibold text-gray-500">
                {stats.total} recensioni • Media {stats.avgRating.toFixed(1)}★
              </p>
            </div>
          </div>
          <button
            onClick={() => window.open('https://www.tripadvisor.com', '_blank')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2 px-4 text-sm font-black transition-all active:scale-95"
          >
            <ExternalLink size={16} />
            Vai a TripAdvisor
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(['all', '5', '4', '3', '2', '1', 'unreplied'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filter === f
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Tutte' : f === 'unreplied' ? `Non risposte (${stats.unreplied})` : `${f}★`}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => {
          const sentimentColor = 
            review.sentiment === 'positive' ? 'border-green-500' :
            review.sentiment === 'neutral' ? 'border-yellow-500' : 'border-red-500';
          
          return (
            <div
              key={review.id}
              className={`bg-white rounded-2xl p-6 shadow-sm border-l-4 ${sentimentColor} border-gray-100 hover:shadow-md transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {review.authorAvatar ? (
                    <img
                      src={review.authorAvatar}
                      alt={review.author}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-black text-gray-600">
                        {review.author.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-black text-black">{review.author}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-xs font-semibold text-gray-500 mt-1">
                      {formatDate(review.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    review.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    review.sentiment === 'neutral' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {review.sentiment}
                  </span>
                </div>
              </div>

              {review.title && (
                <h3 className="text-lg font-black text-black mb-2">{review.title}</h3>
              )}
              
              <p className="text-sm font-semibold text-gray-700 mb-3">{review.text}</p>

              {review.keywords && review.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {review.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}

              {review.reply ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
                  <p className="text-xs font-bold text-green-700 uppercase mb-2">Risposta</p>
                  <p className="text-sm font-semibold text-gray-700">{review.reply.text}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-2">
                    {formatDate(review.reply.date)} • {review.reply.author}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => handleGenerateAI(review)}
                  className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  Genera Risposta AI
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Response Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-[200] bg-black bg-opacity-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Sparkles className="text-purple-600" size={24} />
                <h3 className="text-xl font-black text-black">Risposta AI Suggerita</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedReview(null);
                  setAiResponse(null);
                  setReplyText('');
                }}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isGenerating ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : aiResponse ? (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-purple-700 uppercase mb-2">Tono suggerito</p>
                    <p className="text-sm font-semibold text-gray-700 capitalize">{aiResponse.tone}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Risposta (modificabile)
                    </label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={8}
                      className="w-full bg-white border-2 border-gray-200 rounded-xl py-4 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                      placeholder="La risposta AI verrà generata qui..."
                    />
                  </div>

                  {aiResponse.keyPoints && aiResponse.keyPoints.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-700 uppercase mb-2">Punti chiave</p>
                      <ul className="list-disc list-inside text-sm font-semibold text-gray-600 space-y-1">
                        {aiResponse.keyPoints.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-800">
                      💡 Copia e incolla questa risposta su TripAdvisor per rispondere alla recensione.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedReview(null);
                  setAiResponse(null);
                  setReplyText('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95"
              >
                Chiudi
              </button>
              {aiResponse && (
                <>
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95"
                  >
                    <RefreshCw size={18} />
                    Rigenera
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white rounded-xl py-3 px-6 text-sm font-black transition-all active:scale-95"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Copiato!' : 'Copia Risposta'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripAdvisorView;

