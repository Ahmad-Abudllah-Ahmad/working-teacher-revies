const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

// Data file paths
const TEACHERS_FILE = path.join(__dirname, 'data', 'teachers.json');
const REVIEWS_FILE = path.join(__dirname, 'data', 'reviews.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize empty data files if they don't exist
if (!fs.existsSync(TEACHERS_FILE)) {
  fs.writeFileSync(TEACHERS_FILE, JSON.stringify([]));
}

if (!fs.existsSync(REVIEWS_FILE)) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify([]));
}

console.log('Server started: Using teacher and review data from persistent storage.');

// Read data from JSON files
const getTeachers = () => {
  try {
    const data = fs.readFileSync(TEACHERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading teachers data:', error);
    return [];
  }
};

const getReviews = () => {
  try {
    const data = fs.readFileSync(REVIEWS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading reviews data:', error);
    return [];
  }
};

// Save data to JSON files
const saveTeachers = (teachers) => {
  try {
    fs.writeFileSync(TEACHERS_FILE, JSON.stringify(teachers, null, 2));
  } catch (error) {
    console.error('Error saving teachers data:', error);
  }
};

const saveReviews = (reviews) => {
  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
  } catch (error) {
    console.error('Error saving reviews data:', error);
  }
};

// Update teacher name in all related reviews
const updateTeacherNameInReviews = (teacherId, newName) => {
  const reviews = getReviews();
  let updated = false;
  
  const updatedReviews = reviews.map(review => {
    if (review.teacherId === teacherId) {
      updated = true;
      return {
        ...review,
        teacherName: newName
      };
    }
    return review;
  });
  
  if (updated) {
    saveReviews(updatedReviews);
    return true;
  }
  
  return false;
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes

// Teachers
app.get('/api/teachers', (req, res) => {
  const teachers = getTeachers();
  res.json(teachers);
});

app.get('/api/teachers/:id', (req, res) => {
  const teachers = getTeachers();
  const teacher = teachers.find(t => t.id === req.params.id);
  
  if (!teacher) {
    return res.status(404).json({ message: 'Teacher not found' });
  }
  
  res.json(teacher);
});

app.post('/api/teachers', (req, res) => {
  try {
    // Check if we have request body
    if (!req.body) {
      return res.status(400).json({ message: 'Missing teacher data' });
    }

    // Validate required fields
    const { name, field, experience, bio } = req.body;
    if (!name || !field || !experience || !bio) {
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide name, field, experience, and bio.'
      });
    }

    // Handle photo data - validate and possibly resize
    let photoToUse = req.body.photo || '';
    if (photoToUse) {
      // Validate it's an actual image
      if (!photoToUse.startsWith('data:image/')) {
        return res.status(400).json({ message: 'Invalid image format. Must be a valid data URL.' });
      }
      
      // Check size and possibly reject if too large
      if (photoToUse.length > 2000000) { // 2MB limit (increased from 1.5MB)
        console.log('Image too large (over 2MB), rejecting');
        return res.status(400).json({ 
          message: 'Image is too large. Please use an image smaller than 2MB.',
          details: { imageSize: Math.round(photoToUse.length / 1024) + 'KB' }
        });
      }
    }

    const teachers = getTeachers();
    const newTeacher = {
      id: Date.now().toString(),
      name: name,
      field: field,
      experience: experience,
      bio: bio,
      photo: photoToUse
    };
    
    teachers.push(newTeacher);
    saveTeachers(teachers);
    
    // Broadcast update to all clients
    io.emit('teacher_updated');
    
    res.status(201).json(newTeacher);
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ message: 'Error creating teacher: ' + error.message });
  }
});

app.put('/api/teachers/:id', (req, res) => {
  try {
    // Check if we have request body
    if (!req.body) {
      return res.status(400).json({ message: 'Missing teacher data' });
    }

    // Validate required fields
    const { name, field, experience, bio } = req.body;
    if (!name || !field || experience === undefined || !bio) {
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide name, field, experience, and bio.'
      });
    }

    const teachers = getTeachers();
    const index = teachers.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    const oldTeacher = teachers[index];

    // Handle large images - validate and possibly reject
    let photoToUse = req.body.photo;
    
    // If photo is provided, validate it
    if (photoToUse) {
      // Validate it's an actual image if it's a data URL
      if (photoToUse.startsWith('data:')) {
        if (!photoToUse.startsWith('data:image/')) {
          return res.status(400).json({ message: 'Invalid image format. Must be a valid image data URL.' });
        }
        
        // Check size and reject if too large
        if (photoToUse.length > 2000000) { // 2MB limit
          console.log('Image too large (over 2MB), rejecting');
          return res.status(400).json({ 
            message: 'Image is too large. Please use an image smaller than 2MB.',
            details: { imageSize: Math.round(photoToUse.length / 1024) + 'KB' }
          });
        }
      }
    } else {
      // If no photo provided, keep the old one
      photoToUse = oldTeacher.photo || '';
    }
    
    const updatedTeacher = {
      id: req.params.id,
      name: name,
      field: field,
      experience: experience,
      bio: bio,
      photo: photoToUse
    };
    
    teachers[index] = updatedTeacher;
    saveTeachers(teachers);
    
    // Update teacher name in all reviews if name changed
    if (oldTeacher.name !== updatedTeacher.name) {
      const reviewsUpdated = updateTeacherNameInReviews(updatedTeacher.id, updatedTeacher.name);
      if (reviewsUpdated) {
        io.emit('review_updated');
      }
    }
    
    // Broadcast update to all clients
    io.emit('teacher_updated');
    
    res.json(updatedTeacher);
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ message: 'Error updating teacher: ' + error.message });
  }
});

