import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreateCertificate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    person_uuid: '',
    name: '',
    certificate_type: 'Internship',
    domain: '',
    technology: '',
    mentor: '',
    issue_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:5000/api/certificates/create-single', {
        certificateData: formData
      });
      
      setResult(response.data);
      setTimeout(() => navigate('/certificates/manage'), 2000);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create certificate');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h2>Certificate Created Successfully!</h2>
        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
          <strong>Certificate ID:</strong> {result.certificateCode}
        </div>
        <p>Redirecting to manage page...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '12px' }}>
      <h1>📜 Create Single Certificate</h1>
      <p style={{ color: '#6c757d', marginBottom: '2rem' }}>Manually create a certificate for an individual</p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Person UUID *</label>
            <input
              type="text"
              name="person_uuid"
              value={formData.person_uuid}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px' }}
              placeholder="Enter person UUID from ID system"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Certificate Type *</label>
            <select
              name="certificate_type"
              value={formData.certificate_type}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px' }}
            >
              <option value="Internship">Internship</option>
              <option value="Employment">Employment</option>
              <option value="Training">Training</option>
              <option value="Achievement">Achievement</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Domain</label>
            <input
              type="text"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px' }}
              placeholder="e.g., Web Development"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Technology</label>
            <input
              type="text"
              name="technology"
              value={formData.technology}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px' }}
              placeholder="e.g., MERN Stack"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Mentor</label>
            <input
              type="text"
              name="mentor"
              value={formData.mentor}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Issue Date</label>
            <input
              type="date"
              name="issue_date"
              value={formData.issue_date}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px' }}
            />
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '1rem',
              background: loading ? '#6c757d' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating...' : 'Create Certificate'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/certificates')}
            style={{
              padding: '1rem 2rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCertificate;
