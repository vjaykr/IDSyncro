import React, { useState, useEffect } from 'react';
import axios from 'axios';

const IDCardViewer = ({ employee, onClose }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(employee);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee?.id) {
      fetchLatestData();
    }
  }, [employee?.id]);

  const fetchLatestData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/employees/${employee.id}`);
      setCurrentEmployee(response.data);
    } catch (error) {
      console.error('Error fetching latest employee data:', error);
      setCurrentEmployee(employee);
    } finally {
      setLoading(false);
    }
  };

  if (!employee) return null;
  const displayEmployee = currentEmployee || employee;

  return (
    <div className="id-viewer-overlay" onClick={onClose}>
      <div className="id-viewer-content" onClick={(e) => e.stopPropagation()}>
        <div className="id-viewer-header">
          <h2>ID Card - {displayEmployee.name} {loading && '(Updating...)'}</h2>
          <button className="popup-close" onClick={onClose}>×</button>
        </div>
        
        <div className="id-card-container">
          <div className={`id-card-flip ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
            {/* Front Side */}
            <div className="id-card-front">
              <div className="id-card-header">
                <div className="company-name">SARAL WORKS</div>
                <div className="id-type">{displayEmployee.type.toUpperCase()} ID CARD</div>
              </div>
              
              <div className="id-card-content">
                {displayEmployee.photo ? (
                  <img 
                    src={`http://localhost:5000/uploads/${displayEmployee.photo}`}
                    alt={displayEmployee.name}
                    className="id-card-photo"
                  />
                ) : (
                  <div className="id-card-photo-placeholder">📷</div>
                )}
                
                <div className="id-card-details">
                  <div className="employee-name">{displayEmployee.name}</div>
                  <div className="employee-info">Department: {displayEmployee.department}</div>
                  {displayEmployee.designation && <div className="employee-info">Designation: {displayEmployee.designation}</div>}
                  <div className="employee-info">Issued: {new Date(displayEmployee.created_at).toLocaleDateString()}</div>
                  <div className="employee-info">Status: <span className={`status-${displayEmployee.status || 'active'}`}>{(displayEmployee.status || 'active').toUpperCase()}</span></div>
                </div>
              </div>
              
              {displayEmployee.qr_code && (
                <div className="qr-section">
                  <img src={displayEmployee.qr_code} alt="QR Code" className="qr-code" />
                  <div className="qr-label">SCAN TO VERIFY</div>
                </div>
              )}
              
              <div className="id-number">{displayEmployee.employee_id}</div>
              <div className="flip-hint">Click to flip →</div>
            </div>

            {/* Back Side */}
            <div className="id-card-back">
              <div className="id-card-header">
                <div className="company-name">SARAL WORKS</div>
                <div className="id-type">EMPLOYEE DETAILS</div>
              </div>
              
              <div className="back-content">
                <div className="back-info-grid">
                  {displayEmployee.phone && <div className="back-item">📱 {displayEmployee.phone}</div>}
                  {displayEmployee.email && <div className="back-item">📧 {displayEmployee.email}</div>}
                  {displayEmployee.blood_group && <div className="back-item">🩸 {displayEmployee.blood_group}</div>}
                  {displayEmployee.date_of_birth && <div className="back-item">🎂 {new Date(displayEmployee.date_of_birth).toLocaleDateString()}</div>}
                  {displayEmployee.joining_date && <div className="back-item">📅 {new Date(displayEmployee.joining_date).toLocaleDateString()}</div>}
                  {displayEmployee.manager && <div className="back-item">👤 {displayEmployee.manager}</div>}
                  {displayEmployee.aadhar_number && <div className="back-item">🆔 {displayEmployee.aadhar_number}</div>}
                  {displayEmployee.pan_number && <div className="back-item">🅿️ {displayEmployee.pan_number}</div>}
                  {displayEmployee.emergency_contact && <div className="back-item">🚨 {displayEmployee.emergency_contact}</div>}
                  {displayEmployee.emergency_phone && <div className="back-item">📞 {displayEmployee.emergency_phone}</div>}
                  {displayEmployee.salary && <div className="back-item">💰 ₹{displayEmployee.salary}</div>}
                  {displayEmployee.bank_account && <div className="back-item">🏦 {displayEmployee.bank_account}</div>}
                  {displayEmployee.address && <div className="back-item back-item-full">🏠 {displayEmployee.address}</div>}
                </div>
                
                <div className="back-footer">
                  <div>Valid until: {new Date(new Date(displayEmployee.created_at).setFullYear(new Date(displayEmployee.created_at).getFullYear() + 5)).toLocaleDateString()}</div>
                  <div>Authorized Signature - SARAL WORKS</div>
                </div>
              </div>
              
              <div className="flip-hint">← Click to flip back</div>
            </div>
          </div>
        </div>
        
        <div className="id-viewer-actions">
          <button onClick={onClose} className="btn btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
};

export default IDCardViewer;