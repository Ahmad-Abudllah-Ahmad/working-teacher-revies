import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, socket } from '../services/api';
import '../styles/home.css';

interface Teacher {
  id: string;
  name: string;
  field: string;
  experience: number;
  bio: string;
  rating?: number;
}

const Home: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Handle socket connection status
  useEffect(() => {
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onTeacherUpdate = () => fetchTeachers();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('teacher_updated', onTeacherUpdate);
    socket.on('review_updated', onTeacherUpdate); // Refresh when reviews change too

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('teacher_updated', onTeacherUpdate);
      socket.off('review_updated', onTeacherUpdate);
    };
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/teachers');
      setTeachers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setError('Failed to load teachers. Please try again later.');
      
      // Fallback to localStorage if available
      const localTeachers = localStorage.getItem('teachers');
      if (localTeachers) {
        try {
          setTeachers(JSON.parse(localTeachers));
        } catch (e) {
          console.error('Error parsing local teachers:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const getUniqueFields = () => {
    const fields = teachers.map(teacher => teacher.field);
    return ['', ...new Set(fields)];
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.bio.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesField = selectedField === '' || teacher.field === selectedField;
    return matchesSearch && matchesField;
  });

  if (loading) {
    return <div className="loading">Loading teachers...</div>;
  }

  if (error && teachers.length === 0) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button className="retry-button" onClick={fetchTeachers}>Retry</button>
      </div>
    );
  }

  return (
    <div className="home-container">
      <h1>Our Expert Teachers</h1>
      
      {!isConnected && (
        <div className="connection-warning">
          <p>Working in offline mode. Some features may be limited.</p>
        </div>
      )}
      
      <div className="filters">
        <input
          type="text"
          placeholder="Search teachers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <select 
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
          className="field-select"
        >
          <option value="">All Fields</option>
          {getUniqueFields().filter(field => field !== '').map(field => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
      </div>

      {filteredTeachers.length === 0 ? (
        <div className="no-results">
          <h3>No teachers found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="teachers-grid">
          {filteredTeachers.map(teacher => (
            <div key={teacher.id} className="teacher-card">
              <h2>{teacher.name}</h2>
              <p className="field">{teacher.field}</p>
              <p className="experience">{teacher.experience} years experience</p>
              <p className="bio">{teacher.bio.length > 150 ? `${teacher.bio.substring(0, 150)}...` : teacher.bio}</p>
              <div className="card-footer">
                <span className="rating">
                  Rating: {teacher.rating ? `${teacher.rating.toFixed(1)}/5` : 'No ratings yet'}
                </span>
                <Link to={`/teacher/${teacher.id}`} className="view-button">
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home; 