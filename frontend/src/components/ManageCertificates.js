import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManageCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/certificates');
      setCertificates(response.data);
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeCertificate = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this certificate?')) return;
    
    const reason = prompt('Enter revocation reason:');
    if (!reason) return;
    
    try {
      await axios.post(`http://localhost:5000/api/certificates/revoke/${id}`, { reason });
      alert('Certificate revoked successfully');
      fetchCertificates();
    } catch (error) {
      alert('Failed to revoke certificate');
    }
  };

  const filteredCerts = certificates.filter(cert => {
    if (filter === 'all') return true;
    return cert.status === filter;
  });

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading certificates...</div>;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>📋 Manage Certificates</h1>
          <p style={{ color: '#6c757d', margin: 0 }}>Total: {certificates.length} certificates</p>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontWeight: '600' }}
        >
          <option value="all">All Certificates</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>
      
      {filteredCerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <p>No certificates found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Certificate ID</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Issue Date</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCerts.map(cert => (
                <tr key={cert.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
                    {cert.certificate_code}
                  </td>
                  <td style={{ padding: '1rem' }}>{cert.name}</td>
                  <td style={{ padding: '1rem' }}>{cert.certificate_type}</td>
                  <td style={{ padding: '1rem' }}>
                    {new Date(cert.issue_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      background: cert.status === 'active' ? '#d4edda' : '#f8d7da',
                      color: cert.status === 'active' ? '#155724' : '#721c24'
                    }}>
                      {cert.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => window.open(`/verify/${cert.certificate_code}?type=certificate`, '_blank')}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Verify
                      </button>
                      {cert.status === 'active' && (
                        <button
                          onClick={() => revokeCertificate(cert.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageCertificates;
