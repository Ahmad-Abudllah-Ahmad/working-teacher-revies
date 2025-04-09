import React, { useState, useEffect } from 'react';
import { api, Review } from '../services/api';

interface TeacherCardProps {
  teacher: {
    id: string;
    name: string;
    field: string;
    experience: number;
    photo?: string;
    rating?: number;
  };
}

const TeacherCard: React.FC<TeacherCardProps> = ({ teacher }) => {
  const [categoryAverages, setCategoryAverages] = useState({
    overall: 0,
    teaching: 0,
    attendance: 0,
    professional: 0
  });

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await api.get(`/reviews/teacher/${teacher.id}`);
        if (response.data && Array.isArray(response.data)) {
          // Only show approved reviews
          const approvedReviews = response.data.filter((review: Review) => review.status === 'approved');
          
          // Calculate category averages
          if (approvedReviews.length > 0) {
            const totals = approvedReviews.reduce((acc: {
              overall: number;
              teaching: number;
              attendance: number;
              professional: number;
            }, review: Review) => {
              return {
                overall: acc.overall + review.rating,
                teaching: acc.teaching + review.metrics.teaching,
                attendance: acc.attendance + review.metrics.engagement, // Using engagement for attendance
                professional: acc.professional + review.metrics.approachability // Using approachability for professional
              };
            }, {
              overall: 0,
              teaching: 0,
              attendance: 0,
              professional: 0
            });
            
            setCategoryAverages({
              overall: totals.overall / approvedReviews.length,
              teaching: totals.teaching / approvedReviews.length,
              attendance: totals.attendance / approvedReviews.length,
              professional: totals.professional / approvedReviews.length
            });
          }
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
        // Try fallback to localStorage for reviews
        const localReviews = localStorage.getItem('teacherReviewApp_reviews');
        if (localReviews) {
          try {
            const allReviews = JSON.parse(localReviews);
            const teacherReviews = allReviews.filter((r: Review) => 
              r.teacherId === teacher.id && r.status === 'approved'
            );
            if (teacherReviews.length > 0) {
              // Calculate category averages from local data
              const totals = teacherReviews.reduce((acc: {
                overall: number;
                teaching: number;
                attendance: number;
                professional: number;
              }, review: Review) => {
                return {
                  overall: acc.overall + review.rating,
                  teaching: acc.teaching + review.metrics.teaching,
                  attendance: acc.attendance + review.metrics.engagement,
                  professional: acc.professional + review.metrics.approachability
                };
              }, {
                overall: 0,
                teaching: 0,
                attendance: 0,
                professional: 0
              });
              
              setCategoryAverages({
                overall: totals.overall / teacherReviews.length,
                teaching: totals.teaching / teacherReviews.length,
                attendance: totals.attendance / teacherReviews.length,
                professional: totals.professional / teacherReviews.length
              });
            }
          } catch (e) {
            console.error('Error parsing cached reviews:', e);
          }
        }
      }
    };
    
    fetchReviews();
  }, [teacher.id]);

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <svg 
        key={i} 
        className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="relative h-48 bg-gray-200">
        <img 
          src={teacher.photo || '/assets/images/teacher-placeholder.jpg'} 
          alt={teacher.name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/images/teacher-placeholder.jpg';
          }}
        />
        {categoryAverages.overall > 0 && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-md">
            {categoryAverages.overall.toFixed(1)}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 truncate">{teacher.name}</h3>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-gray-600">{teacher.field}</span>
          <span className="text-xs text-gray-500">{teacher.experience} years</span>
        </div>
        
        {/* Rating Categories */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Overall Grade</span>
            <div className="flex items-center">
              <div className="flex mr-1">
                {renderStars(categoryAverages.overall)}
              </div>
              <span className="text-xs font-medium text-black">{categoryAverages.overall.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Teaching Quality</span>
            <div className="flex items-center">
              <div className="flex mr-1">
                {renderStars(categoryAverages.teaching)}
              </div>
              <span className="text-xs font-medium text-black">{categoryAverages.teaching.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Attendance & Support</span>
            <div className="flex items-center">
              <div className="flex mr-1">
                {renderStars(categoryAverages.attendance)}
              </div>
              <span className="text-xs font-medium text-black">{categoryAverages.attendance.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Professional Behavior</span>
            <div className="flex items-center">
              <div className="flex mr-1">
                {renderStars(categoryAverages.professional)}
              </div>
              <span className="text-xs font-medium text-black">{categoryAverages.professional.toFixed(1)}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <span className="text-primary-600 text-sm font-medium">View Profile</span>
        </div>
      </div>
    </div>
  );
};

export default TeacherCard; 