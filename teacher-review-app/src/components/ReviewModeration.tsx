import React, { useState, useEffect } from 'react';
import { api, socket, setupSocketListeners, reviewApi } from '../services/api';

interface ReviewMetrics {
  overallGrade: number;
  teachingQuality: number;
  attendanceSupport: number;
  professionalBehavior: number;
}

interface Review {
  id: string;
  teacherId: string;
  teacherName: string; // Added for display purposes
  comment: string;
  createdAt: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  status: 'pending' | 'approved' | 'flagged' | 'removed';
  metrics?: ReviewMetrics;
}

const ReviewModeration: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentReview, setCurrentReview] = useState<Review | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected'|'disconnected'>('disconnected');

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/reviews');
      console.log("Fetched reviews:", response.data);
      setReviews(response.data);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setConnectionStatus('disconnected');
      
      // Fallback to mock data or empty array
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    
    // Set up socket listeners for real-time updates
    const cleanup = setupSocketListeners(
      // We need to refresh reviews when a teacher is updated too,
      // since that might affect teacher names or deleted teachers
      fetchReviews,
      // When reviews are updated
      fetchReviews
    );

    // Set up socket connection listener
    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log("Socket connected");
      fetchReviews(); // Refresh data when socket connects
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log("Socket disconnected");
    });
    
    return () => {
      cleanup();
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const handleUpdateStatus = async (reviewId: string, newStatus: string) => {
    try {
      const reviewToUpdate = reviews.find(review => review.id === reviewId);
      if (!reviewToUpdate) return;

      // Use the correct API endpoint from the reviewApi service
      await reviewApi.updateStatus(reviewId, newStatus);
      
      // Optimistically update UI
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId 
            ? { ...review, status: newStatus as any } 
            : review
        )
      );
      
    } catch (error) {
      console.error('Error updating review status:', error);
      alert('Failed to update review status. Please try again.');
    }
  };

  const handleDeleteReview = async () => {
    if (!currentReview) return;
    
    try {
      // Use the reviewApi service for consistency
      await reviewApi.delete(currentReview.id);
      
      // Optimistically update UI
      setReviews(prevReviews => 
        prevReviews.filter(review => review.id !== currentReview.id)
      );
      
      setShowDeleteModal(false);
      setCurrentReview(null);
      
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review. Please try again.');
      setShowDeleteModal(false);
      setCurrentReview(null);
    }
  };

  // Format date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper to get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Approved</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case 'flagged':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Flagged</span>;
      case 'removed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Removed</span>;
      default:
        return null;
    }
  };

  // Helper to get sentiment badge styling
  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Positive</span>;
      case 'neutral':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Neutral</span>;
      case 'negative':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Negative</span>;
      default:
        return null;
    }
  };

  // Filter reviews based on status and search term
  const filteredReviews = reviews.filter(review => {
    const matchesStatus = filterStatus === 'all' || review.status === filterStatus;
    const matchesSearch = review.comment.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         review.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center py-12">
        <div className="animate-pulse text-xl">Loading reviews...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Review Moderation</h1>
      
      {connectionStatus === 'disconnected' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-700">
            Working in offline mode. Changes may not be saved until connection is restored.
          </p>
        </div>
      )}
      
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1 text-sm rounded-md ${filterStatus === 'all' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${filterStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setFilterStatus('pending')}
            >
              Pending
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${filterStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setFilterStatus('approved')}
            >
              Approved
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${filterStatus === 'flagged' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setFilterStatus('flagged')}
            >
              Flagged
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${filterStatus === 'removed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setFilterStatus('removed')}
            >
              Removed
            </button>
          </div>
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search by review text or teacher name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md pr-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <svg 
              className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredReviews.length > 0 ? (
          filteredReviews.map(review => (
            <div key={review.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Review for {review.teacherName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <div className="flex space-x-2 mt-2 md:mt-0">
                    {getSentimentBadge(review.sentiment)}
                    {getStatusBadge(review.status)}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <p className="text-gray-700">{review.comment}</p>
                </div>
                
                {review.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500">Overall Grade</span>
                      <p className="font-medium">{review.metrics.overallGrade}/5</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Teaching Quality</span>
                      <p className="font-medium">{review.metrics.teachingQuality}/5</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Attendance & Support</span>
                      <p className="font-medium">{review.metrics.attendanceSupport}/5</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Professional Behavior</span>
                      <p className="font-medium">{review.metrics.professionalBehavior}/5</p>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {review.status !== 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus(review.id, 'approved')}
                      className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                    >
                      Approve
                    </button>
                  )}
                  
                  {review.status !== 'flagged' && (
                    <button
                      onClick={() => handleUpdateStatus(review.id, 'flagged')}
                      className="px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded-md hover:bg-orange-200"
                    >
                      Flag for Review
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setCurrentReview(review);
                      setShowDeleteModal(true);
                    }}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">No reviews found matching your filters.</p>
            {filterStatus !== 'all' && (
              <button
                onClick={() => setFilterStatus('all')}
                className="mt-2 text-primary-600 hover:text-primary-800"
              >
                Show all reviews
              </button>
            )}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 ml-4 text-primary-600 hover:text-primary-800"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentReview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Confirm Removal</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                Are you sure you want to remove this review? This will mark it as removed and hide it from public view.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCurrentReview(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteReview}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewModeration; 