import axios from 'axios';
import { io } from 'socket.io-client';

// Check if we're in the GitHub Pages environment
const isGitHubPages = window.location.hostname.includes('github.io');

// Set base URL for API requests - ensure port 5001 is used consistently
const API_BASE_URL = isGitHubPages 
  ? '/working-teacher-revies/api' // GitHub Pages path (will fallback to mock data)
  : 'http://localhost:5001/api';

// Storage keys for fallback data
const TEACHERS_STORAGE_KEY = 'teacherReviewApp_teachers';
const REVIEWS_STORAGE_KEY = 'teacherReviewApp_reviews';

// Create axios instance with timeout and error handling
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (increased from 10s)
  maxContentLength: 5 * 1024 * 1024, // 5MB max content length
});

// Add response interceptor for error handling and GitHub Pages fallback
api.interceptors.response.use(
  response => response,
  error => {
    // Log the error for debugging
    console.error('API Error:', error);
    
    // If we're on GitHub Pages or server is not available, try to use local storage data
    if (isGitHubPages || error.message === 'Cannot connect to server. Please check your internet connection.') {
      // Check if we're requesting teachers
      if (error.config.url.includes('/teachers')) {
        const localTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
        if (localTeachers) {
          console.log('Using local teachers data for GitHub Pages');
          // If requesting a specific teacher by ID
          if (error.config.url.match(/\/teachers\/[^/]+$/)) {
            const teacherId = error.config.url.split('/').pop();
            const teachers = JSON.parse(localTeachers);
            const teacher = teachers.find((t: any) => t.id === teacherId);
            if (teacher) {
              return Promise.resolve({ data: teacher });
            }
          } else {
            // Return all teachers
            return Promise.resolve({ data: JSON.parse(localTeachers) });
          }
        }
      }
      
      // Check if we're requesting reviews
      if (error.config.url.includes('/reviews')) {
        const localReviews = localStorage.getItem(REVIEWS_STORAGE_KEY);
        if (localReviews) {
          console.log('Using local reviews data for GitHub Pages');
          // If requesting reviews for a specific teacher
          if (error.config.url.includes('/teacher/')) {
            const teacherId = error.config.url.split('/').pop();
            const reviews = JSON.parse(localReviews);
            const teacherReviews = reviews.filter((r: any) => r.teacherId === teacherId);
            return Promise.resolve({ data: teacherReviews });
          } else {
            // Return all reviews
            return Promise.resolve({ data: JSON.parse(localReviews) });
          }
        }
      }
    }
    
    // If the server responded with an error message, use it
    if (error.response && error.response.data) {
      if (error.response.data.message) {
        error.message = error.response.data.message;
      }
      
      // Add details if available
      if (error.response.data.details) {
        error.details = error.response.data.details;
      }
    }
    
    // Provide better error messages based on common issues
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out. Your image may be too large to upload.';
    } else if (!error.response) {
      error.message = 'Cannot connect to server. Please check your internet connection.';
    }
    
    return Promise.reject(error);
  }
);

// Create socket connection (will be disabled for GitHub Pages)
export const socket = io(isGitHubPages ? undefined : 'http://localhost:5001', {
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
  // Disable automatic connection for GitHub Pages
  autoConnect: !isGitHubPages
});

