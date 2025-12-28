import React, { useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import ProfessionalDashboard from './components/ProfessionalDashboard';
import CreateEmployee from './components/CreateEmployee';
import EmployeeList from './components/EmployeeList';
import EditEmployee from './components/EditEmployee';
import VerifyID from './components/VerifyID';
import BulkUpload from './components/BulkUpload';
import Certificates from './components/Certificates';
import OfferLetters from './components/OfferLetters';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

function Navigation({ onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    closeMobileMenu();
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand" onClick={closeMobileMenu}>
        <h2>IDSyncro</h2>
      </Link>
      
      <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
        {mobileMenuOpen ? '✕' : '☰'}
      </button>
      
      <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <Link to="/" className={isActive('/')} onClick={closeMobileMenu}>Dashboard</Link>
        <Link to="/employees" className={isActive('/employees')} onClick={closeMobileMenu}>Manage IDs</Link>
        <Link to="/certificates" className={isActive('/certificates')} onClick={closeMobileMenu}>Certificates</Link>
        <Link to="/offer-letters" className={isActive('/offer-letters')} onClick={closeMobileMenu}>Offer Letters</Link>
        <Link to="/verify" className={isActive('/verify')} onClick={closeMobileMenu}>Verify ID</Link>
        <button type="button" className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

function AppContent() {
  const { isAuthenticated, logout } = useAuth();
  const isVerifyHost = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.location.hostname.startsWith('verify.');
  }, []);

  return (
    <div className="App">
      {!isVerifyHost && isAuthenticated && <Navigation onLogout={logout} />}

      <main className="main-content">
        <Routes>
          {isVerifyHost ? (
            <>
              <Route path="/" element={<VerifyID />} />
              <Route path="/verify/:uuid?" element={<VerifyID />} />
              <Route path="*" element={<Navigate to="/verify" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/verify/:uuid?" element={<VerifyID />} />
              <Route path="/" element={<PrivateRoute><ProfessionalDashboard /></PrivateRoute>} />
              <Route path="/create" element={<PrivateRoute><CreateEmployee /></PrivateRoute>} />
              <Route path="/employees" element={<PrivateRoute><EmployeeList /></PrivateRoute>} />
              <Route path="/edit/:id" element={<PrivateRoute><EditEmployee /></PrivateRoute>} />
              <Route path="/certificates/*" element={<PrivateRoute><Certificates /></PrivateRoute>} />
              <Route path="/offer-letters/*" element={<PrivateRoute><OfferLetters /></PrivateRoute>} />
              <Route path="/bulk-upload" element={<PrivateRoute><BulkUpload /></PrivateRoute>} />
              <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;