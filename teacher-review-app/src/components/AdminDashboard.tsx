import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, socket, setupSocketListeners, Review, Teacher, ReviewMetrics } from '../services/api';

// Local storage key for import history 
const IMPORT_HISTORY_KEY = 'teacherReviewApp_imports';

interface ImportRecord {
  id: string;
  timestamp: string;
  filename: string;
  teachersCount: number;
  status: 'success' | 'error' | 'processing';
}

interface DashboardStats {
  totalTeachers: number;
  totalReviews: number;
  averageRating: number;
  pendingReviews: number;
  recentImports: ImportRecord[];
  topRatedTeachers: {
    id: string;
    name: string;
    rating: number;
    reviewsCount: number;
  }[];
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

interface ReviewWithMetrics extends Omit<Review, 'metrics'> {
  metrics?: ReviewMetrics;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected'|'disconnected'>('disconnected');

  const calculateStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch teachers
      const teachersResponse = await api.get('/teachers');
      const teachers = teachersResponse.data as Teacher[] || [];
      
      // Fetch reviews
      const reviewsResponse = await api.get('/reviews');
      const reviews = reviewsResponse.data as ReviewWithMetrics[] || [];
      
      // Load import history from localStorage
      let recentImports: ImportRecord[] = [];
      try {
        const savedImportHistory = localStorage.getItem(IMPORT_HISTORY_KEY);
        if (savedImportHistory) {
          const allImports = JSON.parse(savedImportHistory);
          recentImports = allImports.slice(0, 5); // Get 5 most recent imports
        }
      } catch (error) {
        console.error('Error loading import history:', error);
      }
      
      // Calculate averages and metrics
      const pendingReviews = reviews.filter(r => r.status === 'pending').length;
      
