import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const VerifyID = () => {
  const { uuid } = useParams();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputUuid, setInputUuid] = useState(uuid || '');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [scanningRef, setScanningRef] = useState(null);

  useEffect(() => {
    if (uuid) {
      verifyID(uuid);
    }
  }, [uuid]);

  const verifyID = async (verifyUuid) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`http://localhost:5000/api/verify/${verifyUuid}`);
      setVerificationData(response.data);
    } catch (error) {
      setError('ID not found or invalid');
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
      // Show error and scroll to input field
      setError('Please enter a valid UUID or Employee ID');
      setTimeout(() => {
        const inputElement = document.querySelector('input[type="text"]');
        if (inputElement) {
          inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          inputElement.focus();
        }
      }, 100);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      const video = document.getElementById('camera-video');
      if (video) {
        video.srcObject = mediaStream;
        // Start QR code detection
        detectQRCode(video);
      }
    } catch (error) {
      alert('Camera access denied or not available');
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (scanningRef) {
      cancelAnimationFrame(scanningRef);
      setScanningRef(null);
    }
    setShowCamera(false);
  };

  const detectQRCode = (video) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Simple QR detection - look for URL patterns
        try {
          const code = window.jsQR && window.jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            const qrText = code.data;
            // Extract UUID from QR code URL
            const match = qrText.match(/\/verify\/([a-f0-9-]+)$/i);
            if (match) {
              setInputUuid(match[1]);
              closeCamera();
              setTimeout(() => verifyID(match[1]), 100);
              return;
            }
            // If it's just an employee ID
            if (qrText.match(/^SWT-\d{2}-(EMP|INT)-\d{4}$/)) {
              setInputUuid(qrText);
              closeCamera();
              setTimeout(() => verifyID(qrText), 100);
              return;
            }
          }
        } catch (e) {
          // Continue scanning
        }
      }
      
      if (showCamera && stream) {
        const frameId = requestAnimationFrame(scan);
        setScanningRef(frameId);
      }
    };
    
    scan();
  };

  // Load jsQR library and handle cleanup
  useEffect(() => {
    if (!window.jsQR) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      document.head.appendChild(script);
    }
    
    // Cleanup on unmount or navigation
    const handleBeforeUnload = () => closeCamera();
    const handleVisibilityChange = () => {
      if (document.hidden) closeCamera();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      closeCamera();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Auto-close camera when component unmounts or showCamera changes
  useEffect(() => {
    if (!showCamera) {
      closeCamera();
    }
  }, [showCamera]);

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return '#28a745';
      case 'inactive': return '#6c757d';
      case 'terminated': return '#dc3545';
      case 'resigned': return '#fd7e14';
      case 'on_leave': return '#ffc107';
      case 'suspended': return '#e83e8c';
      default: return '#28a745';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', color: 'white' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', margin: '0 0 0.5rem 0', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>ID Verification System</h1>
          <p style={{ fontSize: '1.2rem', opacity: '0.9', margin: 0 }}>Secure employee ID verification portal</p>
        </div>
        
        {/* Camera Modal */}
        {showCamera && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              textAlign: 'center'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>📷 QR Code Scanner</h3>
              <div style={{
                width: '100%',
                height: '300px',
                background: '#f8f9fa',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                border: '2px dashed #667eea'
              }}>
                <video 
                  id="camera-video"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '10px'
                  }}
                  autoPlay
                  playsInline
                />
              </div>
              <p style={{ color: '#6c757d', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Position the QR code within the camera view
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={startCamera}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  📷 Start Camera
                </button>
                <button
                  onClick={closeCamera}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ❌ Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Form */}
        {!verificationData && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '2.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '600', color: '#2c3e50', margin: '0 0 0.5rem 0' }}>Enter Verification Details</h2>
              <p style={{ color: '#6c757d', fontSize: '1rem', margin: 0 }}>Scan QR code or enter UUID/Employee ID manually</p>
            </div>
            
            <form onSubmit={handleVerify} style={{ maxWidth: '500px', margin: '0 auto' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#2c3e50' }}>ID UUID or Employee ID</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={inputUuid}
                    onChange={(e) => setInputUuid(e.target.value)}
                    placeholder="Enter UUID, Employee ID, or scan QR code"
                    style={{
                      width: '100%',
                      padding: '1rem 4rem 1rem 3rem',
                      border: '2px solid #e9ecef',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      transition: 'all 0.3s',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                    required
                  />
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>🔍</span>
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Scan QR Code"
                  >
                    📷
                  </button>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6c757d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>💡</span>
                  <span>Click the camera icon to scan QR code or enter manually</span>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1rem 2rem',
                  background: loading ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? (
                  <>
                    <div style={{ width: '20px', height: '20px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    Verify ID
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Error Result */}
        {error && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '2.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '3px solid #dc3545' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '600', color: '#dc3545', margin: '0 0 0.5rem 0' }}>Verification Failed</h2>
              <p style={{ color: '#6c757d', fontSize: '1.1rem', margin: 0 }}>{error}</p>
            </div>
            
            <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ color: '#495057', marginBottom: '1rem', fontSize: '1.1rem' }}>💡 Suggestions:</h4>
              <ul style={{ color: '#6c757d', margin: 0, paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Check if the ID number is correct</li>
                <li style={{ marginBottom: '0.5rem' }}>Ensure QR code is not damaged</li>
                <li>Contact HR department if issue persists</li>
              </ul>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button 
                onClick={() => { setError(null); setInputUuid(''); }}
                style={{
                  padding: '0.75rem 2rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Success Result */}
        {verificationData && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '3px solid #28a745', overflow: 'hidden' }}>
            {/* Success Header */}
            <div style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', color: 'white', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0' }}>ID Verified Successfully</h2>
              <p style={{ opacity: '0.9', margin: 0, fontSize: '1rem' }}>This ID is authentic and valid</p>
            </div>
            
            {/* Employee Card */}
            <div style={{ padding: '2.5rem' }}>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Photo Section */}
                <div style={{ textAlign: 'center', minWidth: '200px' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    {verificationData.photo ? (
                      <img 
                        src={`http://localhost:5000/uploads/${verificationData.photo}`}
                        alt={verificationData.name}
                        style={{
                          width: '150px',
                          height: '150px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '4px solid #28a745',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        background: '#f8f9fa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3rem',
                        border: '4px solid #28a745'
                      }}>📷</div>
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      background: '#28a745',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '600'
                    }}>✅ VERIFIED</div>
                  </div>
                </div>
                
                {/* Details Section */}
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: '700', color: '#2c3e50', margin: '0 0 0.5rem 0' }}>{verificationData.name}</h3>
                    <div style={{
                      display: 'inline-block',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}>{verificationData.employee_id}</div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600', marginBottom: '0.25rem' }}>TYPE</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>
                        {verificationData.type === 'employee' ? '👔 Employee' : '🎓 Intern'}
                      </div>
                    </div>
                    
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600', marginBottom: '0.25rem' }}>DEPARTMENT</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>{verificationData.department}</div>
                    </div>
                    
                    {verificationData.designation && (
                      <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600', marginBottom: '0.25rem' }}>DESIGNATION</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>{verificationData.designation}</div>
                      </div>
                    )}
                    
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600', marginBottom: '0.25rem' }}>STATUS</div>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600', 
                        color: getStatusColor(verificationData.status),
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(verificationData.status) }}></span>
                        {(verificationData.status || 'Active').toUpperCase()}
                      </div>
                    </div>
                    
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600', marginBottom: '0.25rem' }}>ISSUED DATE</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>
                        {new Date(verificationData.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div style={{ borderTop: '2px solid #f8f9fa', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#28a745', fontWeight: '600' }}>
                  <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                  <span>This ID is verified and authentic</span>
                </div>
                <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                  Verified on {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              
              {/* Action Button */}
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button 
                  onClick={() => { setVerificationData(null); setInputUuid(''); }}
                  style={{
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  Verify Another ID
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VerifyID;