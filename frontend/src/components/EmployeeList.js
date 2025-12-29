import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import IDCardViewer from './IDCardViewer';
import { useToast } from './Toast';
import { buildApiUrl, UPLOADS_BASE_URL, buildVerifyPortalUrl } from '../config';

// Load jsPDF
if (typeof window !== 'undefined' && !window.jspdf) {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  document.head.appendChild(script);
}

const EmployeeList = () => {
  const location = useLocation();
  const toast = useToast();
  const [allEmployees, setAllEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showIdCard, setShowIdCard] = useState(null);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [departments, setDepartments] = useState([]);
  const [printMode, setPrintMode] = useState(false);
  const [servicesMode, setServicesMode] = useState(false);
  const [newStatus, setNewStatus] = useState('active');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newType, setNewType] = useState('employee');
  const [showTypeModal, setShowTypeModal] = useState(false);
    const openVerifyPortal = (identifier) => {
      if (!identifier) {
        return;
      }
      const url = buildVerifyPortalUrl(`/verify/${identifier}`);
      window.open(url, '_blank', 'noopener,noreferrer');
    };
  const [advancedFilters, setAdvancedFilters] = useState({
    bloodGroup: 'all',
    joiningDateFrom: '',
    joiningDateTo: '',
    salaryMin: '',
    salaryMax: ''
  });



  useEffect(() => {
    // Handle URL parameters whenever location changes
    const urlParams = new URLSearchParams(location.search);
    const urlFilter = urlParams.get('filter');
    const urlStatus = urlParams.get('status');
    const urlPrint = urlParams.get('print');
    const urlServices = urlParams.get('services');
    
    // Set filters from URL parameters
    if (urlFilter) {
      setFilter(urlFilter);
    }
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
    setPrintMode(urlPrint === 'true');
    setServicesMode(urlServices === 'true');
  }, [location.search]);



  const fetchAllEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      const employees = response.data || [];
      setAllEmployees(employees);
      setFilteredEmployees(employees);
      
      // Extract departments
      const uniqueDepts = [...new Set(employees.map(emp => emp.department).filter(Boolean))];
      setDepartments(uniqueDepts);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setAllEmployees([]);
      setFilteredEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allEmployees];

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(search) ||
        emp.employee_id.toLowerCase().includes(search) ||
        emp.department.toLowerCase().includes(search) ||
        emp.designation.toLowerCase().includes(search) ||
        (emp.email && emp.email.toLowerCase().includes(search)) ||
        (emp.phone && emp.phone.includes(search))
      );
    }

    // Type filter
    if (filter !== 'all') {
      filtered = filtered.filter(emp => emp.type === filter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(emp => emp.department === departmentFilter);
    }

    // Advanced filters
    if (advancedFilters.bloodGroup !== 'all') {
      filtered = filtered.filter(emp => emp.blood_group === advancedFilters.bloodGroup);
    }

    if (advancedFilters.joiningDateFrom || advancedFilters.joiningDateTo) {
      filtered = filtered.filter(emp => {
        const joiningDate = new Date(emp.joining_date);
        const fromDate = advancedFilters.joiningDateFrom ? new Date(advancedFilters.joiningDateFrom) : null;
        const toDate = advancedFilters.joiningDateTo ? new Date(advancedFilters.joiningDateTo) : null;
        
        if (fromDate && toDate) return joiningDate >= fromDate && joiningDate <= toDate;
        if (fromDate) return joiningDate >= fromDate;
        if (toDate) return joiningDate <= toDate;
        return true;
      });
    }

    if (advancedFilters.salaryMin || advancedFilters.salaryMax) {
      filtered = filtered.filter(emp => {
        const salary = parseFloat(emp.salary) || 0;
        const minSalary = parseFloat(advancedFilters.salaryMin) || 0;
        const maxSalary = parseFloat(advancedFilters.salaryMax) || Infinity;
        
        return salary >= minSalary && salary <= maxSalary;
      });
    }

    // Sort
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'id') {
      filtered.sort((a, b) => a.employee_id.localeCompare(b.employee_id));
    } else {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setFilteredEmployees(filtered);
  };

  useEffect(() => {
    fetchAllEmployees();
  }, []);

  useEffect(() => {
    if (allEmployees.length > 0) {
      applyFilters();
    }
  }, [allEmployees, filter, statusFilter, departmentFilter, sortBy, advancedFilters]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (allEmployees.length > 0) {
        applyFilters();
      }
    }, 300);
    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);



  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredEmployees.map(emp => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const downloadIdCard = (id) => {
    window.open(buildApiUrl(`/api/id-card/${id}`), '_blank');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilter('all');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setSortBy('date');
    setAdvancedFilters({
      bloodGroup: 'all',
      joiningDateFrom: '',
      joiningDateTo: '',
      salaryMin: '',
      salaryMax: ''
    });
  };

  const handlePrintSingle = async (employee) => {
    try {
      const response = await axios.get(`/api/print-pdf/${employee.id}`);
      generatePDF([response.data], employee.name);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast.error('Error generating PDF. Please try again.');
    }
  };

  const handlePrintSelected = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Please select employees to print');
      return;
    }
    
    try {
      const response = await axios.post('/api/print-pdf-bulk', { ids: selectedIds });
      // Generate single PDF with all employees
      generatePDF(response.data, 'Bulk_Employee_IDs');
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast.error('Error generating PDF. Please try again.');
    }
  };

  const generatePDF = (employees, filename) => {
    if (!window.jspdf) {
      console.error('jsPDF not loaded');
      return;
    }
    
    let doc = null;
    try {
      const { jsPDF } = window.jspdf;
      doc = new jsPDF();
      
      employees.forEach((employee, index) => {
        if (index > 0) doc.addPage();
        
        // Header
        doc.setFillColor(102, 126, 234);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text('SARAL WORKS', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`${employee.type.toUpperCase()} ID CARD`, 105, 30, { align: 'center' });
        
        // Employee Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text(`Name: ${employee.name}`, 20, 60);
        doc.setFontSize(12);
        doc.text(`ID: ${employee.employee_id}`, 20, 75);
        doc.text(`Department: ${employee.department}`, 20, 90);
        doc.text(`Designation: ${employee.designation}`, 20, 105);
        doc.text(`Email: ${employee.email || 'N/A'}`, 20, 120);
        doc.text(`Phone: ${employee.phone || 'N/A'}`, 20, 135);
        doc.text(`Status: ${employee.status.toUpperCase()}`, 20, 150);
        doc.text(`Created: ${new Date(employee.created_at).toLocaleDateString()}`, 20, 165);
        
        // Add photo if available
        if (employee.photo) {
          try {
            doc.addImage(`${UPLOADS_BASE_URL}/${employee.photo}`, 'JPEG', 150, 50, 40, 40);
          } catch (error) {
            console.log('Could not add photo to PDF');
          }
        }
        
        // Add QR code if available
        if (employee.qr_code) {
          try {
            doc.addImage(employee.qr_code, 'PNG', 150, 100, 40, 40);
            doc.text('Scan to Verify', 170, 150, { align: 'center' });
          } catch (error) {
            console.log('Could not add QR code to PDF');
          }
        }
      });
      
      doc.save(`${filename.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF. Please try again.');
    } finally {
      doc = null; // Clear reference
    }
  };

  const handleBulkStatusChange = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Please select at least one employee');
      return;
    }

    try {
      setLoading(true);
      console.log('Sending bulk status update:', { employeeIds: selectedIds, status: newStatus });
      
      const response = await axios.patch('/api/bulk-status-update', {
        employeeIds: selectedIds,
        status: newStatus
      });
      
      console.log('Bulk status update response:', response.data);
      toast.success(`Successfully updated status of ${selectedIds.length} employee(s) to ${newStatus}`);
      setShowStatusModal(false);
      setSelectedIds([]);
      fetchAllEmployees(); // Refresh data
    } catch (error) {
      console.error('Error updating status:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || 'Error updating employee status. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkTypeChange = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Please select at least one employee');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.patch('/api/bulk-type-update', {
        employeeIds: selectedIds,
        type: newType
      });
      
      toast.success(`Successfully updated type of ${selectedIds.length} employee(s) to ${newType}`);
      setShowTypeModal(false);
      setSelectedIds([]);
      fetchAllEmployees(); // Refresh data
    } catch (error) {
      console.error('Error updating type:', error);
      const errorMessage = error.response?.data?.error || 'Error updating employee type. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = searchTerm || filter !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all' || sortBy !== 'date';

  const getPageTitle = () => {
    if (printMode) return 'Print ID Cards';
    if (servicesMode) return 'Employee Services';
    
    const urlParams = new URLSearchParams(location.search);
    const urlFilter = urlParams.get('filter');
    const urlStatus = urlParams.get('status');
    
    if (urlFilter === 'employee') return 'Employee IDs';
    if (urlFilter === 'intern') return 'Intern IDs';
    if (urlStatus === 'active') return 'Active IDs';
    
    return 'Manage IDs';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Loading employees...</h2>
        <p>Please wait while we fetch the data.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1>{getPageTitle()}</h1>
          {printMode ? (
            <button 
              onClick={handlePrintSelected}
              className="btn btn-primary"
              disabled={selectedIds.length === 0}
            >
              🖨️ Print Selected ({selectedIds.length})
            </button>
          ) : servicesMode ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setShowTypeModal(true)}
                className="btn btn-secondary"
                disabled={selectedIds.length === 0}
              >
                🔄 Change Employee Type ({selectedIds.length})
              </button>
              <button 
                onClick={() => setShowStatusModal(true)}
                className="btn btn-primary"
                disabled={selectedIds.length === 0}
              >
                🔄 Change Status ({selectedIds.length})
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/create" className="btn btn-primary">Create New ID</Link>
              <Link to="/bulk-upload" className="btn btn-secondary">📤 Bulk Upload</Link>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
            <input
              type="text"
              placeholder="🔍 Search by name, ID, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.5rem', flex: 1, border: '2px solid #ddd', borderRadius: '5px' }}
            />
            <button 
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              style={{ 
                padding: '0.5rem 1rem', 
                background: showAdvancedFilter ? '#667eea' : '#f0f0f0',
                color: showAdvancedFilter ? 'white' : '#333',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s'
              }}
              title="Advanced Filters"
            >
              ⚙️ Filters {hasActiveFilters && '●'}
            </button>
          </div>

        </div>

        {showAdvancedFilter && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: 'white', 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Type</label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd', borderRadius: '5px' }}
              >
                <option value="all">All Types</option>
                <option value="employee">👔 Employees</option>
                <option value="intern">🎓 Interns</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Status</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd', borderRadius: '5px' }}
              >
                <option value="all">All Status</option>
                <option value="active">✅ Active</option>
                <option value="inactive">❌ Inactive</option>
                <option value="terminated">🚫 Terminated</option>
                <option value="resigned">💼 Resigned</option>
                <option value="on_leave">🏖️ On Leave</option>
                <option value="suspended">⏸️ Suspended</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Department</label>
              <select 
                value={departmentFilter} 
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd', borderRadius: '5px' }}
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Sort By</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd', borderRadius: '5px' }}
              >
                <option value="date">📅 Date (Newest)</option>
                <option value="name">🔤 Name (A-Z)</option>
                <option value="id">🆔 ID Number</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
              <button 
                onClick={clearFilters}
                style={{ 
                  flex: 1,
                  padding: '0.5rem', 
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔄 Clear
              </button>
              <button 
                onClick={() => setAdvancedFilters(prev => ({ ...prev, show: !prev.show }))}
                title="Advanced Filters"
                style={{ 
                  padding: '0.5rem 1rem',
                  background: advancedFilters.show ? '#764ba2' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: '0.3s'
                }}
              >
                ⚙️ Filters {advancedFilters.show ? '▲' : '●'}
              </button>
            </div>
          </div>
        )}
        
        {/* Advanced Filters Panel */}
        {advancedFilters.show && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: '8px',
            border: '2px solid #667eea'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem' }}>🔍 Advanced Filters</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Blood Group</label>
                <select 
                  value={advancedFilters.bloodGroup} 
                  onChange={(e) => setAdvancedFilters({...advancedFilters, bloodGroup: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd', borderRadius: '5px' }}
                >
                  <option value="all">All Blood Groups</option>
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Joining Date From</label>
                <input 
                  type="date" 
                  value={advancedFilters.joiningDateFrom}
                  onChange={(e) => setAdvancedFilters({...advancedFilters, joiningDateFrom: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd', borderRadius: '5px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Joining Date To</label>
                <input 
                  type="date" 
                  value={advancedFilters.joiningDateTo}
                  onChange={(e) => setAdvancedFilters({...advancedFilters, joiningDateTo: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd', borderRadius: '5px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Min Salary</label>
                <input 
                  type="number" 
                  placeholder="e.g. 25000"
                  value={advancedFilters.salaryMin}
                  onChange={(e) => setAdvancedFilters({...advancedFilters, salaryMin: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd', borderRadius: '5px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Max Salary</label>
                <input 
                  type="number" 
                  placeholder="e.g. 100000"
                  value={advancedFilters.salaryMax}
                  onChange={(e) => setAdvancedFilters({...advancedFilters, salaryMax: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', border: '2px solid #ddd', borderRadius: '5px' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => {
                  applyFilters();
                  setAdvancedFilters(prev => ({ ...prev, show: false }));
                }}
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✅ Apply Advanced Filters
              </button>
              <button 
                onClick={() => {
                  setAdvancedFilters({
                    bloodGroup: 'all',
                    joiningDateFrom: '',
                    joiningDateTo: '',
                    salaryMin: '',
                    salaryMax: '',
                    show: true
                  });
                }}
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔄 Reset Advanced
              </button>
            </div>
          </div>
        )}
      </div>



      {(printMode || servicesMode) && filteredEmployees.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'white', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label>
            <input
              type="checkbox"
              checked={selectedIds.length === filteredEmployees.length && filteredEmployees.length > 0}
              onChange={handleSelectAll}
              style={{ marginRight: '0.5rem' }}
            />
            Select All ({filteredEmployees.length} items)
          </label>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            {selectedIds.length > 0 && `${selectedIds.length} selected for ${printMode ? 'printing' : 'services'}`}
          </div>
        </div>
      )}

      <div className="employee-grid">
        {filteredEmployees.map(employee => (
          <div 
            key={employee.id} 
            className={`employee-card-simple ${(printMode || servicesMode) ? 'print-mode-card' : ''} ${selectedIds.includes(employee.id) ? 'selected-card' : ''}`}
            onClick={(printMode || servicesMode) ? () => handleSelectOne(employee.id, !selectedIds.includes(employee.id)) : undefined}
            style={(printMode || servicesMode) ? { cursor: 'pointer' } : {}}
          >
            {(printMode || servicesMode) && (
              <input
                type="checkbox"
                checked={selectedIds.includes(employee.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  handleSelectOne(employee.id, e.target.checked);
                }}
                className="employee-checkbox"
              />
            )}
            {employee.photo ? (
              <img 
                src={`${UPLOADS_BASE_URL}/${employee.photo}`}
                alt={employee.name}
                className="employee-photo-simple"
              />
            ) : (
              <div className="employee-photo-placeholder">📷</div>
            )}
            <div className="employee-info-simple">
              <h3>{employee.name}</h3>
              <p className="employee-type">{employee.type.charAt(0).toUpperCase() + employee.type.slice(1)}</p>
              <p>{employee.department}</p>
              <p>{employee.designation}</p>
            </div>
            <div className="card-actions">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowIdCard(employee);
                }}
                className="btn btn-primary card-btn"
              >
                📎 View ID
              </button>
              {!printMode && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEmployee(employee);
                  }}
                  className="btn btn-secondary card-btn"
                >
                  📄 View Details
                </button>
              )}
              {printMode && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrintSingle(employee);
                  }}
                  className="btn btn-primary card-btn"
                >
                  🖨️ Print
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>No IDs found</h3>
          <p>{hasActiveFilters ? 'Try adjusting your filters or search terms.' : 'No employees in database. Create your first ID to get started.'}</p>
          <div style={{ marginTop: '1rem' }}>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="btn btn-primary">Clear Filters</button>
            ) : (
              <Link to="/create" className="btn btn-primary">Create First ID</Link>
            )}
          </div>
        </div>
      )}

      {/* Employee Details Popup */}
      {selectedEmployee && (
        <div className="popup-overlay" onClick={() => setSelectedEmployee(null)}>
          <div className="employee-details-popup" onClick={(e) => e.stopPropagation()}>
            {/* Header Section */}
            <div className="business-header">
              <div className="employee-summary">
                <button 
                  className="header-close-btn" 
                  onClick={() => setSelectedEmployee(null)}
                  title="Close Details"
                >
                  ×
                </button>
                <div className="summary-left">
                  <div className="employee-photo-section">
                    {selectedEmployee.photo ? (
                      <img 
                        src={`${UPLOADS_BASE_URL}/${selectedEmployee.photo}`}
                        alt={selectedEmployee.name}
                        className="employee-photo"
                      />
                    ) : (
                      <div className="employee-photo-placeholder">
                        <span>👤</span>
                      </div>
                    )}
                  </div>
                  <div className="employee-basic-info">
                    <h2 className="employee-name">{selectedEmployee.name}</h2>
                    <div className="employee-position">{selectedEmployee.designation}</div>
                    <div className="employee-dept">{selectedEmployee.department}</div>
                  </div>
                </div>
                
                <div className="summary-right">
                  <div className="info-badges">
                    <div className="info-badge id-badge">
                      <span className="badge-label">Employee ID</span>
                      <span className="badge-value">{selectedEmployee.employee_id}</span>
                    </div>
                    <div className="info-badge type-badge">
                      <span className="badge-label">Type</span>
                      <span className="badge-value">{selectedEmployee.type.charAt(0).toUpperCase() + selectedEmployee.type.slice(1)}</span>
                    </div>
                    <div className={`info-badge status-badge status-${selectedEmployee.status}`}>
                      <span className="badge-label">Status</span>
                      <span className="badge-value">{selectedEmployee.status.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content Section */}
            <div className="employee-details-content">
              <div className="details-grid">
                {/* Professional Information */}
                <div className="detail-card">
                  <div className="card-header">
                    <div className="card-icon">💼</div>
                    <h3>Professional Information</h3>
                  </div>
                  <div className="card-content">
                    {selectedEmployee.employment_type && (
                      <div className="info-row">
                        <span className="info-label">Employment Type</span>
                        <span className="info-value">{selectedEmployee.employment_type}</span>
                      </div>
                    )}
                    {selectedEmployee.work_location && (
                      <div className="info-row">
                        <span className="info-label">Work Location</span>
                        <span className="info-value">{selectedEmployee.work_location}</span>
                      </div>
                    )}
                    {selectedEmployee.joining_date && (
                      <div className="info-row">
                        <span className="info-label">Joining Date</span>
                        <span className="info-value">{new Date(selectedEmployee.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    )}
                    {selectedEmployee.manager && (
                      <div className="info-row">
                        <span className="info-label">Reporting Manager</span>
                        <span className="info-value">{selectedEmployee.manager}</span>
                      </div>
                    )}
                    {selectedEmployee.salary && (
                      <div className="info-row">
                        <span className="info-label">Salary</span>
                        <span className="info-value salary">₹{parseInt(selectedEmployee.salary).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Contact Information */}
                <div className="detail-card">
                  <div className="card-header">
                    <div className="card-icon">📞</div>
                    <h3>Contact Information</h3>
                  </div>
                  <div className="card-content">
                    {selectedEmployee.email && (
                      <div className="info-row">
                        <span className="info-label">Email Address</span>
                        <span className="info-value email">
                          <a href={`mailto:${selectedEmployee.email}`}>{selectedEmployee.email}</a>
                        </span>
                      </div>
                    )}
                    {selectedEmployee.phone && (
                      <div className="info-row">
                        <span className="info-label">Phone Number</span>
                        <span className="info-value phone">
                          <a href={`tel:${selectedEmployee.phone}`}>{selectedEmployee.phone}</a>
                        </span>
                      </div>
                    )}
                    {selectedEmployee.address && (
                      <div className="info-row">
                        <span className="info-label">Address</span>
                        <span className="info-value address">{selectedEmployee.address}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Personal Details */}
                <div className="detail-card">
                  <div className="card-header">
                    <div className="card-icon">👤</div>
                    <h3>Personal Details</h3>
                  </div>
                  <div className="card-content">
                    {selectedEmployee.date_of_birth && (
                      <div className="info-row">
                        <span className="info-label">Date of Birth</span>
                        <span className="info-value">{new Date(selectedEmployee.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    )}
                    {selectedEmployee.blood_group && (
                      <div className="info-row">
                        <span className="info-label">Blood Group</span>
                        <span className="info-value blood-group">
                          <span className="blood-icon">🩸</span>
                          {selectedEmployee.blood_group}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Emergency Contact */}
                <div className="detail-card">
                  <div className="card-header">
                    <div className="card-icon">🚨</div>
                    <h3>Emergency Contact</h3>
                  </div>
                  <div className="card-content">
                    {selectedEmployee.emergency_contact && (
                      <div className="info-row">
                        <span className="info-label">Contact Name</span>
                        <span className="info-value">{selectedEmployee.emergency_contact}</span>
                      </div>
                    )}
                    {selectedEmployee.emergency_phone && (
                      <div className="info-row">
                        <span className="info-label">Contact Phone</span>
                        <span className="info-value phone">
                          <a href={`tel:${selectedEmployee.emergency_phone}`}>{selectedEmployee.emergency_phone}</a>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Legal & Financial */}
                <div className="detail-card">
                  <div className="card-header">
                    <div className="card-icon">🏛️</div>
                    <h3>Legal & Financial</h3>
                  </div>
                  <div className="card-content">
                    {selectedEmployee.aadhar_number && (
                      <div className="info-row">
                        <span className="info-label">Aadhar Number</span>
                        <span className="info-value">{selectedEmployee.aadhar_number}</span>
                      </div>
                    )}
                    {selectedEmployee.pan_number && (
                      <div className="info-row">
                        <span className="info-label">PAN Number</span>
                        <span className="info-value pan">{selectedEmployee.pan_number}</span>
                      </div>
                    )}
                    {selectedEmployee.bank_account && (
                      <div className="info-row">
                        <span className="info-label">Bank Account</span>
                        <span className="info-value">{selectedEmployee.bank_account}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* System Information */}
                <div className="detail-card">
                  <div className="card-header">
                    <div className="card-icon">⚙️</div>
                    <h3>System Information</h3>
                  </div>
                  <div className="card-content">
                    <div className="info-row">
                      <span className="info-label">Created Date</span>
                      <span className="info-value">{new Date(selectedEmployee.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Last Updated</span>
                      <span className="info-value">{new Date(selectedEmployee.updated_at || selectedEmployee.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    {selectedEmployee.uuid && (
                      <div className="info-row">
                        <span className="info-label">Verification UUID</span>
                        <span className="info-value uuid">{selectedEmployee.uuid.slice(0, 8)}...{selectedEmployee.uuid.slice(-8)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="employee-details-actions">
              <div className="action-buttons">
                <Link 
                  to={`/edit/${selectedEmployee.id}`}
                  className="action-btn primary"
                  onClick={() => setSelectedEmployee(null)}
                >
                  <span className="btn-icon">✏️</span>
                  <span>Edit Employee</span>
                </Link>
                <button 
                  onClick={() => openVerifyPortal(selectedEmployee.uuid)}
                  className="action-btn secondary"
                >
                  <span className="btn-icon">✅</span>
                  <span>Verify ID</span>
                </button>
                <button 
                  onClick={() => {
                    setShowIdCard(selectedEmployee);
                    setSelectedEmployee(null);
                  }}
                  className="action-btn tertiary"
                >
                  <span className="btn-icon">🆔</span>
                  <span>View ID Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Type Change Modal */}
      {showTypeModal && (
        <div className="popup-overlay" onClick={() => setShowTypeModal(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              color: 'white',
              padding: '2rem',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: '700' }}>Employee Type Change</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>Convert between Employee and Intern</p>
              <button 
                onClick={() => setShowTypeModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.5rem',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '2.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                padding: '1.5rem',
                borderRadius: '15px',
                marginBottom: '2rem',
                border: '2px solid #3498db',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50', fontSize: '1.3rem' }}>Selected Employees</h3>
                <p style={{ margin: 0, color: '#7f8c8d', fontSize: '1.1rem' }}>
                  <strong style={{ color: '#3498db', fontSize: '1.5rem' }}>{selectedIds.length}</strong> employee(s) will be updated
                </p>
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '1rem', 
                  fontWeight: '700', 
                  fontSize: '1.1rem',
                  color: '#2c3e50'
                }}>Select New Type</label>
                <select 
                  value={newType} 
                  onChange={(e) => setNewType(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '1rem', 
                    border: '3px solid #3498db', 
                    borderRadius: '12px', 
                    fontSize: '1.1rem',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <option value="employee">👤 Employee - Full-time staff member</option>
                  <option value="intern">🎓 Intern - Temporary trainee</option>
                </select>
              </div>
              
              <div style={{
                background: '#fff3cd',
                border: '2px solid #ffeaa7',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <strong style={{ color: '#856404' }}>Important Notice</strong>
                </div>
                <p style={{ margin: 0, color: '#856404', fontSize: '0.95rem' }}>
                  Changing employee type will regenerate their ID numbers and QR codes. This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div style={{
              padding: '1.5rem 2.5rem',
              background: '#f8f9fa',
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <button 
                onClick={handleBulkTypeChange}
                disabled={loading}
                style={{
                  background: loading ? '#95a5a6' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                  minWidth: '150px'
                }}
              >
                {loading ? '⏳ Updating...' : '✅ Apply Changes'}
              </button>
              <button 
                onClick={() => setShowTypeModal(false)}
                disabled={loading}
                style={{
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)',
                  minWidth: '150px',
                  opacity: loading ? 0.6 : 1
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="popup-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
              color: 'white',
              padding: '2rem',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: '700' }}>Bulk Status Change</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>Update employee status efficiently</p>
              <button 
                onClick={() => setShowStatusModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.5rem',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '2.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                padding: '1.5rem',
                borderRadius: '15px',
                marginBottom: '2rem',
                border: '2px solid #f39c12',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50', fontSize: '1.3rem' }}>Selected Employees</h3>
                <p style={{ margin: 0, color: '#7f8c8d', fontSize: '1.1rem' }}>
                  <strong style={{ color: '#f39c12', fontSize: '1.5rem' }}>{selectedIds.length}</strong> employee(s) will be updated
                </p>
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '1rem', 
                  fontWeight: '700', 
                  fontSize: '1.1rem',
                  color: '#2c3e50'
                }}>Select New Status</label>
                <select 
                  value={newStatus} 
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '1rem', 
                    border: '3px solid #f39c12', 
                    borderRadius: '12px', 
                    fontSize: '1.1rem',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <option value="active">✅ Active - Employee is currently working</option>
                  <option value="inactive">❌ Inactive - Temporarily not working</option>
                  <option value="terminated">🚫 Terminated - Employment ended</option>
                  <option value="resigned">💼 Resigned - Employee left voluntarily</option>
                  <option value="on_leave">🏖️ On Leave - Temporary absence</option>
                  <option value="suspended">⏸️ Suspended - Temporarily suspended</option>
                </select>
              </div>
              
              <div style={{
                background: '#fff3cd',
                border: '2px solid #ffeaa7',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <strong style={{ color: '#856404' }}>Important Notice</strong>
                </div>
                <p style={{ margin: 0, color: '#856404', fontSize: '0.95rem' }}>
                  This action will immediately update the status of all selected employees. This change will be reflected in ID cards and verification systems.
                </p>
              </div>
            </div>
            
            <div style={{
              padding: '1.5rem 2.5rem',
              background: '#f8f9fa',
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <button 
                onClick={handleBulkStatusChange}
                disabled={loading}
                style={{
                  background: loading ? '#95a5a6' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                  minWidth: '150px'
                }}
              >
                {loading ? '⏳ Updating...' : '✅ Apply Changes'}
              </button>
              <button 
                onClick={() => setShowStatusModal(false)}
                disabled={loading}
                style={{
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)',
                  minWidth: '150px',
                  opacity: loading ? 0.6 : 1
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Card Viewer */}
      {showIdCard && (
        <IDCardViewer 
          employee={showIdCard} 
          onClose={() => setShowIdCard(null)} 
        />
      )}
    </div>
  );
};

export default EmployeeList;