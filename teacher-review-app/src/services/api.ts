import axios from 'axios';
import { io } from 'socket.io-client';

// Set base URL for API requests - ensure port 5001 is used consistently
const API_BASE_URL = 'http://localhost:5001/api';

// Create axios instance with timeout and error handling
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (increased from 10s)
  maxContentLength: 5 * 1024 * 1024, // 5MB max content length
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Log the error for debugging
    console.error('API Error:', error);
    
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

// Create and export the socket instance - ensure port 5001 is used
export const socket = io('http://localhost:5001', {
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  transports: ['websocket', 'polling']
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

// API endpoints
export const teacherApi = {
  getAll: () => api.get('/teachers'),
  getById: (id: string) => api.get(`/teachers/${id}`),
  create: (teacher: any) => api.post('/teachers', teacher),
  update: (id: string, teacher: any) => api.put(`/teachers/${id}`, teacher),
  delete: (id: string) => api.delete(`/teachers/${id}`),
};

export const reviewApi = {
  getAll: () => api.get('/reviews'),
  getByTeacherId: (teacherId: string) => api.get(`/reviews/teacher/${teacherId}`),
  create: (review: any) => api.post('/reviews', review),
  updateStatus: (id: string, status: string) => api.patch(`/reviews/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/reviews/${id}`),
};

export const authApi = {
  login: (credentials: { username: string; password: string }) => 
    api.post('/auth/login', credentials),
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
  socket.on('teacher_updated', onTeacherUpdate);
  socket.on('review_updated', onReviewUpdate);

  return () => {
    socket.off('teacher_updated', onTeacherUpdate);
    socket.off('review_updated', onReviewUpdate);
  };
} 