// Add logging for socket connection events
socket.on('connect', () => {
  console.log('Socket connected successfully');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error.message);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`Socket reconnection attempt #${attemptNumber}`);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Socket reconnected after ${attemptNumber} attempts`);
});

socket.on('reconnect_failed', () => {
  console.error('Socket reconnection failed after maximum attempts');
});

// Helper function to generate a unique ID for GitHub Pages mode
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// API endpoints
export const teacherApi = {
  getAll: () => api.get('/teachers'),
  getById: (id: string) => api.get(`/teachers/${id}`),
  create: (teacher: any) => {
    // For GitHub Pages, save to localStorage directly
    if (isGitHubPages) {
      const localTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
      const teachers = localTeachers ? JSON.parse(localTeachers) : [];
      const newTeacher = { ...teacher, id: generateId() };
      teachers.push(newTeacher);
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
      return Promise.resolve({ data: newTeacher });
    }
    return api.post('/teachers', teacher);
  },
  update: (id: string, teacher: any) => {
    // For GitHub Pages, update in localStorage directly
    if (isGitHubPages) {
      const localTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
      if (localTeachers) {
        const teachers = JSON.parse(localTeachers);
        const index = teachers.findIndex((t: any) => t.id === id);
        if (index !== -1) {
          const updatedTeacher = { ...teachers[index], ...teacher };
          teachers[index] = updatedTeacher;
          localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
          return Promise.resolve({ data: updatedTeacher });
        }
      }
    }
    return api.put(`/teachers/${id}`, teacher);
  },
  delete: (id: string) => {
    // For GitHub Pages, delete from localStorage directly
    if (isGitHubPages) {
      const localTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
      if (localTeachers) {
        const teachers = JSON.parse(localTeachers);
        const filtered = teachers.filter((t: any) => t.id !== id);
        localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(filtered));
        return Promise.resolve({ data: { success: true } });
      }
    }
    return api.delete(`/teachers/${id}`);
  },
};

export const reviewApi = {
  getAll: () => api.get('/reviews'),
  getByTeacherId: (teacherId: string) => api.get(`/reviews/teacher/${teacherId}`),
  create: (review: any) => {
    // For GitHub Pages, save to localStorage directly
    if (isGitHubPages) {
      const localReviews = localStorage.getItem(REVIEWS_STORAGE_KEY);
      const reviews = localReviews ? JSON.parse(localReviews) : [];
      const newReview = { 
        ...review, 
        id: generateId(),
        createdAt: new Date().toISOString(),
        status: 'approved', // Auto-approve for GitHub Pages
        sentiment: 'positive' // Default sentiment
      };
      reviews.push(newReview);
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
      return Promise.resolve({ data: newReview });
    }
    return api.post('/reviews', review);
  },
  updateStatus: (id: string, status: string) => {
    // For GitHub Pages, update status in localStorage directly
    if (isGitHubPages) {
      const localReviews = localStorage.getItem(REVIEWS_STORAGE_KEY);
      if (localReviews) {
        const reviews = JSON.parse(localReviews);
        const index = reviews.findIndex((r: any) => r.id === id);
        if (index !== -1) {
          reviews[index].status = status;
          localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
          return Promise.resolve({ data: reviews[index] });
        }
      }
    }
    return api.patch(`/reviews/${id}/status`, { status });
  },
  delete: (id: string) => {
    // For GitHub Pages, delete from localStorage directly
    if (isGitHubPages) {
      const localReviews = localStorage.getItem(REVIEWS_STORAGE_KEY);
      if (localReviews) {
        const reviews = JSON.parse(localReviews);
        const filtered = reviews.filter((r: any) => r.id !== id);
        localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(filtered));
        return Promise.resolve({ data: { success: true } });
      }
    }
    return api.delete(`/reviews/${id}`);
  },
};

export const authApi = {
  login: (credentials: { username: string; password: string }) => {
    // For GitHub Pages, simulate login
    if (isGitHubPages) {
      // Default admin credentials for GitHub Pages demo
      if (credentials.username === 'admin' && credentials.password === 'admin123') {
        return Promise.resolve({ 
          data: { 
            token: 'demo-token',
            user: { username: 'admin', role: 'admin' } 
          } 
        });
      } else {
        return Promise.reject(new Error('Invalid credentials'));
      }
    }
    return api.post('/auth/login', credentials);
  },
};

// Type definitions
export interface Teacher {
  id: string;
  name: string;
  field: string;
  experience: number;
  bio: string;
  rating?: number;
  photo?: string;
}

export interface ReviewMetrics {
  teaching: number;
  knowledge: number;
  engagement: number;
  approachability: number;
  responsiveness: number;
}

export interface Review {
  id: string;
  teacherId: string;
  teacherName: string;
  studentName: string;
  comment: string;
  metrics: ReviewMetrics;
  rating: number;
  createdAt: string;
  status: 'approved' | 'pending' | 'flagged' | 'removed';
  sentiment: 'positive' | 'neutral' | 'negative';
}

// Helper to set up socket.io listeners
export function setupSocketListeners(
  onTeacherUpdate: () => void,
  onReviewUpdate: () => void
) {
  // Skip socket connection for GitHub Pages
  if (isGitHubPages) {
    console.log('Socket connections are disabled on GitHub Pages');
    return () => {};
  }
  
  socket.on('teacher_updated', onTeacherUpdate);
  socket.on('review_updated', onReviewUpdate);

  return () => {
    socket.off('teacher_updated', onTeacherUpdate);
    socket.off('review_updated', onReviewUpdate);
  };
} 