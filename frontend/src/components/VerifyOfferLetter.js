import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from './Toast';
import { API_BASE_URL } from '../config';

const VerifyOfferLetter = () => {
  const { showToast } = useToast();
  const [offerNumber, setOfferNumber] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!offerNumber.trim()) {
      showToast('Please enter an offer letter number', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/offer-letters/verify/${offerNumber.trim()}`);
      setVerificationResult(response.data);
      showToast('Offer letter verified successfully!', 'success');
    } catch (error) {
      if (error.response?.status === 404) {
        setError('Offer letter not found');
      } else {
        setError(error.response?.data?.error || 'Verification failed');
      }
      showToast(error.response?.data?.error || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOfferNumber('');
    setVerificationResult(null);
    setError(null);
  };

  return (
    <div className="verify-container">
      <div className="verify-card">
        <h2>✅ Verify Offer Letter</h2>
        <p>Enter the offer letter number to verify its authenticity</p>

        <form onSubmit={handleVerify} className="verify-form">
          <div className="form-group">
            <label>Offer Letter Number</label>
            <input
              type="text"
              value={offerNumber}
              onChange={(e) => setOfferNumber(e.target.value)}
              placeholder="e.g., OL-2024-123456"
              className="verify-input"
            />
          </div>

          <div className="button-group">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : '🔍 Verify'}
            </button>
            <button type="button" onClick={handleReset} className="btn-secondary">
              🔄 Reset
            </button>
          </div>
        </form>

        {error && (
          <div className="error-result">
            <div className="error-icon">❌</div>
            <h3>Verification Failed</h3>
            <p>{error}</p>
          </div>
        )}

        {verificationResult && (
          <div className="verification-result success">
            <div className="result-header">
              <div className="success-icon">✅</div>
              <h3>Offer Letter Verified</h3>
            </div>

            <div className="result-details">
              <div className="detail-row">
                <span className="detail-label">Offer Letter Number:</span>
                <span className="detail-value">{verificationResult.offer_letter_number}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Company Name:</span>
                <span className="detail-value">{verificationResult.company_name || 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Designation:</span>
                <span className="detail-value">{verificationResult.designation || 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Validity Period:</span>
                <span className="detail-value">{verificationResult.validity_period || 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Issue Date:</span>
                <span className="detail-value">
                  {verificationResult.issue_date ? 
                    new Date(verificationResult.issue_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 
                    new Date(verificationResult.generated_timestamp || verificationResult.generated_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  }
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`status-badge ${verificationResult.status}`}>
                  {verificationResult.status}
                </span>
              </div>
            </div>

            <div className="verification-badge">
              <p>✓ This offer letter is authentic and verified by IDSyncro System</p>
            </div>
          </div>
        )}

        <div className="info-section">
          <h3>ℹ️ About Verification</h3>
          <ul>
            <li>Only publicly viewable information is displayed</li>
            <li>Personal and sensitive data is protected</li>
            <li>Each offer letter has a unique number</li>
            <li>Verification is instant and secure</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VerifyOfferLetter;
