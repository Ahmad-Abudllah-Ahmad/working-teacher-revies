import React from 'react';
import StarRating from './StarRating';

interface ReviewMetrics {
  overallGrade: number;
  teachingQuality: number;
  attendanceSupport: number;
  professionalBehavior: number;
}

interface Review {
  id: string;
  teacherId: string;
  comment: string;
  createdAt: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  metrics?: ReviewMetrics;
}

interface ReviewListProps {
  reviews: Review[];
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper function to get sentiment badge
  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="bg-green-100 text-green-800 py-1 px-2 rounded-full text-sm">👍 Positive</span>;
      case 'negative':
        return <span className="bg-red-100 text-red-800 py-1 px-2 rounded-full text-sm">👎 Negative</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 py-1 px-2 rounded-full text-sm">⚠️ Neutral</span>;
    }
  };

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="card">
          <div className="mb-3 flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-sm text-gray-600">
                Anonymous Student • {formatDate(review.createdAt)}
              </div>
            </div>
            <div>{getSentimentBadge(review.sentiment)}</div>
          </div>
          
          <p className="text-gray-700 mb-4">{review.comment}</p>
          
          {review.metrics && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overall Grade</span>
                <div className="flex items-center">
                  <StarRating rating={review.metrics.overallGrade} maxRating={5} readOnly />
                  <span className="ml-1 text-sm">{review.metrics.overallGrade}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Teaching Quality</span>
                <div className="flex items-center">
                  <StarRating rating={review.metrics.teachingQuality} maxRating={5} readOnly />
                  <span className="ml-1 text-sm">{review.metrics.teachingQuality}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Attendance & Support</span>
                <div className="flex items-center">
                  <StarRating rating={review.metrics.attendanceSupport} maxRating={5} readOnly />
                  <span className="ml-1 text-sm">{review.metrics.attendanceSupport}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Professional Behavior</span>
                <div className="flex items-center">
                  <StarRating rating={review.metrics.professionalBehavior} maxRating={5} readOnly />
                  <span className="ml-1 text-sm">{review.metrics.professionalBehavior}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReviewList; 