app.delete('/api/teachers/:id', (req, res) => {
  try {
    const teacherId = req.params.id;
    let teachers = getTeachers();
    const teacherToDelete = teachers.find(t => t.id === teacherId);
    
    if (!teacherToDelete) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    teachers = teachers.filter(t => t.id !== teacherId);
    saveTeachers(teachers);
    
    // Also delete all reviews for this teacher
    let reviews = getReviews();
    const previousReviewsCount = reviews.length;
    reviews = reviews.filter(r => r.teacherId !== teacherId);
    
    // Check if any reviews were removed
    const reviewsRemoved = previousReviewsCount > reviews.length;
    saveReviews(reviews);
    
    // Broadcast update to all clients for both teachers and reviews
    io.emit('teacher_updated');
    
    // Only emit review updated if reviews were actually removed
    if (reviewsRemoved) {
      io.emit('review_updated');
    }
    
    res.json({ 
      message: 'Teacher and related reviews deleted successfully',
      teacherDeleted: teacherToDelete.name,
      reviewsRemoved: previousReviewsCount - reviews.length
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ message: 'Error deleting teacher' });
  }
});

// Reviews
app.get('/api/reviews', (req, res) => {
  const reviews = getReviews();
  res.json(reviews);
});

app.get('/api/reviews/teacher/:teacherId', (req, res) => {
  const teacherId = req.params.teacherId;
  
  // First check if teacher exists
  const teachers = getTeachers();
  const teacherExists = teachers.some(t => t.id === teacherId);
  
  // Only return reviews if the teacher exists
  if (!teacherExists) {
    return res.json([]);
  }
  
  const reviews = getReviews();
  const teacherReviews = reviews.filter(r => r.teacherId === teacherId);
  res.json(teacherReviews);
});

app.post('/api/reviews', (req, res) => {
  try {
    const teacherId = req.body.teacherId;
    const teachers = getTeachers();
    const teacher = teachers.find(t => t.id === teacherId);
    
    // Only allow reviews for existing teachers
    if (!teacher) {
      return res.status(404).json({ message: 'Cannot add review for non-existent teacher' });
    }
    
    const reviews = getReviews();
    const newReview = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'pending', // All new reviews start as pending
      sentiment: 'neutral', // This would be determined by AI in a real app
      ...req.body,
      teacherName: teacher.name, // Make sure we have the current teacher name
    };
    
    reviews.push(newReview);
    saveReviews(reviews);
    
    // Broadcast update to all clients
    io.emit('review_updated');
    
    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Error creating review' });
  }
});

app.patch('/api/reviews/:id/status', (req, res) => {
  try {
    const reviews = getReviews();
    const index = reviews.findIndex(r => r.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Check if the teacher still exists
    const teacherId = reviews[index].teacherId;
    const teachers = getTeachers();
    const teacherExists = teachers.some(t => t.id === teacherId);
    
    if (!teacherExists) {
      return res.status(400).json({ message: 'Cannot update review for deleted teacher' });
    }
    
    reviews[index].status = req.body.status;
    saveReviews(reviews);
    
    // Broadcast update to all clients
    io.emit('review_updated');
    
    res.json(reviews[index]);
  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({ message: 'Error updating review status' });
  }
});

app.delete('/api/reviews/:id', (req, res) => {
  try {
    let reviews = getReviews();
    const initialLength = reviews.length;
    
    reviews = reviews.filter(r => r.id !== req.params.id);
    
    if (reviews.length === initialLength) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    saveReviews(reviews);
    
    // Broadcast update to all clients
    io.emit('review_updated');
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review' });
  }
});

// Authentication (simplified for demo)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // In a real app, you would verify credentials against a database
  if (username === 'admin' && password === 'admin123') {
    res.json({
      token: 'demo-token-123',
      user: { username: 'admin', role: 'admin' }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Serve React app for any other route (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server with port fallback to handle EADDRINUSE errors
const startServer = (port) => {
  server.listen(port)
    .on('listening', () => {
      console.log(`Server running on port ${port}`);
      console.log(`- API: http://localhost:${port}/api`);
      console.log(`- Frontend: http://localhost:3000`);
    })
    .on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying ${port + 1}`);
        startServer(port + 1);
      } else {
        console.error('Error starting server:', error);
      }
    });
};

// Remove the duplicate error handler
server.removeAllListeners('error');

// Try to start on the default port
const PORT = process.env.PORT || 5001; // Start at 5001 instead of 5000
startServer(PORT);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
}); 