import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { buildVerifyPortalUrl } from '../config';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    employees: 0,
    interns: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/employees');
      const employees = response.data;
      
      setStats({
        total: employees.length,
        employees: employees.filter(emp => emp.type === 'employee').length,
        interns: employees.filter(emp => emp.type === 'intern').length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total IDs</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.employees}</div>
          <div className="stat-label">Employees</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.interns}</div>
          <div className="stat-label">Interns</div>
        </div>
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Link to="/create" className="btn btn-primary">Create New ID</Link>
          <Link to="/employees" className="btn btn-secondary">Manage IDs</Link>
          <a
            href={buildVerifyPortalUrl('/verify')}
            className="btn btn-secondary"
            target="_blank"
            rel="noreferrer"
          >
            Verify ID
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;