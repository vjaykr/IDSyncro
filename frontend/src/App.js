import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ProfessionalDashboard from './components/ProfessionalDashboard';
import CreateEmployee from './components/CreateEmployee';
import EmployeeList from './components/EmployeeList';
import EditEmployee from './components/EditEmployee';
import VerifyID from './components/VerifyID';
import BulkUpload from './components/BulkUpload';
import { ToastProvider } from './components/Toast';
import './App.css';

function Navigation() {
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
        <Link to="/create" className={isActive('/create')} onClick={closeMobileMenu}>Create ID</Link>
        <Link to="/employees" className={isActive('/employees')} onClick={closeMobileMenu}>Manage IDs</Link>
        <Link to="/bulk-upload" className={isActive('/bulk-upload')} onClick={closeMobileMenu}>Bulk Upload</Link>
        <Link to="/verify" className={isActive('/verify')} onClick={closeMobileMenu}>Verify ID</Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <Navigation />

          <main className="main-content">
            <Routes>
              <Route path="/" element={<ProfessionalDashboard />} />
              <Route path="/create" element={<CreateEmployee />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/edit/:id" element={<EditEmployee />} />
              <Route path="/bulk-upload" element={<BulkUpload />} />
              <Route path="/verify/:uuid?" element={<VerifyID />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;