import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import CreateCertificate from './CreateCertificate';
import BulkCertificate from './BulkCertificate';
import ManageCertificates from './ManageCertificates';

const Certificates = () => {
  return (
    <Routes>
      <Route path="/" element={<CertificateHome />} />
      <Route path="/create" element={<CreateCertificate />} />
      <Route path="/bulk" element={<BulkCertificate />} />
      <Route path="/manage" element={<ManageCertificates />} />
    </Routes>
  );
};

const CertificateHome = () => {
  const [loading, setLoading] = useState(false);

  const exportCertificates = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/certificates/export');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Certificates');
      
      const certData = response.data.map(cert => ({
        'Certificate Code': cert.certificate_code,
        'Name': cert.name,
        'Certificate Type': cert.certificate_type,
        'Issue Date': cert.issue_date,
        'Status': cert.status,
        'Batch ID': cert.batch_id || 'N/A',
        'Created At': new Date(cert.created_at).toLocaleDateString()
      }));
      
      if (certData.length > 0) {
        worksheet.columns = Object.keys(certData[0]).map(key => ({
          header: key,
          key,
          width: 20
        }));
        certData.forEach(row => worksheet.addRow(row));
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Certificates_Report.xlsx');
    } catch (error) {
      alert('Error exporting certificates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="certificates-container">
      <div className="certificates-header">
        <h1>📜 Certificate Management</h1>
        <p>Create, manage, and verify certificates</p>
      </div>

      <div className="certificates-actions">
        <Link to="/certificates/create" className="cert-action-card">
          <div className="cert-icon">➕</div>
          <h3>Create Certificate</h3>
          <p>Generate single certificate manually</p>
        </Link>

        <Link to="/certificates/bulk" className="cert-action-card">
          <div className="cert-icon">📊</div>
          <h3>Bulk Certificates</h3>
          <p>Generate certificates from Excel</p>
        </Link>

        <Link to="/certificates/manage" className="cert-action-card">
          <div className="cert-icon">📋</div>
          <h3>Manage Certificates</h3>
          <p>View and manage all certificates</p>
        </Link>

        <Link to="/verify" className="cert-action-card">
          <div className="cert-icon">✅</div>
          <h3>Verify Certificate</h3>
          <p>Verify certificate authenticity</p>
        </Link>

        <button onClick={exportCertificates} className="cert-action-card" style={{ border: 'none', cursor: 'pointer' }} disabled={loading}>
          <div className="cert-icon">📥</div>
          <h3>Export Certificates</h3>
          <p>{loading ? 'Exporting...' : 'Download Excel report'}</p>
        </button>
      </div>
    </div>
  );
};

export default Certificates;
