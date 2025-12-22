import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const VerifyID = () => {
  const { uuid } = useParams();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputUuid, setInputUuid] = useState(uuid || '');

  useEffect(() => {
    if (uuid) {
      verifyID(uuid);
    }
  }, [uuid]);

  const verifyID = async (verifyUuid) => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      try {
        response = await axios.get(`http://localhost:5000/api/verify/${verifyUuid}`);
        setVerificationData({ ...response.data, verificationType: 'id' });
        return;
      } catch (idError) {
        try {
          response = await axios.get(`http://localhost:5000/api/certificates/verify/${verifyUuid}`);
          setVerificationData({ ...response.data, verificationType: 'certificate' });
          return;
        } catch (certError) {
          throw new Error('Not found');
        }
      }
    } catch (error) {
      setError('ID or Certificate not found or invalid');
      setVerificationData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (inputUuid.trim()) {
      verifyID(inputUuid.trim());
    } else {
      setError('Please enter a valid ID or Certificate Code');
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return '#28a745';
      case 'inactive': return '#6c757d';
      case 'revoked': return '#dc3545';
      default: return '#28a745';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem', color: 'white' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', margin: '0 0 0.5rem 0' }}>Verification System</h1>
          <p style={{ fontSize: '1.2rem', opacity: '0.9', margin: 0 }}>Verify IDs and Certificates</p>
        </div>
        
        {!verificationData && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '2.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '600', color: '#2c3e50', margin: '0 0 0.5rem 0' }}>Enter Verification Details</h2>
              <p style={{ color: '#6c757d', fontSize: '1rem', margin: 0 }}>Enter Employee ID, Certificate ID, or UUID</p>
            </div>
            
            <form onSubmit={handleVerify} style={{ maxWidth: '500px', margin: '0 auto' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  value={inputUuid}
                  onChange={(e) => setInputUuid(e.target.value)}
                  placeholder="e.g., SWT-25-EMP-0001 or CERT-INT-25-12345678-ABCD"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '2px solid #e9ecef',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: loading ? '#6c757d' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '2.5rem', textAlign: 'center', border: '3px solid #dc3545' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
            <h2 style={{ color: '#dc3545' }}>Verification Failed</h2>
            <p style={{ color: '#6c757d' }}>{error}</p>
            <button 
              onClick={() => { setError(null); setInputUuid(''); }}
              style={{
                padding: '0.75rem 2rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {verificationData && verificationData.verificationType === 'certificate' && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '3px solid #28a745', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', color: 'white', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>Certificate Verified</h2>
            </div>
            
            <div style={{ padding: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '2rem', fontWeight: '700', color: '#2c3e50', margin: '0 0 0.5rem 0' }}>{verificationData.name}</h3>
                <div style={{
                  display: 'inline-block',
                  background: '#667eea',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontWeight: '600'
                }}>{verificationData.certificate_code}</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600' }}>TYPE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>📜 {verificationData.certificate_type}</div>
                </div>
                
                {verificationData.domain && (
                  <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600' }}>DOMAIN</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>{verificationData.domain}</div>
                  </div>
                )}
                
                {verificationData.technology && (
                  <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600' }}>TECHNOLOGY</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>{verificationData.technology}</div>
                  </div>
                )}
                
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600' }}>ISSUE DATE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>
                    {new Date(verificationData.issue_date).toLocaleDateString()}
                  </div>
                </div>
                
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600' }}>STATUS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: getStatusColor(verificationData.status) }}>
                    {(verificationData.status || 'Active').toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button 
                  onClick={() => { setVerificationData(null); setInputUuid(''); }}
                  style={{
                    padding: '0.75rem 2rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Verify Another
                </button>
              </div>
            </div>
          </div>
        )}

        {verificationData && verificationData.verificationType === 'id' && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '3px solid #28a745', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', color: 'white', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>ID Verified</h2>
            </div>
            
            <div style={{ padding: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '2rem', fontWeight: '700', color: '#2c3e50', margin: '0 0 0.5rem 0' }}>{verificationData.name}</h3>
                <div style={{
                  display: 'inline-block',
                  background: '#667eea',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontWeight: '600'
                }}>{verificationData.employee_id}</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600' }}>TYPE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>
                    {verificationData.type === 'employee' ? '👔 Employee' : '🎓 Intern'}
                  </div>
                </div>
                
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600' }}>DEPARTMENT</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>{verificationData.department}</div>
                </div>
                
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600' }}>DESIGNATION</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>{verificationData.designation}</div>
                </div>
                
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600' }}>STATUS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: getStatusColor(verificationData.status) }}>
                    {(verificationData.status || 'Active').toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button 
                  onClick={() => { setVerificationData(null); setInputUuid(''); }}
                  style={{
                    padding: '0.75rem 2rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Verify Another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyID;
