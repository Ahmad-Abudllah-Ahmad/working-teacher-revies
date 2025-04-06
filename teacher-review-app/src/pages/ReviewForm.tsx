import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import StarRatingInput from '../components/StarRatingInput';
import { api, socket, Teacher as TeacherType, ReviewMetrics } from '../services/api';

interface Teacher extends TeacherType {}

interface ReviewFormData {
  comment: string;
  metrics: ReviewMetrics;
}

const ReviewForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected'|'disconnected'>('disconnected');
  
  const [formData, setFormData] = useState<ReviewFormData>({
    comment: '',
    metrics: {
      teaching: 0,
      knowledge: 0,
      engagement: 0,
      approachability: 0,
      responsiveness: 0
    }
  });

  // Handle socket connection status
  useEffect(() => {
    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    // Set initial connection status
    setConnectionStatus(socket.connected ? 'connected' : 'disconnected');
    
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Fetch teacher data
  useEffect(() => {
    if (!id) return;
    
    const fetchTeacher = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/teachers/${id}`);
        setTeacher(response.data);
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Error fetching teacher:', error);
        setConnectionStatus('disconnected');
        
        // Try to load from localStorage as fallback
        const localTeachers = localStorage.getItem('teacherReviewApp_teachers');
        if (localTeachers) {
          try {
            const teachers = JSON.parse(localTeachers);
            const foundTeacher = teachers.find((t: TeacherType) => t.id === id);
            if (foundTeacher) {
              setTeacher(foundTeacher);
            } else {
              // If teacher is not found in localStorage, navigate back to home
              navigate('/');
            }
          } catch (e) {
            console.error('Error parsing cached teachers:', e);
            navigate('/');
          }
        } else {
          // If no cached data, navigate back to home
          navigate('/');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeacher();
  }, [id, navigate]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      comment: e.target.value
    }));
  };

  const handleMetricChange = (metric: keyof ReviewMetrics, value: number) => {
    setFormData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [metric]: value
      }
    }));
  };

  // Function to calculate overall rating from metrics
  const calculateOverallRating = (metrics: ReviewMetrics): number => {
    const values = Object.values(metrics);
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (formData.comment.trim().length < 10) {
      setSubmissionError("Please provide a more detailed comment (at least 10 characters).");
      return;
    }
    
    // Check if any metric is still at 0
    const hasZeroMetric = Object.values(formData.metrics).some(value => value === 0);
    if (hasZeroMetric) {
      setSubmissionError("Please rate all categories before submitting.");
      return;
    }
    
    if (!teacher) {
      setSubmissionError("Teacher information is missing.");
      return;
    }
    
    setIsSubmitting(true);
    setSubmissionError(null);
    
    try {
      // Calculate overall rating
      const rating = calculateOverallRating(formData.metrics);
      
      // Create review payload
      const reviewData = {
        teacherId: teacher.id,
        teacherName: teacher.name,
        studentName: 'Anonymous Student',
        comment: formData.comment,
        metrics: formData.metrics,
        rating
      };
      
      // Submit to API
      await api.post('/reviews', reviewData);
      
      // Handle offline mode by storing in localStorage
      if (connectionStatus === 'disconnected') {
        try {
          const localReviews = localStorage.getItem('teacherReviewApp_reviews') || '[]';
          const reviews = JSON.parse(localReviews);
          reviews.push({
            ...reviewData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            status: 'pending',
            sentiment: 'neutral'
          });
          localStorage.setItem('teacherReviewApp_reviews', JSON.stringify(reviews));
        } catch (e) {
          console.error('Error saving review to local storage:', e);
        }
      }
      
      // Display success message and redirect after a delay
      setSuccessMessage("Your review has been submitted for moderation and will be visible once approved!");
      setTimeout(() => {
        navigate(`/teacher/${id}`);
      }, 2000);
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmissionError("Failed to submit review. Please try again later.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-xl text-red-600">Teacher not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white py-6">
        <div className="container mx-auto px-4">
          <Link to={`/teacher/${id}`} className="text-white hover:text-white/80 transition-colors font-medium">
            &larr; Back to {teacher.name}'s Profile
          </Link>
          <h1 className="text-3xl font-bold mt-2">Write a Review</h1>
          <p className="mt-1">Your review will be posted anonymously</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {connectionStatus === 'disconnected' && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-700">
              Working in offline mode. Some features may be limited.
            </p>
          </div>
        )}
        
        <div className="max-w-3xl mx-auto">
          <div className="card mb-6 flex items-center p-4">
            <div className="flex-shrink-0 mr-4">
              <img 
                src={teacher.photo || '/assets/images/teacher-placeholder.jpg'} 
                alt={teacher.name} 
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/images/teacher-placeholder.jpg';
                }}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{teacher.name}</h2>
              <p className="text-gray-600">{teacher.field}</p>
            </div>
          </div>

          {successMessage ? (
            <div className="bg-green-100 border border-green-200 text-green-800 rounded-lg p-4 mb-6">
              <p className="font-medium">{successMessage}</p>
              <p className="text-sm mt-1">Redirecting you back to the teacher's profile...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card">
              <div className="p-6">
                <div className="mb-6">
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Review
                  </label>
                  <textarea
                    id="comment"
                    rows={6}
                    placeholder="Write your honest review of this teacher..."
                    className="input-field resize-none"
                    value={formData.comment}
                    onChange={handleCommentChange}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your review will be analyzed to calculate metrics automatically.
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Rate this Teacher</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teaching Quality
                      </label>
                      <StarRatingInput 
                        value={formData.metrics.teaching} 
                        onChange={(value: number) => handleMetricChange('teaching', value)} 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Knowledge
                      </label>
                      <StarRatingInput 
                        value={formData.metrics.knowledge} 
                        onChange={(value: number) => handleMetricChange('knowledge', value)} 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Engagement
                      </label>
                      <StarRatingInput 
                        value={formData.metrics.engagement} 
                        onChange={(value: number) => handleMetricChange('engagement', value)} 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Approachability
                      </label>
                      <StarRatingInput 
                        value={formData.metrics.approachability} 
                        onChange={(value: number) => handleMetricChange('approachability', value)} 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Responsiveness
                      </label>
                      <StarRatingInput 
                        value={formData.metrics.responsiveness} 
                        onChange={(value: number) => handleMetricChange('responsiveness', value)} 
                      />
                    </div>
                  </div>
                </div>

                {submissionError && (
                  <div className="bg-red-100 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
                    {submissionError}
                  </div>
                )}

                <div className="flex justify-end">
                  <button 
                    type="button" 
                    className="btn-secondary mr-3"
                    onClick={() => navigate(`/teacher/${id}`)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <p className="text-center">&copy; {new Date().getFullYear()} Teacher Review Platform || developed by A.A.Ahmad</p>
        </div>
      </footer>
    </div>
  );
};

export default ReviewForm; 