import React, { useState } from 'react';

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  maxRating?: number;
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({ 
  value, 
  onChange, 
  maxRating = 5 
}) => {
  const [hoverValue, setHoverValue] = useState<number>(0);
  
  const handleMouseEnter = (rating: number) => {
    setHoverValue(rating);
  };
  
  const handleMouseLeave = () => {
    setHoverValue(0);
  };
  
  const handleClick = (rating: number) => {
    onChange(rating);
  };
  
  const getStarColor = (starPosition: number) => {
    if (hoverValue >= starPosition) {
      return 'text-yellow-400';
    } else if (!hoverValue && value >= starPosition) {
      return 'text-yellow-400';
    }
    return 'text-gray-300';
  };
  
  return (
    <div className="flex items-center">
      {[...Array(maxRating)].map((_, index) => {
        const starPosition = index + 1;
        
        return (
          <button
            key={index}
            type="button"
            className={`w-8 h-8 ${getStarColor(starPosition)} cursor-pointer focus:outline-none transition-colors`}
            onClick={() => handleClick(starPosition)}
            onMouseEnter={() => handleMouseEnter(starPosition)}
            onMouseLeave={handleMouseLeave}
            aria-label={`Rate ${starPosition} out of ${maxRating}`}
          >
            <svg 
              fill="currentColor" 
              viewBox="0 0 20 20"
              className="w-full h-full"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-gray-700">
          {value} out of {maxRating}
        </span>
      )}
    </div>
  );
};

export default StarRatingInput; 