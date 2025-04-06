import React from 'react';
import '../styles/starRating.css';

export interface StarRatingProps {
  rating: number;
  maxRating: number;
  readOnly?: boolean;
  onRate?: (rating: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  maxRating = 5, 
  readOnly = false,
  onRate
}) => {
  // Convert rating to integer for display purposes
  const displayRating = Math.round(rating);
  
  const handleClick = (selectedRating: number) => {
    if (readOnly || !onRate) return;
    onRate(selectedRating);
  };

  const handleHover = (event: React.MouseEvent, starIndex: number) => {
    if (readOnly || !onRate) return;
    
    // This would be for a hover effect, but we're keeping it simple
  };

  return (
    <div className={`star-rating ${readOnly ? 'read-only' : 'interactive'}`}>
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1;
        return (
          <span 
            key={index}
            className={`star ${starValue <= displayRating ? 'filled' : 'empty'}`}
            onClick={() => handleClick(starValue)}
            onMouseEnter={(e) => handleHover(e, starValue)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};

export default StarRating; 