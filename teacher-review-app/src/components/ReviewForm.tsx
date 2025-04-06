import React, { useState } from 'react';
import StarRating from './StarRating';
import '../styles/reviewForm.css';

interface ReviewFormProps {
  onSubmit: (reviewData: {
    studentName: string;
    comment: string;
    metrics: {
      teaching: number;
      knowledge: number;
      engagement: number;
      approachability: number;
      responsiveness: number;
    };
    rating: number;
  }) => void;
  onCancel: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ onSubmit, onCancel }) => {
  const [studentName, setStudentName] = useState('');
  const [comment, setComment] = useState('');
  const [overallRating, setOverallRating] = useState(0);
  const [metrics, setMetrics] = useState({
    teaching: 0,
    knowledge: 0,
    engagement: 0,
    approachability: 0,
    responsiveness: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleMetricChange = (metric: string, value: number) => {
    setMetrics(prev => ({
      ...prev,
      [metric]: value
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!studentName.trim()) {
      newErrors.studentName = 'Name is required';
    }

    if (!comment.trim()) {
      newErrors.comment = 'Review comment is required';
    } else if (comment.length < 10) {
      newErrors.comment = 'Comment must be at least 10 characters';
    }

    if (overallRating === 0) {
      newErrors.rating = 'Please select an overall rating';
    }

    // Check if all metrics have ratings
    const metricNames = ['teaching', 'knowledge', 'engagement', 'approachability', 'responsiveness'];
    metricNames.forEach(metric => {
      if (metrics[metric as keyof typeof metrics] === 0) {
        newErrors[metric] = `Please rate ${metric}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        studentName,
        comment,
        metrics,
        rating: overallRating,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <div className="form-group">
        <label htmlFor="studentName">Your Name</label>
        <input
          type="text"
          id="studentName"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className={errors.studentName ? 'error' : ''}
        />
        {errors.studentName && <div className="error-message">{errors.studentName}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="comment">Your Review</label>
        <textarea
          id="comment"
          rows={5}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this teacher..."
          className={errors.comment ? 'error' : ''}
        />
        {errors.comment && <div className="error-message">{errors.comment}</div>}
      </div>

      <div className="form-group">
        <label>Overall Rating</label>
        <div className="rating-input">
          <StarRating 
            rating={overallRating} 
            maxRating={5} 
            onRate={setOverallRating} 
          />
        </div>
        {errors.rating && <div className="error-message">{errors.rating}</div>}
      </div>

      <div className="metrics-section">
        <h3>Rate Specific Areas</h3>
        
        <div className="metric-item">
          <label>Teaching Quality</label>
          <div className="rating-input">
            <StarRating 
              rating={metrics.teaching} 
              maxRating={5} 
              onRate={(value) => handleMetricChange('teaching', value)} 
            />
          </div>
          {errors.teaching && <div className="error-message">{errors.teaching}</div>}
        </div>

        <div className="metric-item">
          <label>Subject Knowledge</label>
          <div className="rating-input">
            <StarRating 
              rating={metrics.knowledge} 
              maxRating={5} 
              onRate={(value) => handleMetricChange('knowledge', value)} 
            />
          </div>
          {errors.knowledge && <div className="error-message">{errors.knowledge}</div>}
        </div>

        <div className="metric-item">
          <label>Student Engagement</label>
          <div className="rating-input">
            <StarRating 
              rating={metrics.engagement} 
              maxRating={5} 
              onRate={(value) => handleMetricChange('engagement', value)} 
            />
          </div>
          {errors.engagement && <div className="error-message">{errors.engagement}</div>}
        </div>

        <div className="metric-item">
          <label>Approachability</label>
          <div className="rating-input">
            <StarRating 
              rating={metrics.approachability} 
              maxRating={5} 
              onRate={(value) => handleMetricChange('approachability', value)} 
            />
          </div>
          {errors.approachability && <div className="error-message">{errors.approachability}</div>}
        </div>

        <div className="metric-item">
          <label>Responsiveness</label>
          <div className="rating-input">
            <StarRating 
              rating={metrics.responsiveness} 
              maxRating={5} 
              onRate={(value) => handleMetricChange('responsiveness', value)} 
            />
          </div>
          {errors.responsiveness && <div className="error-message">{errors.responsiveness}</div>}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="cancel-button">
          Cancel
        </button>
        <button type="submit" className="submit-button">
          Submit Review
        </button>
      </div>
    </form>
  );
};

export default ReviewForm; 