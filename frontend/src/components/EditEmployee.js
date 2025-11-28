import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { validateField, formatInput, getPanPlaceholder } from '../utils/validation';
import { useToast } from './Toast';

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    department: '',
    type: 'employee',
    employment_type: 'full_time',
    work_location: '',
    status: 'active',
    email: '',
    phone: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    date_of_birth: '',
    joining_date: '',
    salary: '',
    bank_account: '',
    aadhar_number: '',
    pan_number: '',
    blood_group: '',
    manager: ''
  });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [existingPhoto, setExistingPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/employees/${id}`);
      const employee = response.data;
      setFormData({
        name: employee.name,
        designation: employee.designation || '',
        department: employee.department,
        type: employee.type,
        employment_type: employee.employment_type || 'full_time',
        work_location: employee.work_location || '',
        status: employee.status || 'active',
        email: employee.email || '',
        phone: employee.phone || '',
        address: employee.address || '',
        emergency_contact: employee.emergency_contact || '',
        emergency_phone: employee.emergency_phone || '',
        date_of_birth: employee.date_of_birth || '',
        joining_date: employee.joining_date || '',
        salary: employee.salary || '',
        bank_account: employee.bank_account || '',
        aadhar_number: employee.aadhar_number || '',
        pan_number: employee.pan_number || '',
        blood_group: employee.blood_group || '',
        manager: employee.manager || ''
      });
      if (employee.photo) {
        setExistingPhoto(employee.photo);
        setPreview(`http://localhost:5000/uploads/${employee.photo}`);
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast.error('Error loading employee data');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Format input in real-time
    const formattedValue = formatInput(name, value);
    
    setFormData({
      ...formData,
      [name]: formattedValue
    });

    // Real-time validation
    const validation = validateField(name, formattedValue);
    setErrors({
      ...errors,
      [name]: validation.valid ? (validation.progress || '') : validation.error
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    setPhoto(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate only required fields
    const newErrors = {};
    const requiredFields = [
      'name', 'designation', 'department', 'type', 'employment_type', 'work_location',
      'email', 'phone'
    ];

    requiredFields.forEach(field => {
      const validation = validateField(field, formData[field]);
      if (!validation.valid) {
        newErrors[field] = validation.error;
      }
    });

    // Validate optional fields only if they have values
    const optionalFields = ['date_of_birth', 'joining_date', 'aadhar_number', 'pan_number', 'bank_account', 'salary', 'emergency_phone'];
    optionalFields.forEach(field => {
      if (formData[field] && formData[field].trim()) {
        const validation = validateField(field, formData[field]);
        if (!validation.valid) {
          newErrors[field] = validation.error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      
      // Show toast and scroll to first error
      const firstErrorField = Object.keys(newErrors)[0];
      toast.error(`Please fix validation errors: ${newErrors[firstErrorField]}`);
      
      // Scroll to first error field
      setTimeout(() => {
        const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          errorElement.focus();
        }
      }, 100);
      
      return;
    }

    setErrors({});

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });
    
    if (photo) {
      submitData.append('photo', photo);
    }
    
    if (existingPhoto) {
      submitData.append('existingPhoto', existingPhoto);
    }

    try {
      await axios.put(`http://localhost:5000/api/employees/${id}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Employee updated successfully!');
      navigate('/employees');
    } catch (error) {
      console.error('Error updating employee:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        toast.error(error.response.data.error || 'Validation errors found');
      } else {
        toast.error(error.response?.data?.error || 'Error updating employee. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-employee-container">
      <div className="create-employee-header">
        <h1>Edit Employee</h1>
        <p>Update employee information and details</p>
      </div>
      
      <div className="create-employee-form">


        <form onSubmit={handleSubmit} className="professional-form">
          {/* Basic Information Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>👤 Basic Information</h3>
              <div className="section-line"></div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>ID Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className={errors.type ? 'error' : ''}
                  required
                >
                  <option value="employee">👔 Employee</option>
                  <option value="intern">🎓 Intern</option>
                </select>
                {errors.type && <span className="error-text">{errors.type}</span>}
              </div>

              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Enter full name"
                  required
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>Designation *</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  className={errors.designation ? 'error' : ''}
                  placeholder="e.g., Software Engineer"
                  required
                />
                {errors.designation && <span className="error-text">{errors.designation}</span>}
              </div>

              <div className="form-group">
                <label>Department *</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className={errors.department ? 'error' : ''}
                  placeholder="e.g., Information Technology"
                  required
                />
                {errors.department && <span className="error-text">{errors.department}</span>}
              </div>

              <div className="form-group">
                <label>Employment Type *</label>
                <select
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleInputChange}
                  className={errors.employment_type ? 'error' : ''}
                  required
                >
                  <option value="full_time">💼 Full-Time</option>
                  <option value="part_time">⏰ Part-Time</option>
                  <option value="contract">📋 Contract</option>
                  <option value="intern">🎓 Intern</option>
                </select>
                {errors.employment_type && <span className="error-text">{errors.employment_type}</span>}
              </div>

              <div className="form-group">
                <label>Work Location *</label>
                <input
                  type="text"
                  name="work_location"
                  value={formData.work_location}
                  onChange={handleInputChange}
                  className={errors.work_location ? 'error' : ''}
                  placeholder="e.g., Head Office"
                  required
                />
                {errors.work_location && <span className="error-text">{errors.work_location}</span>}
              </div>

              <div className="form-group">
                <label>Employment Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={errors.status ? 'error' : ''}
                  required
                >
                  <option value="active">✅ Active</option>
                  <option value="inactive">❌ Inactive</option>
                  <option value="terminated">🚫 Terminated</option>
                  <option value="resigned">💼 Resigned</option>
                  <option value="on_leave">🏖️ On Leave</option>
                  <option value="suspended">⏸️ Suspended</option>
                </select>
                {errors.status && <span className="error-text">{errors.status}</span>}
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>📞 Contact Information</h3>
              <div className="section-line"></div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="name@company.com"
                  required
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={errors.phone ? 'error' : ''}
                  placeholder="10 digit mobile number"
                  maxLength="10"
                  required
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>

              <div className="form-group full-width">
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Enter complete address"
                />
              </div>
            </div>
          </div>

          {/* Personal Details Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>📅 Personal Details</h3>
              <div className="section-line"></div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className={errors.date_of_birth ? 'error' : ''}
                />
                {errors.date_of_birth && <span className="error-text">{errors.date_of_birth}</span>}
              </div>

              <div className="form-group">
                <label>Joining Date</label>
                <input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleInputChange}
                  className={errors.joining_date ? 'error' : ''}
                />
                {errors.joining_date && <span className="error-text">{errors.joining_date}</span>}
              </div>

              <div className="form-group">
                <label>Blood Group</label>
                <select
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleInputChange}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">🩸 A+</option>
                  <option value="A-">🩸 A-</option>
                  <option value="B+">🩸 B+</option>
                  <option value="B-">🩸 B-</option>
                  <option value="AB+">🩸 AB+</option>
                  <option value="AB-">🩸 AB-</option>
                  <option value="O+">🩸 O+</option>
                  <option value="O-">🩸 O-</option>
                </select>
              </div>

              <div className="form-group">
                <label>Manager</label>
                <input
                  type="text"
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  placeholder="Reporting manager name"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>🚨 Emergency Contact</h3>
              <div className="section-line"></div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Contact Name</label>
                <input
                  type="text"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleInputChange}
                  placeholder="Emergency contact person"
                />
              </div>

              <div className="form-group">
                <label>Contact Phone</label>
                <input
                  type="tel"
                  name="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={handleInputChange}
                  className={errors.emergency_phone ? 'error' : ''}
                  placeholder="10 digit mobile number"
                  maxLength="10"
                />
                {errors.emergency_phone && <span className="error-text">{errors.emergency_phone}</span>}
              </div>
            </div>
          </div>

          {/* Financial & Legal Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>💰 Financial & Legal Information</h3>
              <div className="section-line"></div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Salary</label>
                <input
                  type="text"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  className={errors.salary ? 'error' : ''}
                  placeholder="e.g., 50000"
                />
                {errors.salary && <span className="error-text">{errors.salary}</span>}
              </div>

              <div className="form-group">
                <label>Bank Account</label>
                <input
                  type="text"
                  name="bank_account"
                  value={formData.bank_account}
                  onChange={handleInputChange}
                  className={errors.bank_account ? 'error' : ''}
                  placeholder="9-18 digits"
                />
                {errors.bank_account && <span className="error-text">{errors.bank_account}</span>}
              </div>

              <div className="form-group">
                <label>Aadhar Number</label>
                <input
                  type="text"
                  name="aadhar_number"
                  value={formData.aadhar_number}
                  onChange={handleInputChange}
                  className={errors.aadhar_number ? 'error' : ''}
                  placeholder="12 digits"
                  maxLength="12"
                />
                {errors.aadhar_number && <span className="error-text">{errors.aadhar_number}</span>}
              </div>

              <div className="form-group">
                <label>PAN Number</label>
                <input
                  type="text"
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleInputChange}
                  className={`pan-input ${errors.pan_number ? 'error' : ''}`}
                  placeholder="e.g., ABCDE1234F"
                  maxLength="10"
                />
                <div className="format-hint">
                  Format: ABCDE1234F (5 letters + 4 digits + 1 letter)
                </div>
                {errors.pan_number && <span className="error-text">{errors.pan_number}</span>}
              </div>
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>📷 Photo Upload</h3>
              <div className="section-line"></div>
            </div>
            <div className="photo-upload-container">
              <div className="photo-upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="photo-input"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="photo-upload-label">
                  {preview ? (
                    <img src={preview} alt="Preview" className="photo-preview" />
                  ) : (
                    <div className="photo-placeholder">
                      <span className="upload-icon">📷</span>
                      <span>Click to upload photo</span>
                      <span className="upload-hint">JPG, PNG up to 5MB</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Updating...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Update Employee
                </>
              )}
            </button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={() => navigate('/employees')}
            >
              <span>❌</span>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployee;