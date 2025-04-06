import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import AdminLogin from '../components/AdminLogin';
import AdminDashboard from '../components/AdminDashboard';
import TeacherManagement from '../components/TeacherManagement';
import ImportTeachers from '../components/ImportTeachers';
import ReviewModeration from '../components/ReviewModeration';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check authentication status on mount
  useEffect(() => {
    // In a real app, this would check with your authentication service
    const token = localStorage.getItem('admin_token');
    
    if (token) {
      // Validate token with API in a real app
      setIsAuthenticated(true);
    } else if (location.pathname !== '/admin/login') {
      // Redirect to login if not authenticated and not already on login page
      navigate('/admin/login');
    }
  }, [navigate, location.pathname]);

  const handleLogin = (success: boolean) => {
    if (success) {
      setIsAuthenticated(true);
      navigate('/admin/dashboard');
    }
  };

  const handleLogout = () => {
    // Clear authentication
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    navigate('/admin/login');
  };

  if (!isAuthenticated && location.pathname !== '/admin/login') {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && (
        <header className="bg-primary-600 text-white py-4">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Link to="/admin/dashboard" className="text-xl font-bold">Admin Panel</Link>
              </div>
              <nav className="hidden md:flex space-x-6">
                <Link to="/admin/dashboard" className="text-white hover:text-white/80 transition-colors">Dashboard</Link>
                <Link to="/admin/teachers" className="text-white hover:text-white/80 transition-colors">Teachers</Link>
                <Link to="/admin/import" className="text-white hover:text-white/80 transition-colors">Import</Link>
                <Link to="/admin/reviews" className="text-white hover:text-white/80 transition-colors">Reviews</Link>
              </nav>
              <button 
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-white py-1 px-3 rounded-md transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={isAuthenticated ? "container mx-auto px-4 py-8" : ""}>
        <Routes>
          <Route 
            path="login" 
            element={<AdminLogin onLogin={handleLogin} />} 
          />
          <Route 
            path="dashboard" 
            element={
              isAuthenticated ? <AdminDashboard /> : <div>Unauthorized</div>
            } 
          />
          <Route 
            path="teachers/*" 
            element={
              isAuthenticated ? <TeacherManagement /> : <div>Unauthorized</div>
            } 
          />
          <Route 
            path="import" 
            element={
              isAuthenticated ? <ImportTeachers /> : <div>Unauthorized</div>
            } 
          />
          <Route 
            path="reviews" 
            element={
              isAuthenticated ? <ReviewModeration /> : <div>Unauthorized</div>
            } 
          />
          <Route 
            path="*" 
            element={
              <div className="text-center py-12">
                <h2 className="text-xl text-gray-600">Admin page not found</h2>
                <Link to="/admin/dashboard" className="text-primary-600 hover:underline mt-2 inline-block">
                  Go to Dashboard
                </Link>
              </div>
            } 
          />
        </Routes>
      </main>
      
      {isAuthenticated && (
        <footer className="bg-gray-800 text-white py-4 mt-auto">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm">Teacher Review Platform - Admin Panel || developed by A.A.Ahmad</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Admin; 