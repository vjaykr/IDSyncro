import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ProfessionalDashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    employees: 0,
    interns: 0,
    active: 0,
    thisMonth: 0
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/employees');
      const employeeData = response.data;
      setEmployees(employeeData);
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      setStats({
        total: employeeData.length,
        employees: employeeData.filter(emp => emp.type === 'employee').length,
        interns: employeeData.filter(emp => emp.type === 'intern').length,
        active: employeeData.filter(emp => emp.status === 'active').length,
        thisMonth: employeeData.filter(emp => {
          const createdDate = new Date(emp.created_at);
          return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
        }).length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const exportToExcel = async (data, filename) => {
    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Employees');
      
      if (data.length > 0) {
        worksheet.columns = Object.keys(data[0]).map(key => ({
          header: key,
          key,
          width: Math.min(Math.max(key.length + 5, 15), 50)
        }));
        data.forEach(row => worksheet.addRow(row));
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${filename}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data');
    } finally {
      setLoading(false);
    }
  };

  const exportAllEmployees = () => {
    const exportData = employees.map(emp => ({
      'UUID': emp.uuid,
      'Employee ID': emp.employee_id,
      'Name': emp.name,
      'Type': emp.type,
      'Department': emp.department,
      'Designation': emp.designation,
      'Email': emp.email,
      'Phone': emp.phone,
      'Address': emp.address,
      'Date of Birth': emp.date_of_birth,
      'Joining Date': emp.joining_date,
      'Manager': emp.manager,
      'Blood Group': emp.blood_group,
      'Emergency Contact': emp.emergency_contact,
      'Emergency Phone': emp.emergency_phone,
      'Salary': emp.salary,
      'Bank Account': emp.bank_account,
      'Aadhar Number': emp.aadhar_number,
      'PAN Number': emp.pan_number,
      'Status': emp.status,
      'Created Date': new Date(emp.created_at).toLocaleDateString()
    }));
    exportToExcel(exportData, 'All_Employees_Report');
  };

  const exportByType = (type) => {
    let filteredData;
    let filename;
    
    if (type === 'thisMonth') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      filteredData = employees.filter(emp => {
        const createdDate = new Date(emp.created_at);
        return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
      });
      filename = 'This_Month_Report';
    } else {
      filteredData = employees.filter(emp => emp.type === type);
      filename = `${type.charAt(0).toUpperCase() + type.slice(1)}s_Report`;
    }
    
    const exportData = filteredData.map(emp => ({
      'UUID': emp.uuid,
      'Employee ID': emp.employee_id,
      'Name': emp.name,
      'Department': emp.department,
      'Designation': emp.designation,
      'Email': emp.email,
      'Phone': emp.phone,
      'Joining Date': emp.joining_date,
      'Manager': emp.manager,
      'Status': emp.status,
      'Created Date': new Date(emp.created_at).toLocaleDateString()
    }));
    exportToExcel(exportData, filename);
  };

  const exportSummaryReport = () => {
    const summaryData = [
      { 'Metric': 'Total Employees', 'Count': stats.total },
      { 'Metric': 'Employees', 'Count': stats.employees },
      { 'Metric': 'Interns', 'Count': stats.interns },
      { 'Metric': 'Active IDs', 'Count': stats.active },
      { 'Metric': 'Created This Month', 'Count': stats.thisMonth }
    ];
    exportToExcel(summaryData, 'Summary_Report');
  };

  const exportCertificates = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/certificates/export');
      const certData = response.data.map(cert => ({
        'Certificate Code': cert.certificate_code,
        'Name': cert.name,
        'Certificate Type': cert.certificate_type,
        'Issue Date': cert.issue_date,
        'Status': cert.status,
        'Batch ID': cert.batch_id || 'N/A',
        'Created At': new Date(cert.created_at).toLocaleDateString()
      }));
      exportToExcel(certData, 'Certificates_Report');
    } catch (error) {
      console.error('Error exporting certificates:', error);
      alert('Error exporting certificates');
    } finally {
      setLoading(false);
    }
  };

  const bulkActions = [
    { label: 'Export All Data', action: exportAllEmployees, icon: '📊', color: '#2ecc71' },
    { label: 'Employee Report', action: () => exportByType('employee'), icon: '👥', color: '#3498db' },
    { label: 'Intern Report', action: () => exportByType('intern'), icon: '🎓', color: '#9b59b6' },
    { label: 'Certificates Report', action: exportCertificates, icon: '📜', color: '#16a085' },
    { label: 'Summary Report', action: exportSummaryReport, icon: '📈', color: '#e67e22' }
  ];

  const quickActions = [
    { label: 'Create Employee', path: '/create', icon: '➕', color: '#27ae60' },
    { label: 'Manage IDs', path: '/employees', icon: '👤', color: '#2980b9' },
    { label: 'Certificates', path: '/certificates', icon: '📜', color: '#16a085' },
    { label: 'Print ID Card', path: '/employees?print=true', icon: '🖨️', color: '#e74c3c' },
    { label: 'Verify ID', path: '/verify', icon: '✅', color: '#8e44ad' },
    { label: 'Bulk Upload', path: '/bulk-upload', icon: '📤', color: '#d35400' }
  ];

  return (
    <div className="professional-dashboard">
      <div className="dashboard-header">
        <h1>🏢 IDSyncro ID Management System</h1>
        <p>Professional Employee ID Card & Certificate Management Platform</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <Link to="/employees" className="stat-card primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total IDs</div>
          </div>
        </Link>
        <Link to="/employees?filter=employee" className="stat-card success">
          <div className="stat-icon">💼</div>
          <div className="stat-content">
            <div className="stat-number">{stats.employees}</div>
            <div className="stat-label">Employees</div>
          </div>
        </Link>
        <Link to="/employees?filter=intern" className="stat-card info">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <div className="stat-number">{stats.interns}</div>
            <div className="stat-label">Interns</div>
          </div>
        </Link>
        <Link to="/employees?status=active" className="stat-card warning">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
        </Link>
        <button 
          onClick={() => exportByType('thisMonth')} 
          className="stat-card secondary"
          style={{ border: 'none', background: 'white', cursor: 'pointer' }}
        >
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.thisMonth}</div>
            <div className="stat-label">This Month</div>
          </div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="action-section">
        <h2>🚀 Quick Actions</h2>
        <div className="action-grid">
          {quickActions.map((action, index) => (
            <Link 
              key={index} 
              to={action.path} 
              className="action-card"
              style={{ borderLeft: `4px solid ${action.color}` }}
            >
              <div className="action-icon" style={{ color: action.color }}>
                {action.icon}
              </div>
              <div className="action-content">
                <h3>{action.label}</h3>
                <p>Click to {action.label.toLowerCase()}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Reports & Analytics */}
      <div className="action-section">
        <h2>📊 Reports & Analytics</h2>
        <div className="action-grid">
          {bulkActions.map((action, index) => (
            <button 
              key={index}
              onClick={action.action}
              className="action-card report-card"
              style={{ borderLeft: `4px solid ${action.color}` }}
              disabled={loading}
            >
              <div className="action-icon" style={{ color: action.color }}>
                {action.icon}
              </div>
              <div className="action-content">
                <h3>{action.label}</h3>
                <p>Download Excel report</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* System Functions */}
      <div className="action-section">
        <h2>⚙️ System Functions</h2>
        <div className="function-grid">
          <div className="function-card">
            <h3>🔒 Security Features</h3>
            <ul>
              <li>UUID-based verification</li>
              <li>QR code authentication</li>
              <li>Secure file uploads</li>
              <li>Data encryption</li>
            </ul>
          </div>
          <div className="function-card">
            <h3>📱 ID Card Features</h3>
            <ul>
              <li>Professional design</li>
              <li>Auto-generated IDs</li>
              <li>QR code integration</li>
              <li>Print-ready format</li>
            </ul>
          </div>
          <div className="function-card">
            <h3>📈 Analytics</h3>
            <ul>
              <li>Real-time statistics</li>
              <li>Monthly reports</li>
              <li>Export capabilities</li>
              <li>Data visualization</li>
            </ul>
          </div>
          <div className="function-card">
            <h3>🔧 Management</h3>
            <ul>
              <li>CRUD operations</li>
              <li>Bulk actions</li>
              <li>Search & filter</li>
              <li>Data validation</li>
            </ul>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Generating Excel report...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalDashboard;