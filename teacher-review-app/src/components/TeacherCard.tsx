import React from 'react';

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
        {teacher.rating !== undefined && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-md">
            {teacher.rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 truncate">{teacher.name}</h3>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-gray-600">{teacher.field}</span>
          <span className="text-xs text-gray-500">{teacher.experience} years</span>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-primary-600 text-sm font-medium">View Profile</span>
          <div className="flex">
            {teacher.rating !== undefined && [...Array(5)].map((_, i) => (
              <svg 
                key={i} 
                className={`w-4 h-4 ${i < Math.round(teacher.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherCard; 