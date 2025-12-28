import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from './Toast';

const CreateOfferLetter = () => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    candidate_name: '',
    company_name: '',
    designation: '',
    department: '',
    salary: '',
    joining_date: '',
    validity_period: '',
    location: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedOffer, setGeneratedOffer] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.candidate_name || !formData.company_name || !formData.designation) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/offer-letters/create-single', {
        offerData: formData
      });
      
      setGeneratedOffer(response.data);
      toast.success('Offer letter generated successfully!');
      
      // Reset form
      setFormData({
        candidate_name: '',
        company_name: '',
        designation: '',
        department: '',
        salary: '',
        joining_date: '',
        validity_period: '',
        location: '',
        email: '',
        phone: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate offer letter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-certificate-container">
      <div className="certificate-form-card">
        <h2>📝 Create Individual Offer Letter</h2>
        
        <form onSubmit={handleSubmit} className="certificate-form">
          <div className="form-row">
            <div className="form-group">
              <label>Candidate Name *</label>
              <input
                type="text"
                name="candidate_name"
                value={formData.candidate_name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Company Name *</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Designation *</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Salary</label>
              <input
                type="text"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Joining Date</label>
              <input
                type="date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label>Validity Period</label>
              <input
                type="text"
                name="validity_period"
                value={formData.validity_period}
                onChange={handleChange}
                placeholder="e.g., 30 days"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Generating...' : '📄 Generate Offer Letter'}
          </button>
        </form>
        
        {generatedOffer && (
          <div className="success-message">
            <h3>✅ Offer Letter Generated Successfully!</h3>
            <p><strong>Offer Letter Number:</strong> {generatedOffer.offerLetterNumber}</p>
            <p>The offer letter has been created and can be verified using this number.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateOfferLetter;
