import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TeacherCard from '../components/TeacherCard';
import SearchBar from '../components/SearchBar';
import { api, socket, setupSocketListeners } from '../services/api';

interface Teacher {
  id: string;
  name: string;
  field: string;
  experience: number;
  photo?: string;
  bio: string;
  rating?: number;
}

const Home = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected'|'disconnected'>('disconnected');

  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/teachers');
      const data = response.data;
      
      // Sort teachers by name
      const sortedTeachers = [...data].sort((a, b) => a.name.localeCompare(b.name));
      
      setTeachers(sortedTeachers);
      setFilteredTeachers(sortedTeachers);
      setError(null);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setError('Failed to load teachers. Please try again.');
      
      // Try to load from localStorage as fallback if available
      const cachedTeachers = localStorage.getItem('teacherReviewApp_teachers');
      if (cachedTeachers) {
        try {
          const parsedTeachers = JSON.parse(cachedTeachers);
          setTeachers(parsedTeachers);
          setFilteredTeachers(parsedTeachers);
        } catch (e) {
          console.error('Error parsing cached teachers:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
    
    // Setup socket connection for real-time updates
    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('Socket connected');
    });
    
    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('Socket disconnected');
    });
    
    // Setup listeners for data changes
    const cleanup = setupSocketListeners(
      // When teacher data changes
      () => {
        console.log('Teachers updated, refreshing data');
        fetchTeachers();
      },
      // When reviews change (might affect teacher ratings)
      () => {
        console.log('Reviews updated, refreshing data');
        fetchTeachers();
      }
    );
    
    return () => {
      cleanup();
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);
  
  // Cache teachers in localStorage whenever they change
  useEffect(() => {
    if (teachers.length > 0) {
      localStorage.setItem('teacherReviewApp_teachers', JSON.stringify(teachers));
    }
  }, [teachers]);

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredTeachers(teachers);
      return;
    }
    
    const filtered = teachers.filter(
      teacher => 
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        teacher.field.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTeachers(filtered);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-pulse text-xl">Loading teachers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">Teacher Review Platform</h1>
          <p className="mt-2">Anonymously review and rate your teachers</p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {connectionStatus === 'disconnected' && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-700">
              Working in offline mode. Some features may be limited.
            </p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <div className="mb-8">
          <SearchBar onSearch={handleSearch} />
        </div>
        
        {filteredTeachers.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl text-gray-600">No teachers found matching your search criteria</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTeachers.map(teacher => (
              <Link key={teacher.id} to={`/teacher/${teacher.id}`} className="no-underline">
                <TeacherCard teacher={teacher} />
              </Link>
            ))}
          </div>
        )}
      </main>
      
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <p className="text-center">&copy; {new Date().getFullYear()} Teacher Review Platform || developed by A.A.Ahmad</p>
          <p className="text-center mt-2">
            <Link to="/admin/login" className="text-gray-300 hover:text-white">Admin Login</Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home; 