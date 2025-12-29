import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import CreateOfferLetter from './CreateOfferLetter';
import BulkOfferLetter from './BulkOfferLetter';
import ManageOfferLetters from './ManageOfferLetters';
import { buildVerifyPortalUrl } from '../config';

const OfferLetters = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'active-tab' : '';
  };
  
  return (
    <div className="certificates-container">
      <div className="certificates-header">
        <h1>📄 Offer Letter Management</h1>
        <p>Generate, manage, and verify offer letters</p>
      </div>
      
      <div className="certificates-tabs">
        <Link to="/offer-letters/create" className={isActive('/offer-letters/create')}>
          ➕ Create Single
        </Link>
        <Link to="/offer-letters/bulk" className={isActive('/offer-letters/bulk')}>
          📤 Bulk Generation
        </Link>
        <Link to="/offer-letters/manage" className={isActive('/offer-letters/manage')}>
          📋 Manage
        </Link>
        <a
          href={buildVerifyPortalUrl('/verify?type=offer')}
          className="tab-link"
          target="_blank"
          rel="noreferrer"
        >
          ✅ Verify
        </a>
      </div>
      
      <Routes>
        <Route path="create" element={<CreateOfferLetter />} />
        <Route path="bulk" element={<BulkOfferLetter />} />
        <Route path="manage" element={<ManageOfferLetters />} />
        <Route path="/" element={<CreateOfferLetter />} />
      </Routes>
    </div>
  );
};

export default OfferLetters;
