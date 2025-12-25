import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const VerifyID = () => {
  const { uuid } = useParams();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputUuid, setInputUuid] = useState(uuid || '');
  const [activeTab, setActiveTab] = useState('id');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (type === 'certificate') {
      setActiveTab('certificate');
    }
    if (uuid) {
      if (type === 'certificate') {
        setActiveTab('certificate');
        setTimeout(() => verifyID(uuid), 100);
      } else {
        verifyID(uuid);
      }
    }
  }, [uuid]);

  const verifyID = async (verifyUuid) => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      if (activeTab === 'id') {
        response = await axios.get(`http://localhost:5000/api/verify/${verifyUuid}`);
        setVerificationData({ ...response.data, verificationType: 'id' });
      } else {
        response = await axios.get(`http://localhost:5000/api/certificates/verify/${verifyUuid}`);
        setVerificationData({ ...response.data, verificationType: 'certificate' });
      }
    } catch (error) {
      setError(`The ${activeTab === 'id' ? 'Employee ID' : 'Certificate Code'} was not found or is invalid. Please check and try again.`);
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
      setError(`Please enter a valid ${activeTab === 'id' ? 'Employee ID' : 'Certificate Code'}`);
    }
  };

  const resetVerification = () => {
    setVerificationData(null);
    setError(null);
    setInputUuid('');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { text: 'Active', color: '#10B981', bg: '#D1FAE5' },
      inactive: { text: 'Inactive', color: '#6B7280', bg: '#F3F4F6' },
      revoked: { text: 'Revoked', color: '#EF4444', bg: '#FEE2E2' },
      expired: { text: 'Expired', color: '#F59E0B', bg: '#FEF3C7' },
      pending: { text: 'Pending', color: '#6366F1', bg: '#E0E7FF' }
    };
    
    const statusLower = (status || 'active').toLowerCase();
    const statusConfig = statusMap[statusLower] || statusMap.active;
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: statusConfig.bg,
        color: statusConfig.color
      }}>
        ● {statusConfig.text}
      </span>
    );
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#F9FAFB',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '1.5rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#4F46E5',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '1.25rem'
            }}>
              V
            </div>
            <div>
              <h1 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#111827',
                margin: 0
              }}>
                Verification Portal
              </h1>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#6B7280',
                margin: '0.25rem 0 0 0'
              }}>
                ISO 9001:2015 Compliant Verification System
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                backgroundColor: 'white',
                color: '#4B5563',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#F9FAFB'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Page Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Document Verification
          </h2>
          <p style={{ 
            fontSize: '1rem', 
            color: '#6B7280',
            maxWidth: '600px'
          }}>
            Verify the authenticity and status of employee credentials and certificates using our ISO-compliant verification system.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr',
          gap: '2rem',
          '@media (min-width: 1024px)': {
            gridTemplateColumns: '400px 1fr'
          }
        }}>
          {/* Left Panel - Verification Form */}
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              position: 'sticky',
              top: '6rem'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  color: '#111827',
                  marginBottom: '1rem'
                }}>
                  Verification Type
                </h3>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '4px'
                }}>
                  <button
                    onClick={() => { setActiveTab('id'); resetVerification(); }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: activeTab === 'id' ? '#4F46E5' : 'transparent',
                      color: activeTab === 'id' ? 'white' : '#4B5563',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Employee ID
                  </button>
                  <button
                    onClick={() => { setActiveTab('certificate'); resetVerification(); }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: activeTab === 'certificate' ? '#4F46E5' : 'transparent',
                      color: activeTab === 'certificate' ? 'white' : '#4B5563',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Certificate
                  </button>
                </div>
              </div>

              <form onSubmit={handleVerify}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    {activeTab === 'id' ? 'Employee ID / UUID' : 'Certificate Code / UUID'}
                  </label>
                  <input
                    type="text"
                    value={inputUuid}
                    onChange={(e) => setInputUuid(e.target.value)}
                    placeholder={activeTab === 'id' ? "Enter employee ID or UUID" : "Enter certificate code or UUID"}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      backgroundColor: '#F9FAFB',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                    onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    required
                    autoFocus
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: loading ? '#9CA3AF' : '#4F46E5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#4338CA')}
                  onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#4F46E5')}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Verifying...
                    </>
                  ) : (
                    'Verify Document'
                  )}
                </button>

                <div style={{ 
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '8px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{ color: '#0369A1' }}>💡</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0369A1' }}>
                      Quick Tips
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: '#0C4A6E',
                    margin: 0
                  }}>
                    {activeTab === 'id' 
                      ? 'Enter the full Employee ID or UUID found on the identification document.'
                      : 'Enter the Certificate Code or UUID exactly as shown on the certificate.'}
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div>
            {error && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#FEE2E2',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ color: '#DC2626', fontSize: '1.25rem' }}>!</span>
                  </div>
                  <div>
                    <h3 style={{ 
                      fontSize: '1rem', 
                      fontWeight: '600', 
                      color: '#991B1B',
                      margin: '0 0 0.5rem 0'
                    }}>
                      Verification Failed
                    </h3>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#B91C1C',
                      margin: '0 0 1rem 0'
                    }}>
                      {error}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={resetVerification}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#DC2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => setError(null)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: 'transparent',
                          color: '#6B7280',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {verificationData && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                {/* Verification Header */}
                <div style={{
                  backgroundColor: verificationData.verificationType === 'id' ? '#4F46E5' : '#059669',
                  color: 'white',
                  padding: '1.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem'
                        }}>
                          {verificationData.verificationType === 'id' ? '👔' : '📜'}
                        </div>
                        <div>
                          <h2 style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: '700',
                            margin: 0
                          }}>
                            {verificationData.name}
                          </h2>
                          <p style={{ 
                            fontSize: '0.875rem',
                            opacity: '0.9',
                            margin: '0.25rem 0 0 0'
                          }}>
                            {verificationData.verificationType === 'id' 
                              ? verificationData.employee_id
                              : verificationData.certificate_code}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        padding: '0.5rem 1rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        ✅ Verified
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem',
                        opacity: '0.9',
                        marginTop: '0.5rem'
                      }}>
                        {new Date().toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Details */}
                <div style={{ padding: '2rem' }}>
                  {/* Status Bar */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '1rem',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    marginBottom: '1.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500' }}>
                        VERIFICATION STATUS
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                        {getStatusBadge(verificationData.status)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500' }}>
                        VERIFIED BY
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                        ISO 9001:2015 System
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                  }}>
                    {verificationData.verificationType === 'id' ? (
                      <>
                        <div style={{ 
                          backgroundColor: '#F9FAFB', 
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', marginBottom: '0.25rem' }}>
                            EMPLOYEE TYPE
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {verificationData.type === 'employee' ? 'Full-time Employee' : 'Intern'}
                          </div>
                        </div>
                        
                        <div style={{ 
                          backgroundColor: '#F9FAFB', 
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', marginBottom: '0.25rem' }}>
                            DEPARTMENT
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {verificationData.department}
                          </div>
                        </div>
                        
                        <div style={{ 
                          backgroundColor: '#F9FAFB', 
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', marginBottom: '0.25rem' }}>
                            DESIGNATION
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {verificationData.designation}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ 
                          backgroundColor: '#F9FAFB', 
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', marginBottom: '0.25rem' }}>
                            CERTIFICATE TYPE
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {verificationData.certificate_type}
                          </div>
                        </div>
                        
                        {verificationData.domain && (
                          <div style={{ 
                            backgroundColor: '#F9FAFB', 
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB'
                          }}>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', marginBottom: '0.25rem' }}>
                              DOMAIN
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              {verificationData.domain}
                            </div>
                          </div>
                        )}
                        
                        {verificationData.technology && (
                          <div style={{ 
                            backgroundColor: '#F9FAFB', 
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB'
                          }}>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', marginBottom: '0.25rem' }}>
                              TECHNOLOGY
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              {verificationData.technology}
                            </div>
                          </div>
                        )}
                        
                        <div style={{ 
                          backgroundColor: '#F9FAFB', 
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', marginBottom: '0.25rem' }}>
                            ISSUE DATE
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {new Date(verificationData.issue_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid #E5E7EB'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      Verification ID: {verificationData.verificationType === 'id' 
                        ? verificationData.employee_id 
                        : verificationData.certificate_code}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={resetVerification}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: 'transparent',
                          color: '#4F46E5',
                          border: '1px solid #4F46E5',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.target.style.backgroundColor = '#4F46E5'; e.target.style.color = 'white'; }}
                        onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#4F46E5'; }}
                      >
                        Verify Another
                      </button>
                      <button
                        onClick={() => window.print()}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#4F46E5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Print Verification
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!verificationData && !error && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '2px dashed #E5E7EB',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  border: '2px dashed #D1D5DB'
                }}>
                  <span style={{ fontSize: '2rem', color: '#9CA3AF' }}>
                    {activeTab === 'id' ? '👔' : '📜'}
                  </span>
                </div>
                <h3 style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  color: '#111827',
                  marginBottom: '0.5rem'
                }}>
                  Ready for Verification
                </h3>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#6B7280',
                  maxWidth: '400px',
                  margin: '0 auto 1.5rem'
                }}>
                  Enter a {activeTab === 'id' ? 'Employee ID' : 'Certificate Code'} in the form to begin verification. 
                  Results will appear here.
                </p>
                <div style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#F0F9FF',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #BAE6FD'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#0C4A6E' }}>🔒</span>
                  <span style={{ fontSize: '0.75rem', color: '#0C4A6E', fontWeight: '500' }}>
                    All verifications are encrypted and secure
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#1F2937',
        color: 'white',
        padding: '3rem 2rem 2rem',
        marginTop: '4rem',
        borderTop: '4px solid #4F46E5'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Main Footer Content */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {/* About Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#4F46E5',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>V</span>
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>IDSyncro</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#D1D5DB', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                Secure and reliable verification system for employee credentials and certificates. 
                ISO 9001:2015 certified platform ensuring authenticity and trust.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '0.25rem 0.75rem', 
                  backgroundColor: '#10B981',
                  borderRadius: '12px',
                  fontWeight: '600'
                }}>✓ ISO Certified</span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '0.25rem 0.75rem', 
                  backgroundColor: '#3B82F6',
                  borderRadius: '12px',
                  fontWeight: '600'
                }}>🔒 Secure</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'white' }}>
                Quick Links
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.75rem' }}>
                  <a href="/" style={{ 
                    fontSize: '0.875rem', 
                    color: '#D1D5DB', 
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#4F46E5'}
                  onMouseOut={(e) => e.target.style.color = '#D1D5DB'}>
                    → Home
                  </a>
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <a href="/verify" style={{ 
                    fontSize: '0.875rem', 
                    color: '#D1D5DB', 
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#4F46E5'}
                  onMouseOut={(e) => e.target.style.color = '#D1D5DB'}>
                    → Verify Document
                  </a>
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <a href="#" style={{ 
                    fontSize: '0.875rem', 
                    color: '#D1D5DB', 
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#4F46E5'}
                  onMouseOut={(e) => e.target.style.color = '#D1D5DB'}>
                    → How It Works
                  </a>
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <a href="#" style={{ 
                    fontSize: '0.875rem', 
                    color: '#D1D5DB', 
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#4F46E5'}
                  onMouseOut={(e) => e.target.style.color = '#D1D5DB'}>
                    → FAQs
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'white' }}>
                Legal & Compliance
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.75rem' }}>
                  <a href="#" style={{ 
                    fontSize: '0.875rem', 
                    color: '#D1D5DB', 
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#4F46E5'}
                  onMouseOut={(e) => e.target.style.color = '#D1D5DB'}>
                    → Privacy Policy
                  </a>
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <a href="#" style={{ 
                    fontSize: '0.875rem', 
                    color: '#D1D5DB', 
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#4F46E5'}
                  onMouseOut={(e) => e.target.style.color = '#D1D5DB'}>
                    → Terms of Service
                  </a>
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <a href="#" style={{ 
                    fontSize: '0.875rem', 
                    color: '#D1D5DB', 
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#4F46E5'}
                  onMouseOut={(e) => e.target.style.color = '#D1D5DB'}>
                    → Data Protection
                  </a>
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <a href="#" style={{ 
                    fontSize: '0.875rem', 
                    color: '#D1D5DB', 
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#4F46E5'}
                  onMouseOut={(e) => e.target.style.color = '#D1D5DB'}>
                    → Compliance Standards
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact & Support */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'white' }}>
                Support
              </h3>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#D1D5DB', margin: '0 0 0.5rem 0' }}>
                  📧 Email: support@idsyncro.com
                </p>
                <p style={{ fontSize: '0.875rem', color: '#D1D5DB', margin: '0 0 0.5rem 0' }}>
                  📞 Phone: +1 (555) 123-4567
                </p>
                <p style={{ fontSize: '0.875rem', color: '#D1D5DB', margin: '0 0 0.5rem 0' }}>
                  🕐 Mon-Fri: 9:00 AM - 6:00 PM
                </p>
              </div>
              <div style={{ 
                padding: '0.75rem',
                backgroundColor: '#374151',
                borderRadius: '8px',
                border: '1px solid #4B5563'
              }}>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                  REPORT FRAUD
                </p>
                <p style={{ fontSize: '0.75rem', color: '#D1D5DB', margin: 0 }}>
                  fraud@idsyncro.com
                </p>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#374151',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🔒</div>
                <p style={{ fontSize: '0.75rem', color: '#D1D5DB', margin: 0, fontWeight: '600' }}>SSL Encrypted</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>✓</div>
                <p style={{ fontSize: '0.75rem', color: '#D1D5DB', margin: 0, fontWeight: '600' }}>ISO 9001:2015</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🛡️</div>
                <p style={{ fontSize: '0.75rem', color: '#D1D5DB', margin: 0, fontWeight: '600' }}>GDPR Compliant</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>⚡</div>
                <p style={{ fontSize: '0.75rem', color: '#D1D5DB', margin: 0, fontWeight: '600' }}>99.9% Uptime</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🌐</div>
                <p style={{ fontSize: '0.75rem', color: '#D1D5DB', margin: 0, fontWeight: '600' }}>Global Access</p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{ 
            borderTop: '1px solid #4B5563', 
            paddingTop: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>
              © {new Date().getFullYear()} IDSyncro Verification System. All rights reserved. v2.1.0
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Powered by IDSyncro</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href="#" style={{ 
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#4B5563',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}>🔗</a>
                <a href="#" style={{ 
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#4B5563',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}>📧</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Add CSS animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default VerifyID;