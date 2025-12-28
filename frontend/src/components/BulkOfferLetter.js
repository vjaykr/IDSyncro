import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from './Toast';

const BulkOfferLetter = () => {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [uploadData, setUploadData] = useState(null);
  const [stagedData, setStagedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [generationSettings, setGenerationSettings] = useState({
    issueDate: new Date().toISOString().split('T')[0],
    validityDays: 15,
    offerType: 'Full-time'
  });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadData(null);
    setGenerationResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select an Excel file');
      return;
    }

    const formData = new FormData();
    formData.append('excel', file);

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/offer-letters/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadData(response.data);
      toast.success(`Successfully imported ${response.data.rowCount} records`);
      fetchStagedData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const fetchStagedData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/offer-letters/staging');
      setStagedData(response.data);
    } catch (error) {
      console.error('Error fetching staged data:', error);
    }
  };

  const handleGenerate = async () => {
    if (stagedData.length === 0) {
      toast.error('No staged data to generate');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/offer-letters/generate', generationSettings);
      setGenerationResult(response.data);
      toast.success(response.data.message);
      setStagedData([]);
      setUploadData(null);
      setFile(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate offer letters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-certificate-container">
      <div className="bulk-upload-card">
        <h2>📤 Bulk Offer Letter Generation</h2>
        <p>Upload an Excel file to generate multiple offer letters at once</p>

        <div className="upload-section">
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              id="excel-upload"
            />
            <label htmlFor="excel-upload" className="file-input-label">
              📁 Choose Excel File
            </label>
            {file && <span className="file-name">{file.name}</span>}
          </div>

          <button
            onClick={handleUpload}
            className="btn-primary"
            disabled={!file || loading}
          >
            {loading ? 'Uploading...' : '⬆️ Upload & Stage'}
          </button>
        </div>

        {uploadData && (
          <div className="upload-info">
            <h3>📊 Import Summary</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>File:</strong> {uploadData.filename}
              </div>
              <div className="info-item">
                <strong>Rows:</strong> {uploadData.rowCount}
              </div>
              <div className="info-item">
                <strong>Columns:</strong> {uploadData.headers.join(', ')}
              </div>
            </div>

            <h4>Preview (First 5 rows):</h4>
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {uploadData.headers.map((header, idx) => (
                      <th key={idx}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uploadData.preview.map((row, idx) => (
                    <tr key={idx}>
                      {uploadData.headers.map((header, hIdx) => (
                        <td key={hIdx}>{row[header]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stagedData.length > 0 && (
          <div className="staged-section">
            <h3>📋 Staged Data ({stagedData.length} records)</h3>
            <p className="warning-text">
              ⚠️ No offer letter numbers have been generated yet. Configure settings and click "Generate Offer Letters".
            </p>

            <div className="generation-settings">
              <h4>⚙️ Generation Settings</h4>
              <div className="settings-grid">
                <div className="setting-field">
                  <label>Issue Date</label>
                  <input
                    type="date"
                    value={generationSettings.issueDate}
                    onChange={(e) => setGenerationSettings({...generationSettings, issueDate: e.target.value})}
                  />
                </div>
                <div className="setting-field">
                  <label>Validity Period (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={generationSettings.validityDays}
                    onChange={(e) => setGenerationSettings({...generationSettings, validityDays: parseInt(e.target.value)})}
                  />
                </div>
                <div className="setting-field">
                  <label>Offer Type</label>
                  <select
                    value={generationSettings.offerType}
                    onChange={(e) => setGenerationSettings({...generationSettings, offerType: e.target.value})}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="btn-success btn-large"
              disabled={loading}
            >
              {loading ? 'Generating...' : '🚀 Generate Offer Letters'}
            </button>
          </div>
        )}

        {generationResult && (
          <div className="success-message">
            <h3>✅ Generation Complete!</h3>
            <div className="result-info">
              <p><strong>Batch ID:</strong> {generationResult.batchId}</p>
              <p><strong>Total Generated:</strong> {generationResult.count}</p>
              <p><strong>Status:</strong> All offer letters generated successfully</p>
            </div>

            <div className="generated-list">
              <h4>Generated Offer Letter Numbers:</h4>
              <ul>
                {generationResult.offerLetters.slice(0, 10).map((offer, idx) => (
                  <li key={idx}>
                    Row {offer.row}: <strong>{offer.offerLetterNumber}</strong>
                  </li>
                ))}
                {generationResult.offerLetters.length > 10 && (
                  <li>... and {generationResult.offerLetters.length - 10} more</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div className="instructions">
          <h3>📝 Instructions</h3>
          <ol>
            <li>Prepare an Excel file with offer letter data</li>
            <li>Upload the file - data will be staged (no numbers generated yet)</li>
            <li>Review the staged data</li>
            <li>Click "Generate Offer Letters" to create unique offer letter numbers</li>
            <li>All data is preserved exactly as imported</li>
            <li>Export generated offer letters from the Manage page</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default BulkOfferLetter;
