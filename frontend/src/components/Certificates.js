import React from 'react';
import { Link } from 'react-router-dom';

const Certificates = () => {
  return (
    <div className="certificates-container">
      <div className="certificates-header">
        <h1>📜 Certificate Management</h1>
        <p>Create, manage, and verify certificates</p>
      </div>

      <div className="certificates-actions">
        <Link to="/certificates/create" className="cert-action-card">
          <div className="cert-icon">➕</div>
          <h3>Create Certificate</h3>
          <p>Generate new certificates</p>
        </Link>

        <Link to="/certificates/manage" className="cert-action-card">
          <div className="cert-icon">📋</div>
          <h3>Manage Certificates</h3>
          <p>View and manage all certificates</p>
        </Link>

        <Link to="/certificates/templates" className="cert-action-card">
          <div className="cert-icon">🎨</div>
          <h3>Templates</h3>
          <p>Manage certificate templates</p>
        </Link>

        <Link to="/verify" className="cert-action-card">
          <div className="cert-icon">✅</div>
          <h3>Verify Certificate</h3>
          <p>Verify certificate authenticity</p>
        </Link>
      </div>
    </div>
  );
};

export default Certificates;
