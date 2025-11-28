import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useToast } from './Toast';

const BulkUpload = () => {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        setPreview(data.slice(0, 5)); // Show first 5 rows
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Name': 'John Doe',
        'Type': 'employee',
        'Department': 'IT',
        'Designation': 'Software Engineer',
        'Email': 'john@example.com',
        'Phone': '9876543210',
        'Address': '123 Main St',
        'Date of Birth': '1990-01-01',
        'Joining Date': '2023-01-01',
        'Manager': 'Jane Smith',
        'Blood Group': 'O+',
        'Emergency Contact': 'Jane Doe',
        'Emergency Phone': '9876543211',
        'Salary': '50000',
        'Bank Account': '1234567890',
        'Aadhar Number': '123456789012',
        'PAN Number': 'ABCDE1234F'
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'employee_template.xlsx');
  };

  const handleUpload = async () => {
    if (!file) {
      toast.warning('Please select a file');
      // Scroll to file upload area
      setTimeout(() => {
        const fileUploadArea = document.querySelector('.file-upload-area');
        if (fileUploadArea) {
          fileUploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const uploadResults = {
          success: 0,
          failed: 0,
          errors: []
        };

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            // Validate required fields
            if (!row.Name || !row.Department || !row.Email) {
              throw new Error('Missing required fields: Name, Department, or Email');
            }
            
            const employeeData = {
              name: row.Name,
              type: row.Type?.toLowerCase() || 'employee',
              department: row.Department,
              designation: row.Designation || 'Employee',
              employment_type: 'full_time',
              work_location: row['Work Location'] || 'Head Office',
              email: row.Email,
              phone: row.Phone,
              address: row.Address,
              date_of_birth: row['Date of Birth'],
              joining_date: row['Joining Date'],
              manager: row.Manager,
              blood_group: row['Blood Group'],
              emergency_contact: row['Emergency Contact'],
              emergency_phone: row['Emergency Phone'],
              salary: row.Salary,
              bank_account: row['Bank Account'],
              aadhar_number: row['Aadhar Number'],
              pan_number: row['PAN Number']
            };

            await axios.post('http://localhost:5000/api/employees', employeeData);
            uploadResults.success++;
          } catch (error) {
            uploadResults.failed++;
            uploadResults.errors.push(`Row ${i + 1} (${row.Name || 'Unknown'}): ${error.response?.data?.error || error.message}`);
          }
        }

        setResults(uploadResults);
        
        if (uploadResults.success > 0) {
          toast.success(`Successfully uploaded ${uploadResults.success} employee(s)`);
        }
        if (uploadResults.failed > 0) {
          toast.warning(`${uploadResults.failed} employee(s) failed to upload`);
        }
        
        // Clear preview and selected file after successful upload
        setFile(null);
        setPreview([]);
        // Clear the file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          fileInput.value = '';
        }
      } catch (error) {
        toast.error('Error processing file: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="bulk-upload-container">
      <div className="bulk-upload-header">
        <h1>📤 Bulk Employee Upload</h1>
        <p>Upload multiple employees at once using Excel files</p>
      </div>
      
      <div className="upload-steps">
        <div className="step-item">
          <span className="step-number">1</span>
          <span className="step-text">Download Template</span>
        </div>
        <div className="step-arrow">→</div>
        <div className="step-item">
          <span className="step-number">2</span>
          <span className="step-text">Fill Data</span>
        </div>
        <div className="step-arrow">→</div>
        <div className="step-item">
          <span className="step-number">3</span>
          <span className="step-text">Upload File</span>
        </div>
      </div>

      <div className="upload-section">
        <div className="template-section">
          <div className="section-header">
            <h3>📅 Step 1: Download Template</h3>
            <div className="section-line"></div>
          </div>
          <div className="template-content">
            <p>Download the Excel template with all required columns and sample data</p>
            <button onClick={downloadTemplate} className="template-btn">
              <span>📅</span>
              Download Excel Template
            </button>
            <div className="template-info">
              <span>💡 Template includes: Name, Department, Email, Phone, and all other required fields</span>
            </div>
          </div>
        </div>

        <div className="upload-file-section">
          <div className="section-header">
            <h3>📤 Step 2: Upload Your File</h3>
            <div className="section-line"></div>
          </div>
          
          <div className="file-upload-area" onClick={() => document.getElementById('file-input').click()}>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            
            {file ? (
              <div className="file-selected">
                <span className="file-icon">📄</span>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button 
                  className="remove-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview([]);
                  }}
                >
                  ❌
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <span className="upload-icon">📤</span>
                <div className="upload-text">
                  <h4>Click to upload Excel file</h4>
                  <p>or drag and drop your .xlsx or .xls file here</p>
                </div>
                <div className="upload-hint">Maximum file size: 10MB</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="preview-section">
          <div className="section-header">
            <h3>👀 Data Preview</h3>
            <div className="section-line"></div>
          </div>
          <div className="preview-info">
            <span>Showing first 5 rows of {preview.length}+ total rows</span>
          </div>
          <div className="table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  {Object.keys(preview[0]).map(key => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, i) => (
                      <td key={i}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="upload-actions">
            <button 
              onClick={handleUpload} 
              className="upload-btn"
              disabled={!file || loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Processing...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Upload {preview.length}+ Employees
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {results && (
        <div className="results-section">
          <div className="section-header">
            <h3>📈 Upload Results</h3>
            <div className="section-line"></div>
          </div>
          
          <div className="results-summary">
            <div className="result-card success">
              <div className="result-icon">✅</div>
              <div className="result-info">
                <div className="result-number">{results.success}</div>
                <div className="result-label">Successful</div>
              </div>
            </div>
            
            <div className="result-card error">
              <div className="result-icon">❌</div>
              <div className="result-info">
                <div className="result-number">{results.failed}</div>
                <div className="result-label">Failed</div>
              </div>
            </div>
            
            <div className="result-card total">
              <div className="result-icon">📄</div>
              <div className="result-info">
                <div className="result-number">{results.success + results.failed}</div>
                <div className="result-label">Total Processed</div>
              </div>
            </div>
          </div>
          
          {results.errors.length > 0 && (
            <div className="errors-section">
              <h4>Error Details:</h4>
              <div className="errors-list">
                {results.errors.map((error, index) => (
                  <div key={index} className="error-item">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner-large"></div>
            <h3>Processing Bulk Upload</h3>
            <p>Please wait while we process your employee data...</p>
            <div className="loading-progress">
              <div className="progress-bar"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;