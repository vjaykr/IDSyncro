import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BulkCertificate = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [excelData, setExcelData] = useState(null);
  const [schema, setSchema] = useState([
    { field: 'name', label: 'Name', source: 'excel', excel_column: '', required: true, locked: false },
    { field: 'person_uuid', label: 'Person UUID', source: 'excel', excel_column: '', required: true, locked: true },
    { field: 'certificate_type', label: 'Certificate Type', source: 'manual', value: 'Internship', required: true }
  ]);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('excel', file);
    
    try {
      const response = await axios.post('http://localhost:5000/api/certificates/upload-excel', formData);
      setExcelData(response.data);
      setStep(2);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to upload Excel');
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    setSchema([...schema, {
      field: `custom_${Date.now()}`,
      label: 'New Field',
      source: 'manual',
      value: '',
      required: false,
      locked: false
    }]);
  };

  const updateField = (index, key, value) => {
    const newSchema = [...schema];
    newSchema[index][key] = value;
    setSchema(newSchema);
  };

  const removeField = (index) => {
    setSchema(schema.filter((_, i) => i !== index));
  };

  const generatePreview = () => {
    const previewData = excelData.preview.slice(0, 3).map(row => {
      const cert = {};
      schema.forEach(field => {
        if (field.source === 'excel') {
          cert[field.label] = row[field.excel_column] || 'N/A';
        } else if (field.source === 'manual') {
          cert[field.label] = field.value;
        } else if (field.source === 'auto') {
          cert[field.label] = new Date().toISOString().split('T')[0];
        }
      });
      return cert;
    });
    setPreview(previewData);
    setStep(3);
  };

  const generateCertificates = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/certificates/create-bulk', {
        schema,
        excelData: excelData.data,
        excelHash: excelData.excelHash
      });
      setResult(response.data);
      setStep(4);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to generate certificates');
    } finally {
      setLoading(false);
    }
  };

  if (step === 4 && result) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '12px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2>Certificates Generated Successfully!</h2>
          <p style={{ fontSize: '1.2rem', color: '#28a745', fontWeight: '600' }}>
            {result.count} certificates created
          </p>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3>Batch Details</h3>
          <p><strong>Batch ID:</strong> {result.batchId}</p>
          <p><strong>Sample Certificates:</strong></p>
          <ul>
            {result.certificates.map((cert, i) => (
              <li key={i}>{cert.name} - {cert.certificateCode}</li>
            ))}
          </ul>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => navigate('/certificates/manage')}
            style={{
              flex: 1,
              padding: '1rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            View Certificates
          </button>
          <button
            onClick={() => window.location.reload()}
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
            Create Another Batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '12px' }}>
      <h1>📊 Bulk Certificate Generation</h1>
      <p style={{ color: '#6c757d', marginBottom: '2rem' }}>Generate multiple certificates from Excel data</p>
      
      {/* Step Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem' }}>
        {['Upload Excel', 'Schema Builder', 'Preview', 'Generate'].map((label, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: step > i ? '#28a745' : step === i + 1 ? '#667eea' : '#e9ecef',
              color: step >= i + 1 ? 'white' : '#6c757d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.5rem',
              fontWeight: '600'
            }}>
              {i + 1}
            </div>
            <div style={{ fontSize: '0.9rem', color: step >= i + 1 ? '#2c3e50' : '#6c757d' }}>{label}</div>
          </div>
        ))}
      </div>
      
      {/* Step 1: Upload Excel */}
      {step === 1 && (
        <div>
          <div style={{ border: '2px dashed #667eea', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📤</div>
            <h3>Upload Excel File</h3>
            <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
              Upload Excel exported from ID generation system
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="excel-upload"
            />
            <label
              htmlFor="excel-upload"
              style={{
                display: 'inline-block',
                padding: '1rem 2rem',
                background: '#667eea',
                color: 'white',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Uploading...' : 'Choose Excel File'}
            </label>
          </div>
        </div>
      )}
      
      {/* Step 2: Schema Builder */}
      {step === 2 && excelData && (
        <div>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <strong>Excel Info:</strong> {excelData.rowCount} rows, {excelData.headers.length} columns
          </div>
          
          <h3>Certificate Schema Builder</h3>
          <p style={{ color: '#6c757d', marginBottom: '1rem' }}>Map Excel columns and add manual fields</p>
          
          <div style={{ marginBottom: '2rem' }}>
            {schema.map((field, index) => (
              <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', padding: '1rem', background: field.locked ? '#fff3cd' : '#f8f9fa', borderRadius: '8px' }}>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, 'label', e.target.value)}
                  disabled={field.locked}
                  placeholder="Field Label"
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                
                <select
                  value={field.source}
                  onChange={(e) => updateField(index, 'source', e.target.value)}
                  disabled={field.locked}
                  style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="excel">Excel Column</option>
                  <option value="manual">Manual Value</option>
                  <option value="auto">Auto Generated</option>
                </select>
                
                {field.source === 'excel' && (
                  <select
                    value={field.excel_column}
                    onChange={(e) => updateField(index, 'excel_column', e.target.value)}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="">Select Column</option>
                    {excelData.headers.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                )}
                
                {field.source === 'manual' && (
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateField(index, 'value', e.target.value)}
                    placeholder="Enter value"
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                )}
                
                {field.source === 'auto' && (
                  <select
                    value={field.rule || 'today'}
                    onChange={(e) => updateField(index, 'rule', e.target.value)}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="today">Current Date</option>
                  </select>
                )}
                
                {!field.locked && (
                  <button
                    onClick={() => removeField(index)}
                    style={{ padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={addField}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              + Add Field
            </button>
            
            <button
              onClick={generatePreview}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Preview Certificates
            </button>
          </div>
        </div>
      )}
      
      {/* Step 3: Preview */}
      {step === 3 && (
        <div>
          <h3>Preview (First 3 Certificates)</h3>
          <div style={{ marginBottom: '2rem' }}>
            {preview.map((cert, i) => (
              <div key={i} style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h4>Certificate {i + 1}</h4>
                {Object.entries(cert).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <strong>{key}:</strong> <span>{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setStep(2)}
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
              Back to Schema
            </button>
            
            <button
              onClick={generateCertificates}
              disabled={loading}
              style={{
                flex: 1,
                padding: '1rem',
                background: loading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Generating...' : `Generate ${excelData.rowCount} Certificates`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkCertificate;