      // Calculate average rating if reviews exist
      let averageRating = 0;
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum: number, review: ReviewWithMetrics) => 
          review.metrics ? sum + review.rating : sum, 0);
        averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
      }
      
      // Calculate top rated teachers
      const teacherRatings: Record<string, number> = {};
      const teacherReviewCounts: Record<string, number> = {};
      
      reviews.forEach((review: ReviewWithMetrics) => {
        if (!review.metrics) return;
        
        if (!teacherRatings[review.teacherId]) {
          teacherRatings[review.teacherId] = 0;
          teacherReviewCounts[review.teacherId] = 0;
        }
        
        teacherRatings[review.teacherId] += review.rating;
        teacherReviewCounts[review.teacherId] += 1;
      });
      
      const topRatedTeachers = teachers
        .filter(teacher => teacherReviewCounts[teacher.id] > 0)
        .map(teacher => ({
          id: teacher.id,
          name: teacher.name,
          rating: teacherReviewCounts[teacher.id] 
            ? teacherRatings[teacher.id] / teacherReviewCounts[teacher.id] 
            : 0,
          reviewsCount: teacherReviewCounts[teacher.id] || 0
        }))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3);
      
      // Calculate sentiment breakdown
      const sentimentBreakdown = {
        positive: reviews.filter(r => r.sentiment === 'positive').length,
        neutral: reviews.filter(r => r.sentiment === 'neutral').length,
        negative: reviews.filter(r => r.sentiment === 'negative').length
      };
      
      // Create stats object
      const calculatedStats: DashboardStats = {
        totalTeachers: teachers.length,
        totalReviews: reviews.length,
        averageRating,
        pendingReviews,
        recentImports,
        topRatedTeachers,
        sentimentBreakdown
      };
      
      setStats(calculatedStats);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      setConnectionStatus('disconnected');
      
      // Fallback to placeholder data
      setStats({
        totalTeachers: 0,
        totalReviews: 0,
        averageRating: 0,
        pendingReviews: 0,
        recentImports: [],
        topRatedTeachers: [],
        sentimentBreakdown: {
          positive: 0,
          neutral: 0,
          negative: 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    calculateStats();
    
    // Set up real-time updates via WebSockets
    const cleanup = setupSocketListeners(
      // When teacher data changes
      calculateStats, 
      // When reviews change 
      calculateStats
    );

    // Set up socket connection listener
    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log("Socket connected");
      calculateStats(); // Refresh data when socket connects
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

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center py-12">
        <div className="animate-pulse text-xl">Loading dashboard data...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl text-red-600">Failed to load dashboard data</h2>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

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
      case 'success':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Success</span>;
      case 'error':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Processing</span>;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {!connectionStatus && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-700">
            Working in offline mode. Data shown may not be up to date.
          </p>
        </div>
      )}
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Teachers</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalTeachers}</p>
          <div className="mt-1">
            <Link to="/admin/teachers" className="text-sm text-primary-600 hover:text-primary-800">
              View all teachers
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Reviews</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalReviews}</p>
          <div className="mt-1">
            <Link to="/admin/reviews" className="text-sm text-primary-600 hover:text-primary-800">
              View all reviews
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Average Rating</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
          <div className="mt-1 flex items-center">
            {[...Array(5)].map((_, i) => (
              <svg 
                key={i}
                className={`w-4 h-4 ${i < Math.round(stats.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Pending Reviews</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.pendingReviews}</p>
          <div className="mt-1">
            <Link to="/admin/reviews" className="text-sm text-primary-600 hover:text-primary-800">
              Moderate reviews
            </Link>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Rated Teachers */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Top Rated Teachers</h2>
          </div>
          <div className="p-6">
            {stats.topRatedTeachers.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {stats.topRatedTeachers.map(teacher => (
                  <li key={teacher.id} className="py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{teacher.name}</h3>
                      <div className="flex items-center mt-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i}
                              className={`w-4 h-4 ${i < Math.round(teacher.rating) ? 'text-yellow-400' : 'text-gray-300'}`} 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-gray-500">
                          {teacher.rating.toFixed(1)} ({teacher.reviewsCount} reviews)
                        </span>
                      </div>
                    </div>
                    <Link 
                      to={`/admin/teachers/${teacher.id}`}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No teacher ratings yet
              </div>
            )}
            <div className="mt-4 text-center">
              <Link 
                to="/admin/teachers"
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                View all teachers
              </Link>
            </div>
          </div>
        </div>
        
        {/* Review Sentiment */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Review Sentiment Analysis</h2>
          </div>
          <div className="p-6">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-green-100 text-green-800">
                    Positive
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-green-800">
                    {stats.sentimentBreakdown.positive} reviews
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-200">
                <div style={{ width: `${stats.totalReviews ? (stats.sentimentBreakdown.positive / stats.totalReviews) * 100 : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"></div>
              </div>
            </div>
            
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-blue-100 text-blue-800">
                    Neutral
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-800">
                    {stats.sentimentBreakdown.neutral} reviews
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                <div style={{ width: `${stats.totalReviews ? (stats.sentimentBreakdown.neutral / stats.totalReviews) * 100 : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
              </div>
            </div>
            
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-red-100 text-red-800">
                    Negative
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-red-800">
                    {stats.sentimentBreakdown.negative} reviews
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-red-200">
                <div style={{ width: `${stats.totalReviews ? (stats.sentimentBreakdown.negative / stats.totalReviews) * 100 : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"></div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Based on sentiment analysis of {stats.totalReviews} reviews
              </p>
            </div>
          </div>
        </div>
        
        {/* Recent Imports */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Imports</h2>
          </div>
          <div className="p-6">
            {stats.recentImports.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {stats.recentImports.map(importItem => (
                  <li key={importItem.id} className="py-4 flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {importItem.filename}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(importItem.timestamp)} · {importItem.teachersCount} teachers
                      </p>
                    </div>
                    <div>
                      {getStatusBadge(importItem.status)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No recent imports
              </div>
            )}
            <div className="mt-4 text-center">
              <Link 
                to="/admin/import"
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Import teachers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 