import React, { useState, useEffect, useRef } from 'react';
import { teacherApi, socket, setupSocketListeners, Teacher } from '../services/api';
import '../styles/teacherManagement.css';

// Local storage key for teachers data (temporary until backend is fully implemented)
const TEACHERS_STORAGE_KEY = 'teacherReviewApp_teachers';

interface TeacherFormData {
  name: string;
  field: string;
  experience: number;
  bio: string;
  photo: string;
}

const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<TeacherFormData>({
    name: '',
    field: '',
    experience: 0,
    photo: '',
    bio: ''
  });
  const [connectionStatus, setConnectionStatus] = useState<'connected'|'disconnected'>('disconnected');
  const [isDragging, setIsDragging] = useState(false);
  const [isEditDragging, setIsEditDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch teachers from API
  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      const response = await teacherApi.getAll();
      const fetchedTeachers = response.data;
      setTeachers(fetchedTeachers);
      
      // Also save to localStorage for offline use
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(fetchedTeachers));
      
      setConnectionStatus('connected');
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setConnectionStatus('disconnected');
      
      // Try to load from localStorage if API call fails
      const localTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
      if (localTeachers) {
        try {
          setTeachers(JSON.parse(localTeachers));
        } catch (e) {
          console.error('Error parsing cached teachers:', e);
        }
      }
      
      setErrorMessage('Could not connect to server. Working with local data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered teachers based on search
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);

  // Load teachers on component mount and set up socket listeners
  useEffect(() => {
    fetchTeachers();
     
    // Set up real-time updates via WebSockets
    const cleanup = setupSocketListeners(
      // When teacher data changes
      fetchTeachers, 
      // We don't need to handle review updates here
      () => {}
    );

    // Set up socket connection listener
    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log("Socket connected");
      fetchTeachers(); // Refresh data when socket connects
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log("Socket disconnected");
    });
    
    return () => {
      cleanup();
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  // Save to localStorage as backup (temporary until backend is fully implemented)
  useEffect(() => {
    if (!isLoading && teachers.length > 0) {
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
    }
  }, [teachers, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'experience' ? parseInt(value) || 0 : value
    }));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleEditDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsEditDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleEditDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsEditDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleEditDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsEditDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleEditImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleEditFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleEditImageUpload(e.target.files[0]);
    }
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.match('image.*')) {
      alert('Please select an image file (jpg, png, etc.)');
      return;
    }
    
    // Check file size before processing
    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('Image is too large. Please select an image smaller than 5MB.');
      return;
    }

    // Show user feedback
    setErrorMessage('Processing image...');

    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMessage(null);
      alert('Failed to read the image file. Please try again with a different image.');
    };
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onerror = () => {
        setErrorMessage(null);
        alert('Failed to process the image. Please try a different image format.');
      };
      
      img.onload = () => {
        try {
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          const MAX_WIDTH = 600; // Reduced from 800
          const MAX_HEIGHT = 500; // Reduced from 600
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          // Set canvas dimensions and draw resized image
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF'; // Add white background
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to data URL with reduced quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% quality JPEG (reduced from 70%)
            
            // Update form data and preview
            setFormData(prev => ({
              ...prev,
              photo: dataUrl
            }));
            setPreviewImage(dataUrl);
            
            const sizeKB = Math.round(dataUrl.length / 1024);
            console.log('Image resized and optimized. New size:', sizeKB, 'KB');
            setErrorMessage(sizeKB > 1000 ? 
              `Image processed (${sizeKB}KB). Size is large - consider using a smaller image.` : 
              `Image processed successfully (${sizeKB}KB)`);
            
            // If still too large, warn the user
            if (dataUrl.length > 1000000) { // 1MB
              setTimeout(() => {
                alert('Warning: The processed image is still quite large. This might cause upload issues. Consider using a smaller image or an external image URL instead.');
              }, 500);
            }
          }
        } catch (error) {
          console.error('Error processing image:', error);
          setErrorMessage(null);
          alert('There was a problem processing the image. Please try a different one.');
        }
      };
      
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleEditImageUpload = (file: File) => {
    if (!file.type.match('image.*')) {
      alert('Please select an image file (jpg, png, etc.)');
      return;
    }
    
    // Check file size before processing
    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('Image is too large. Please select an image smaller than 5MB.');
      return;
    }

    // Show user feedback
    setErrorMessage('Processing image...');

    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMessage(null);
      alert('Failed to read the image file. Please try again with a different image.');
    };
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onerror = () => {
        setErrorMessage(null);
        alert('Failed to process the image. Please try a different image format.');
      };
      
      img.onload = () => {
        try {
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          const MAX_WIDTH = 600; // Reduced from 800
          const MAX_HEIGHT = 500; // Reduced from 600
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          // Set canvas dimensions and draw resized image
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF'; // Add white background
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to data URL with reduced quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% quality JPEG
            
            // Update form data and preview for edit form
            setFormData(prev => ({
              ...prev,
              photo: dataUrl
            }));
            setPreviewImage(dataUrl);
            
            const sizeKB = Math.round(dataUrl.length / 1024);
            console.log('Edit image resized and optimized. New size:', sizeKB, 'KB');
            setErrorMessage(sizeKB > 1000 ? 
              `Image processed (${sizeKB}KB). Size is large - consider using a smaller image.` : 
              `Image processed successfully (${sizeKB}KB)`);
            
            // If still too large, warn the user
            if (dataUrl.length > 1000000) { // 1MB
              setTimeout(() => {
                alert('Warning: The processed image is still quite large. This might cause upload issues. Consider using a smaller image or an external image URL instead.');
              }, 500);
            }
          }
        } catch (error) {
          console.error('Error processing image:', error);
          setErrorMessage(null);
          alert('There was a problem processing the image. Please try a different one.');
        }
      };
      
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      photo: ''
    }));
    setPreviewImage(null);
  };

  const handleEditRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      photo: ''
    }));
    setPreviewImage(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.field || formData.experience <= 0 || !formData.bio) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage("Saving teacher data...");
      
      // Check image size before submitting
      if (formData.photo && formData.photo.length > 2000000) {
        setIsLoading(false);
        setErrorMessage("Image is too large (over 2MB). Please resize it or use a different image.");
        return;
      }
      
      // Use teacherApi directly to create the teacher
      const response = await teacherApi.create({
        name: formData.name,
        field: formData.field,
        experience: formData.experience,
        bio: formData.bio,
        photo: formData.photo || ''
      });
      
      // Get the new teacher from the response
      const newTeacher = response.data;
      
      // Update state immediately for better UX
      setTeachers(prev => [...prev, newTeacher]);
      
      // Update localStorage for offline fallback
      const updatedTeachers = [...teachers, newTeacher];
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(updatedTeachers));
      
      // Close modal and reset form
      setShowAddModal(false);
      resetForm();
      setPreviewImage(null);
      setErrorMessage(null);
      
      // Show success message
      alert(`Teacher ${formData.name} has been added successfully!`);
    } catch (error: any) {
      console.error('Error adding teacher:', error);
      
      if (connectionStatus === 'disconnected') {
        // Create a temporary teacher with local ID when offline
        const tempTeacher: Teacher = {
          ...formData,
          id: `local-${Date.now()}`
        };
        
        // Update state with temporary data
        setTeachers(prev => [...prev, tempTeacher]);
        
        // Update localStorage
        const updatedTeachers = [...teachers, tempTeacher];
        localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(updatedTeachers));
        
        // Close modal and reset form
        setShowAddModal(false);
        resetForm();
        setPreviewImage(null);
        setErrorMessage('Teacher added locally. Changes will sync when connection is restored.');
        
        // Show success message for offline mode
        alert(`Teacher ${formData.name} has been added successfully! (Note: This was saved locally only)`);
      } else {
        // Show specific error message for image-related problems
        if (error.message && error.message.includes('Image')) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Failed to add teacher. Please try again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTeacher) return;
    
    // Validate form
    if (!formData.name || !formData.field || formData.experience <= 0 || !formData.bio) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage("Updating teacher data...");
      
      // Check image size before submitting
      if (formData.photo && formData.photo.length > 2000000) {
        setIsLoading(false);
        setErrorMessage("Image is too large (over 2MB). Please resize it or use a different image.");
        return;
      }
      
      // Update teacher via API
      const response = await teacherApi.update(currentTeacher.id, {
        name: formData.name,
        field: formData.field,
        experience: formData.experience,
        bio: formData.bio,
        photo: formData.photo
      });
      
      // Get the updated teacher from the response
      const updatedTeacher = response.data;
      
      // Update state 
      setTeachers(prev => 
        prev.map(t => t.id === currentTeacher.id ? updatedTeacher : t)
      );
      
      // Update localStorage for offline fallback
      const updatedTeachers = teachers.map(t => 
        t.id === currentTeacher.id ? updatedTeacher : t
      );
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(updatedTeachers));
      
      // Close modal and reset form
      setShowEditModal(false);
      resetForm();
      setErrorMessage(null);
      
      // Show success message
      alert(`Teacher ${formData.name} has been updated successfully!`);
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      
      if (connectionStatus === 'disconnected') {
        // Create an updated teacher when offline
        const updatedTeacher = {
          ...currentTeacher,
          ...formData
        };
        
        // Update state
        setTeachers(prev => 
          prev.map(t => t.id === currentTeacher.id ? updatedTeacher : t)
        );
        
        // Update localStorage
        const updatedTeachers = teachers.map(t => 
          t.id === currentTeacher.id ? updatedTeacher : t
        );
        localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(updatedTeachers));
        
        // Close modal and reset form
        setShowEditModal(false);
        resetForm();
        setErrorMessage('Teacher updated locally. Changes will sync when connection is restored.');
      } else {
        // Show specific error message for image-related problems
        if (error.message && error.message.includes('Image')) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Failed to update teacher. Please try again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This will also remove all associated reviews.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Delete teacher via API
      await teacherApi.delete(teacherId);
      
      // Update local state optimistically
      setTeachers(prev => prev.filter(t => t.id !== teacherId));
      
      // Update localStorage for offline fallback
      const updatedTeachers = teachers.filter(t => t.id !== teacherId);
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(updatedTeachers));
      
      setErrorMessage(null);
    } catch (error) {
      console.error('Error deleting teacher:', error);
      
      if (connectionStatus === 'disconnected') {
        // Remove locally when offline
        setTeachers(prev => prev.filter(t => t.id !== teacherId));
        
        // Update localStorage
        const updatedTeachers = teachers.filter(t => t.id !== teacherId);
        localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(updatedTeachers));
        
        setErrorMessage('Teacher deleted locally. Changes will sync when connection is restored.');
      } else {
        setErrorMessage('Failed to delete teacher. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      field: '',
      experience: 0,
      photo: '',
      bio: ''
    });
    setCurrentTeacher(null);
    setPreviewImage(null);
    setErrorMessage(null);
  };

  useEffect(() => {
    const filtered = teachers.filter(teacher => 
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.field.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTeachers(filtered);
  }, [searchTerm, teachers]);

  // Handle socket connection status
  useEffect(() => {
    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Add socket listener for teacher updates
  useEffect(() => {
    const handleTeacherUpdate = () => {
      fetchTeachers();
    };
    
    socket.on('teacher_updated', handleTeacherUpdate);
    
    return () => {
      socket.off('teacher_updated', handleTeacherUpdate);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center py-12">
        <div className="animate-pulse text-xl">Loading teachers...</div>
      </div>
    );
  }

  return (
    <div className="teacher-management">
      <div className="teacher-management-header">
        <h2>Teacher Management</h2>
        
        {connectionStatus === 'disconnected' && (
          <div className="connection-warning">
            <span className="connection-indicator disconnected"></span>
            <p>Working in offline mode. The server at port 5001 appears to be down or inaccessible. Changes will be saved locally and synced when connection is restored.</p>
          </div>
        )}
        
        {connectionStatus === 'connected' && (
          <div className="connection-success">
            <span className="connection-indicator connected"></span>
            <p>Connected to server</p>
          </div>
        )}
        
        {errorMessage && (
          <div className="error-message">
            <p>{errorMessage}</p>
            <button 
              className="dismiss-button"
              onClick={() => setErrorMessage(null)}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Search teachers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button 
          className="add-button"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          Add New Teacher
        </button>
      </div>

      {isLoading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading teachers...</p>
        </div>
      ) : (
        <>
          {filteredTeachers.length === 0 ? (
            <div className="no-results">
              <p>{searchTerm ? 'No teachers match your search.' : 'No teachers added yet.'}</p>
            </div>
          ) : (
            <div className="teacher-list">
              {filteredTeachers.map(teacher => (
                <div 
                  key={teacher.id} 
                  className={`teacher-card ${teacher.id.startsWith('local-') ? 'local-only' : ''}`}
                >
                  {teacher.id.startsWith('local-') && (
                    <div className="local-indicator">
                      <span>Pending sync</span>
                    </div>
                  )}
                  
                  <div className="teacher-photo">
                    <img 
                      src={teacher.photo || '/assets/images/teacher-placeholder.jpg'} 
                      alt={teacher.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/images/teacher-placeholder.jpg';
                      }}
                    />
                  </div>
                  <div className="teacher-details">
                    <h3>{teacher.name}</h3>
                    <p className="field">{teacher.field}</p>
                    <p className="experience">{teacher.experience} years experience</p>
                    <div className="teacher-actions">
                      <button 
                        className="edit-button"
                        onClick={() => {
                          setCurrentTeacher(teacher);
                          setFormData({
                            name: teacher.name,
                            field: teacher.field,
                            experience: teacher.experience,
                            bio: teacher.bio,
                            photo: teacher.photo || ''
                          });
                          setPreviewImage(teacher.photo || null);
                          setShowEditModal(true);
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => handleDeleteTeacher(teacher.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add New Teacher</h3>
              {errorMessage && (
                <div className="mt-2 text-sm text-amber-600">
                  {errorMessage}
                </div>
              )}
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className="input-field add-teacher-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="field" className="block text-sm font-medium text-gray-900 mb-1">
                    Field <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="field"
                    id="field"
                    className="input-field add-teacher-input"
                    value={formData.field}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-900 mb-1">
                    Experience (years) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="experience"
                    id="experience"
                    min="1"
                    className="input-field add-teacher-input"
                    value={formData.experience}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="photo" className="block text-sm font-medium text-gray-900 mb-1">
                    Photo
                  </label>
                  
                  <div 
                    className={`mt-1 border-2 border-dashed rounded-md p-4 text-center ${
                      isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                    
                    {previewImage ? (
                      <div className="relative">
                        <img 
                          src={previewImage} 
                          alt="Teacher preview" 
                          className="mx-auto h-40 w-40 object-cover rounded-md" 
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <p className="text-xs text-gray-500 mt-2">Or enter a URL directly:</p>
                        <input
                          type="text"
                          name="photo"
                          id="photo-url"
                          className="input-field add-teacher-input"
                          value={formData.photo}
                          onChange={handleInputChange}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">Drag and drop an image here, or</p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          Browse files
                        </button>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        
                        <div className="mt-4">
                          <p className="text-xs text-gray-500 mb-1">Or enter a URL directly:</p>
                          <input
                            type="text"
                            name="photo"
                            id="photo-direct-url"
                            className="input-field add-teacher-input"
                            value={formData.photo}
                            onChange={handleInputChange}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-900 mb-1">
                    Bio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="bio"
                    id="bio"
                    rows={3}
                    className="input-field add-teacher-input"
                    value={formData.bio}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Adding...' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Teacher Modal */}
      {showEditModal && currentTeacher && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Edit Teacher</h3>
              {errorMessage && (
                <div className="mt-2 text-sm text-amber-600">
                  {errorMessage}
                </div>
              )}
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-900 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="edit-name"
                    className="input-field edit-teacher-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-field" className="block text-sm font-medium text-gray-900 mb-1">
                    Field <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="field"
                    id="edit-field"
                    className="input-field edit-teacher-input"
                    value={formData.field}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-experience" className="block text-sm font-medium text-gray-900 mb-1">
                    Experience (years) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="experience"
                    id="edit-experience"
                    min="1"
                    className="input-field edit-teacher-input"
                    value={formData.experience}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-photo" className="block text-sm font-medium text-gray-900 mb-1">
                    Photo
                  </label>
                  
                  <div 
                    className={`mt-1 border-2 border-dashed rounded-md p-4 text-center ${
                      isEditDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
                    }`}
                    onDragOver={handleEditDragOver}
                    onDragLeave={handleEditDragLeave}
                    onDrop={handleEditDrop}
                  >
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleEditFileInputChange}
                    />
                    
                    {previewImage ? (
                      <div className="relative">
                        <img 
                          src={previewImage} 
                          alt="Teacher preview" 
                          className="mx-auto h-40 w-40 object-cover rounded-md" 
                        />
                        <button
                          type="button"
                          onClick={handleEditRemoveImage}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <p className="text-xs text-gray-500 mt-2">Or enter a URL directly:</p>
                        <input
                          type="text"
                          name="photo"
                          id="edit-photo"
                          className="input-field edit-teacher-input"
                          value={formData.photo}
                          onChange={handleInputChange}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">Drag and drop an image here, or</p>
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          Browse files
                        </button>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        
                        <div className="mt-4">
                          <p className="text-xs text-gray-500 mb-1">Or enter a URL directly:</p>
                          <input
                            type="text"
                            name="photo"
                            id="edit-photo-url"
                            className="input-field edit-teacher-input"
                            value={formData.photo}
                            onChange={handleInputChange}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="edit-bio" className="block text-sm font-medium text-gray-900 mb-1">
                    Bio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="bio"
                    id="edit-bio"
                    rows={3}
                    className="input-field edit-teacher-input"
                    value={formData.bio}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentTeacher && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-medium">{currentTeacher.name}</span>? This action cannot be undone and will also remove all associated reviews.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setCurrentTeacher(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors"
                onClick={() => handleDeleteTeacher(currentTeacher.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement; 