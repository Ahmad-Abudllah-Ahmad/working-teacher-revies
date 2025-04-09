import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, socket, Teacher, Review } from '../services/api';
import StarRating from './StarRating';
import '../styles/teacherDetail.css';

const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Handle socket connection status
  useEffect(() => {
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onTeacherUpdate = () => fetchTeacher();
    const onReviewUpdate = () => fetchReviews();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('teacher_updated', onTeacherUpdate);
    socket.on('review_updated', onReviewUpdate);
    socket.on('review_added', onReviewUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('teacher_updated', onTeacherUpdate);
      socket.off('review_updated', onReviewUpdate);
      socket.off('review_added', onReviewUpdate);
    };
  }, [id]);

  const fetchTeacher = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/teachers/${id}`);
      if (response.data) {
        setTeacher(response.data);
        setError(null);
      } else {
        throw new Error("Teacher data not found");
      }
    } catch (err) {
      console.error('Error fetching teacher:', err);
      setError('Teacher not found or has been removed.');
      
      // Try fallback to localStorage with the correct key
      const localTeachers = localStorage.getItem('teacherReviewApp_teachers');
      if (localTeachers) {
        try {
          const teachers = JSON.parse(localTeachers);
          const foundTeacher = teachers.find((t: Teacher) => t.id === id);
          if (foundTeacher) {
            setTeacher(foundTeacher);
            setError(null);
          } else {
            setError('Teacher not found in local storage either.');
          }
        } catch (e) {
          console.error('Error parsing local teachers:', e);
          setError('Error loading teacher data from cache.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!id) return;
    
    try {
      const response = await api.get(`/reviews/teacher/${id}`);
      if (response.data && Array.isArray(response.data)) {
        // Only show approved reviews
        setReviews(response.data.filter((review: Review) => review.status === 'approved'));
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      // We don't set an error for reviews, just show empty
      setReviews([]);
      
      // Try fallback to localStorage for reviews
      const localReviews = localStorage.getItem('teacherReviewApp_reviews');
      if (localReviews) {
        try {
          const allReviews = JSON.parse(localReviews);
          const teacherReviews = allReviews.filter((r: Review) => 
            r.teacherId === id && r.status === 'approved'
          );
          if (teacherReviews.length > 0) {
            setReviews(teacherReviews);
          }
        } catch (e) {
          console.error('Error parsing cached reviews:', e);
        }
      }
    }
  };

  useEffect(() => {
    if (id) {
      fetchTeacher();
      fetchReviews();
    }
  }, [id]);

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  };

  const calculateCategoryAverages = () => {
    if (reviews.length === 0) {
      return {
        teaching: 0,
        knowledge: 0,
        engagement: 0,
        approachability: 0,
        responsiveness: 0
      };
    }

    const totals = reviews.reduce((acc, review) => {
      return {
        teaching: acc.teaching + review.metrics.teaching,
        knowledge: acc.knowledge + review.metrics.knowledge,
        engagement: acc.engagement + review.metrics.engagement,
        approachability: acc.approachability + review.metrics.approachability,
        responsiveness: acc.responsiveness + review.metrics.responsiveness
      };
    }, {
      teaching: 0,
      knowledge: 0,
      engagement: 0,
      approachability: 0,
      responsiveness: 0
    });

    return {
      teaching: totals.teaching / reviews.length,
      knowledge: totals.knowledge / reviews.length,
      engagement: totals.engagement / reviews.length,
      approachability: totals.approachability / reviews.length,
      responsiveness: totals.responsiveness / reviews.length
    };
  };

  if (loading) {
    return <div className="loading">Loading teacher profile...</div>;
  }

  if (error || !teacher) {
    return (
      <div className="error-container">
        <h2>Teacher Not Found</h2>
        <p>{error || "This teacher may have been removed from our system."}</p>
        <button onClick={() => navigate('/')} className="back-button">
          Back to Teachers
        </button>
      </div>
    );
  }

  const averageRating = calculateAverageRating();
  const categoryAverages = calculateCategoryAverages();

  return (
    <div className="teacher-detail-container">
      {!isConnected && (
        <div className="connection-warning">
          <p>Working in offline mode. Some features may be limited.</p>
        </div>
      )}
      
      <div className="teacher-header">
        <button onClick={() => navigate('/')} className="back-button">
          &larr; Back to Teachers
        </button>
        
        <div className="teacher-info">
          <h1>{teacher.name}</h1>
          <div className="teacher-meta">
            <span className="field">{teacher.field}</span>
            <span className="experience">{teacher.experience} years experience</span>
            <div className="rating-display">
              <StarRating rating={averageRating} maxRating={5} readOnly />
              <span className="rating-text">
                {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="teacher-content">
        <div className="teacher-bio">
          <h2>About</h2>
          {teacher.photo && (
            <div className="teacher-photo">
              <img src={teacher.photo} alt={teacher.name} />
            </div>
          )}
          <p>{teacher.bio}</p>
        </div>

        {reviews.length > 0 && (
          <div className="rating-details">
            <h2>Rating Details</h2>
            <div className="rating-categories">
              <div className="rating-category">
                <span>Teaching:</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{ width: `${categoryAverages.teaching * 20}%` }}></div>
                </div>
                <span className="text-black">{categoryAverages.teaching.toFixed(1)}</span>
              </div>
              <div className="rating-category">
                <span>Knowledge:</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{ width: `${categoryAverages.knowledge * 20}%` }}></div>
                </div>
                <span className="text-black">{categoryAverages.knowledge.toFixed(1)}</span>
              </div>
              <div className="rating-category">
                <span>Engagement:</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{ width: `${categoryAverages.engagement * 20}%` }}></div>
                </div>
                <span className="text-black">{categoryAverages.engagement.toFixed(1)}</span>
              </div>
              <div className="rating-category">
                <span>Approachability:</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{ width: `${categoryAverages.approachability * 20}%` }}></div>
                </div>
                <span className="text-black">{categoryAverages.approachability.toFixed(1)}</span>
              </div>
              <div className="rating-category">
                <span>Responsiveness:</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{ width: `${categoryAverages.responsiveness * 20}%` }}></div>
                </div>
                <span className="text-black">{categoryAverages.responsiveness.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="reviews-section">
          <div className="reviews-header">
            <h2>Student Reviews</h2>
            <button 
              onClick={() => navigate(`/review/${teacher.id}`)} 
              className="write-review-button"
              disabled={!isConnected}
            >
              Write a Review
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="no-reviews">
              <p>No reviews yet. Be the first to review this teacher!</p>
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map(review => (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                    <span className="student-name">{review.studentName}</span>
                    <span className="review-date">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="review-rating">
                    <StarRating rating={review.rating} maxRating={5} readOnly />
                  </div>
                  <p className="review-comment">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDetail; 