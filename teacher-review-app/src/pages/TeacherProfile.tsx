import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import StarRating from '../components/StarRating';
import { api, socket, setupSocketListeners, Teacher as TeacherType, Review as ReviewType } from '../services/api';

// Simple ReviewList implementation to match the interface from the imported component
const ReviewList = ({ reviews }: { reviews: any[] }) => {
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
                {review.studentName || 'Anonymous Student'} • {formatDate(review.createdAt)}
              </div>
            </div>
            <div>{getSentimentBadge(review.sentiment)}</div>
          </div>
          
          <p className="text-gray-700 mb-4">{review.comment}</p>
          
          {review.metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
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

// Type definitions
interface Teacher extends TeacherType {
  metrics: {
    overallGrade: number;
    teachingQuality: number;
    attendanceSupport: number;
    professionalBehavior: number;
  };
}

interface Review extends Omit<ReviewType, 'metrics'> {
  metrics?: {
    overallGrade: number;
    teachingQuality: number;
    attendanceSupport: number;
    professionalBehavior: number;
  };
}

const TeacherProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected'|'disconnected'>('disconnected');

  const fetchTeacherData = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const teacherResponse = await api.get(`/teachers/${id}`);
      
      if (!teacherResponse.data) {
        setError('Teacher not found');
        return;
      }
      
      const reviewsResponse = await api.get(`/reviews/teacher/${id}`);
      const approvedReviews = reviewsResponse.data.filter(
        (review: ReviewType) => review.status === 'approved'
      );
      
      // Calculate metrics from reviews
      const metrics = calculateTeacherMetrics(approvedReviews);
      
      // Transform teacher data to include metrics
      const teacherWithMetrics: Teacher = {
        ...teacherResponse.data,
        metrics: {
          overallGrade: metrics.overall,
          teachingQuality: metrics.teaching,
          attendanceSupport: metrics.approachability,
          professionalBehavior: metrics.responsiveness
        }
      };
      
      // Transform reviews to match the expected format
      const formattedReviews = approvedReviews.map((review: ReviewType) => ({
        ...review,
        metrics: {
          overallGrade: review.rating,
          teachingQuality: review.metrics.teaching,
          attendanceSupport: review.metrics.approachability,
          professionalBehavior: review.metrics.responsiveness
        }
      }));
      
      setTeacher(teacherWithMetrics);
      setReviews(formattedReviews);
      setError(null);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load teacher data');
      setConnectionStatus('disconnected');
      
      // Try to load from localStorage as fallback
      const localTeachers = localStorage.getItem('teacherReviewApp_teachers');
      if (localTeachers) {
        try {
          const teachers = JSON.parse(localTeachers);
          const foundTeacher = teachers.find((t: TeacherType) => t.id === id);
          
          if (foundTeacher) {
            // Create basic metrics since we don't have reviews
            const teacherWithMetrics: Teacher = {
              ...foundTeacher,
              metrics: {
                overallGrade: foundTeacher.rating || 0,
                teachingQuality: foundTeacher.rating || 0,
                attendanceSupport: foundTeacher.rating || 0,
                professionalBehavior: foundTeacher.rating || 0
              }
            };
            
            setTeacher(teacherWithMetrics);
            setReviews([]);
            setError(null);
          }
        } catch (e) {
          console.error('Error parsing cached teachers:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTeacherMetrics = (reviews: ReviewType[]) => {
    if (!reviews || reviews.length === 0) {
      return {
        overall: 0,
        teaching: 0,
        knowledge: 0,
        engagement: 0,
        approachability: 0,
        responsiveness: 0
      };
    }

    const total = reviews.reduce((acc, review) => {
      return {
        overall: acc.overall + review.rating,
        teaching: acc.teaching + review.metrics.teaching,
        knowledge: acc.knowledge + review.metrics.knowledge,
        engagement: acc.engagement + review.metrics.engagement,
        approachability: acc.approachability + review.metrics.approachability,
        responsiveness: acc.responsiveness + review.metrics.responsiveness
      };
    }, {
      overall: 0,
      teaching: 0,
      knowledge: 0,
      engagement: 0,
      approachability: 0,
      responsiveness: 0
    });

    const count = reviews.length;
    
    return {
      overall: total.overall / count,
      teaching: total.teaching / count,
      knowledge: total.knowledge / count,
      engagement: total.engagement / count,
      approachability: total.approachability / count,
      responsiveness: total.responsiveness / count
    };
  };

  useEffect(() => {
    fetchTeacherData();
    
    // Set up real-time updates
    const cleanup = setupSocketListeners(
      () => fetchTeacherData(), // Update when teacher changes
      () => fetchTeacherData()  // Update when reviews change
    );
    
    // Set up socket connection status
    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    return () => {
      cleanup();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-pulse text-xl">Loading teacher profile...</div>
      </div>
    );
  }

  if (!teacher || error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-xl text-red-600">{error || 'Teacher not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white py-6">
        <div className="container mx-auto px-4">
          <Link to="/" className="text-white hover:text-white/80 transition-colors font-medium">
            &larr; Back to Teachers
          </Link>
          <h1 className="text-3xl font-bold mt-2">{teacher.name}</h1>
          <p className="mt-1">{teacher.field}</p>
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Teacher Info */}
          <div className="lg:col-span-1">
            <div className="card mb-6">
              <div className="relative h-64 overflow-hidden rounded-t-lg">
                <img 
                  src={teacher.photo || '/assets/images/teacher-placeholder.jpg'} 
                  alt={teacher.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/teacher-placeholder.jpg';
                  }}
                />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800">{teacher.name}</h2>
                <p className="text-gray-600 mb-4">{teacher.field} • {teacher.experience} years experience</p>
                <p className="text-gray-700">{teacher.bio}</p>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ratings</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Overall Grade</span>
                    <div className="flex items-center">
                      <StarRating rating={teacher.metrics.overallGrade} maxRating={5} readOnly />
                      <span className="ml-2 font-medium">{teacher.metrics.overallGrade.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Teaching Quality</span>
                    <div className="flex items-center">
                      <StarRating rating={teacher.metrics.teachingQuality} maxRating={5} readOnly />
                      <span className="ml-2 font-medium">{teacher.metrics.teachingQuality.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Attendance & Support</span>
                    <div className="flex items-center">
                      <StarRating rating={teacher.metrics.attendanceSupport} maxRating={5} readOnly />
                      <span className="ml-2 font-medium">{teacher.metrics.attendanceSupport.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Professional Behavior</span>
                    <div className="flex items-center">
                      <StarRating rating={teacher.metrics.professionalBehavior} maxRating={5} readOnly />
                      <span className="ml-2 font-medium">{teacher.metrics.professionalBehavior.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reviews */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Student Reviews</h2>
              <Link to={`/review/${teacher.id}`} className="btn-primary">
                Write a Review
              </Link>
            </div>
            
            {reviews.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                <p className="text-gray-600">No reviews yet. Be the first to review this teacher!</p>
              </div>
            ) : (
              <ReviewList reviews={reviews} />
            )}
          </div>
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

export default TeacherProfile; 