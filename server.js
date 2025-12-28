const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('./logger');
const monitoring = require('./monitoring');

// Simple logging function
function log(level, message, data = null) {
  const logData = { message, ...data };
  logger[level](logData);
}

const { validateEmployeeData, sanitizeEmployeeData } = require('./validationUtils');
const { 
  generateCertificateId, 
  canonicalizeCertificateData, 
  generateFingerprint, 
  signFingerprint, 
  verifySignature 
} = require('./certificateUtils');
const xlsx = require('xlsx');

const app = express();
const PORT = 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Rate limiting with logging
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      requestId: req.requestId
    });
    monitoring.trackSecurityEvent('rateLimit');
    res.status(429).json({ error: 'Too many requests, please try again later' });
  }
});
app.use('/api/', limiter);

// Verification endpoint rate limit
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many verification requests',
  handler: (req, res) => {
    logger.warn('Verification rate limit exceeded', {
      ip: req.ip,
      identifier: req.params.uuid || req.params.identifier,
      requestId: req.requestId
    });
    monitoring.trackSecurityEvent('rateLimit');
    res.status(429).json({ error: 'Too many verification requests' });
  }
});
app.use('/api/verify', verifyLimiter);
app.use('/api/certificates/verify', verifyLimiter);
app.use('/api/offer-letters/verify', verifyLimiter);

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// HTTP request logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Monitoring middleware
app.use(monitoring.trackRequest);

// Request tracking middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
});

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Database setup
const db = new sqlite3.Database('idsyncro.db');

db.serialize(() => {
  // Certificates table
  db.run(`CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    certificate_uuid TEXT UNIQUE NOT NULL,
    certificate_code TEXT UNIQUE NOT NULL,
    person_uuid TEXT NOT NULL,
    name TEXT NOT NULL,
    certificate_type TEXT NOT NULL,
    certificate_data TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    signature TEXT,
    status TEXT DEFAULT 'active',
    batch_id TEXT,
    schema_version INTEGER DEFAULT 1,
    issue_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    revoked_at DATETIME,
    revocation_reason TEXT
  )`);
  
  // Certificate batches table
  db.run(`CREATE TABLE IF NOT EXISTS certificate_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT UNIQUE NOT NULL,
    certificate_type TEXT NOT NULL,
    schema TEXT NOT NULL,
    excel_hash TEXT,
    certificate_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
  )`);
  
  // Create indexes for certificates
  db.run('CREATE INDEX IF NOT EXISTS idx_cert_code ON certificates(certificate_code)');
  db.run('CREATE INDEX IF NOT EXISTS idx_cert_person_uuid ON certificates(person_uuid)');
  db.run('CREATE INDEX IF NOT EXISTS idx_cert_status ON certificates(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_cert_batch ON certificates(batch_id)');
  
  // Offer letters staging table
  db.run(`CREATE TABLE IF NOT EXISTS offer_letters_staging (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staging_id TEXT UNIQUE NOT NULL,
    excel_data TEXT NOT NULL,
    excel_filename TEXT,
    excel_hash TEXT,
    row_number INTEGER,
    import_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'draft'
  )`);
  
  // Offer letters table
  db.run(`CREATE TABLE IF NOT EXISTS offer_letters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_letter_number TEXT UNIQUE NOT NULL,
    offer_data TEXT NOT NULL,
    batch_id TEXT,
    excel_filename TEXT,
    excel_hash TEXT,
    row_number INTEGER,
    import_timestamp DATETIME,
    generated_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    generated_by TEXT,
    status TEXT DEFAULT 'active'
  )`);
  
  // Offer letter batches table
  db.run(`CREATE TABLE IF NOT EXISTS offer_letter_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT UNIQUE NOT NULL,
    excel_filename TEXT,
    excel_hash TEXT,
    offer_count INTEGER DEFAULT 0,
    import_timestamp DATETIME,
    generated_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    generated_by TEXT
  )`);
  
  // Create indexes for offer letters
  db.run('CREATE INDEX IF NOT EXISTS idx_offer_number ON offer_letters(offer_letter_number)');
  db.run('CREATE INDEX IF NOT EXISTS idx_offer_batch ON offer_letters(batch_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_offer_status ON offer_letters(status)');
  
  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE,
    employee_id TEXT UNIQUE,
    name TEXT NOT NULL,
    designation TEXT NOT NULL,
    department TEXT NOT NULL,
    type TEXT NOT NULL,
    employment_type TEXT DEFAULT 'full_time',
    work_location TEXT,
    photo TEXT,
    qr_code TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    date_of_birth TEXT,
    joining_date TEXT,
    salary TEXT,
    bank_account TEXT,
    aadhar_number TEXT,
    pan_number TEXT,
    blood_group TEXT,
    manager TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active'
  )`);
  
  // Create counter table for ID generation
  db.run(`CREATE TABLE IF NOT EXISTS id_counters (
    type TEXT PRIMARY KEY,
    year TEXT,
    counter INTEGER DEFAULT 0
  )`);
  
  // Add new columns to existing table if they don't exist
  const newColumns = [
    'email TEXT',
    'phone TEXT', 
    'address TEXT',
    'emergency_contact TEXT',
    'emergency_phone TEXT',
    'date_of_birth TEXT',
    'joining_date TEXT',
    'salary TEXT',
    'bank_account TEXT',
    'aadhar_number TEXT',
    'pan_number TEXT',
    'blood_group TEXT',
    'manager TEXT',
    'employment_type TEXT DEFAULT "full_time"',
    'work_location TEXT'
  ];
  
  newColumns.forEach(column => {
    db.run(`ALTER TABLE employees ADD COLUMN ${column}`, (err) => {
      // Ignore error if column already exists
    });
  });
  
  // Create indexes for better performance
  db.run('CREATE INDEX IF NOT EXISTS idx_employee_id ON employees(employee_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_type ON employees(type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_status ON employees(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_department ON employees(department)');
  db.run('CREATE INDEX IF NOT EXISTS idx_name ON employees(name)');
  db.run('CREATE INDEX IF NOT EXISTS idx_created_at ON employees(created_at)');
  
  // Initialize counters atomically to prevent race conditions
  const year = new Date().getFullYear().toString().slice(-2);
  
  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION');
    
    // Get max employee ID
    db.get(`SELECT MAX(CAST(SUBSTR(employee_id, -4) AS INTEGER)) as max_num FROM employees WHERE type = 'employee' AND employee_id LIKE 'SWT-${year}-EMP-%'`, (err, empRow) => {
      if (err) {
        db.run('ROLLBACK');
        return;
      }
      
      // Get max intern ID
      db.get(`SELECT MAX(CAST(SUBSTR(employee_id, -4) AS INTEGER)) as max_num FROM employees WHERE type = 'intern' AND employee_id LIKE 'SWT-${year}-INT-%'`, (err2, intRow) => {
        if (err2) {
          db.run('ROLLBACK');
          return;
        }
        
        const empMax = empRow?.max_num || 0;
        const intMax = intRow?.max_num || 0;
        
        // Insert counters atomically
        db.run('INSERT OR IGNORE INTO id_counters (type, year, counter) VALUES (?, ?, ?)', ['employee', year, empMax]);
        db.run('INSERT OR IGNORE INTO id_counters (type, year, counter) VALUES (?, ?, ?)', ['intern', year, intMax]);
        db.run('COMMIT');
      });
    });
  });
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const uploadImage = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const uploadExcel = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Generate ID number using counter table
function generateIdNumber(type) {
  const year = new Date().getFullYear().toString().slice(-2);
  const typeCode = type === 'employee' ? 'EMP' : 'INT';
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN IMMEDIATE TRANSACTION', (err) => {
        if (err) {
          reject(new Error('Failed to start transaction: ' + err.message));
          return;
        }
        
        // Find the highest existing ID for this type and year
        db.get(
          `SELECT MAX(CAST(SUBSTR(employee_id, -4) AS INTEGER)) as max_num 
           FROM employees 
           WHERE type = ? AND employee_id LIKE ?`,
          [type, `SWT-${year}-${typeCode}-%`],
          (err, row) => {
            if (err) {
              db.run('ROLLBACK');
              reject(new Error('Failed to query existing IDs: ' + err.message));
              return;
            }
            
            const nextNumber = (row && row.max_num ? row.max_num : 0) + 1;
            if (nextNumber > 9999) {
              db.run('ROLLBACK');
              reject(new Error('Maximum ID limit (9999) reached for this year'));
              return;
            }
            
            const newId = `SWT-${year}-${typeCode}-${nextNumber.toString().padStart(4, '0')}`;
            
            // Update counter and commit
            db.run(
              'INSERT OR REPLACE INTO id_counters (type, year, counter) VALUES (?, ?, ?)',
              [type, year, nextNumber],
              (err2) => {
                if (err2) {
                  db.run('ROLLBACK');
                  reject(new Error('Failed to update counter: ' + err2.message));
                  return;
                }
                
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    reject(new Error('Failed to commit transaction: ' + commitErr.message));
                  } else {
                    resolve(newId);
                  }
                });
              }
            );
          }
        );
      });
    });
  });
}

// Generate QR Code
async function generateQRCode(employeeId, uuid) {
  const verifyUrl = `http://localhost:3000/verify/${uuid}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  return qrCodeDataUrl;
}

// Routes
app.post('/api/employees', (req, res) => {
  uploadImage.single('photo')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    
    try {
    const { 
      name, designation, department, type, employment_type, work_location, email, phone, address,
      emergency_contact, emergency_phone, date_of_birth, joining_date,
      salary, bank_account, aadhar_number, pan_number, blood_group, manager
    } = req.body;

    // Sanitize input data
    const sanitizedData = sanitizeEmployeeData({
      name, designation, department, type, employment_type, work_location, email, phone, address,
      emergency_contact, emergency_phone, date_of_birth, joining_date,
      salary, bank_account, aadhar_number, pan_number, blood_group, manager
    });

    // Validate employee data
    const validation = validateEmployeeData(sanitizedData);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        errors: validation.errors 
      });
    }

    const uuid = uuidv4();
    const employeeId = await generateIdNumber(type);
    
    const photo = req.file ? req.file.filename : null;
    const qrCode = await generateQRCode(employeeId, uuid);

    db.run(
      `INSERT INTO employees (
        uuid, employee_id, name, designation, department, type, employment_type, work_location, photo, qr_code,
        email, phone, address, emergency_contact, emergency_phone, date_of_birth,
        joining_date, salary, bank_account, aadhar_number, pan_number, blood_group, manager, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        uuid, employeeId, sanitizedData.name, sanitizedData.designation, sanitizedData.department, 
        sanitizedData.type, sanitizedData.employment_type, sanitizedData.work_location, photo, qrCode,
        sanitizedData.email, sanitizedData.phone, sanitizedData.address, sanitizedData.emergency_contact, 
        sanitizedData.emergency_phone, sanitizedData.date_of_birth,
        sanitizedData.joining_date, sanitizedData.salary, sanitizedData.bank_account, sanitizedData.aadhar_number, 
        sanitizedData.pan_number, sanitizedData.blood_group, sanitizedData.manager
      ],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ 
              error: 'Employee ID conflict. Please try again.',
              details: 'A unique constraint violation occurred. The system will generate a new ID on retry.'
            });
          }
          return res.status(500).json({ error: err.message });
        }
        log('info', 'Employee created successfully', { 
          id: this.lastID, 
          employeeId, 
          name: sanitizedData.name,
          requestId: req.requestId 
        });
        res.json({
          id: this.lastID,
          uuid,
          employeeId,
          message: 'Employee created successfully'
        });
      }
    );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

app.get('/api/employees', (req, res) => {
  db.all('SELECT * FROM employees ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/api/employees/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid employee ID' });
  }
  
  db.get('SELECT * FROM employees WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(row);
  });
});

app.delete('/api/employees/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid employee ID' });
  }
  
  db.run('DELETE FROM employees WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  });
});

app.put('/api/employees/:id', uploadImage.single('photo'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }
    
    const { 
      name, designation, department, type, employment_type, work_location, status, email, phone, address,
      emergency_contact, emergency_phone, date_of_birth, joining_date,
      salary, bank_account, aadhar_number, pan_number, blood_group, manager, existingPhoto
    } = req.body;

    // Get current employee data first
    db.get('SELECT * FROM employees WHERE id = ?', [id], async (err, employee) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      try {
        // Sanitize input data
        const sanitizedData = sanitizeEmployeeData({
          name, designation, department, type, employment_type, work_location, status, email, phone, address,
          emergency_contact, emergency_phone, date_of_birth, joining_date,
          salary, bank_account, aadhar_number, pan_number, blood_group, manager
        });

        // Validate employee data (skip validation for optional fields that are empty)
        const validation = validateEmployeeData(sanitizedData);
        if (!validation.valid) {
          return res.status(400).json({ 
            error: 'Validation failed', 
            errors: validation.errors 
          });
        }

        // Handle photo: new file > existing photo > current photo
        let photo = employee.photo; // Default to current photo
        if (req.file) {
          photo = req.file.filename; // New photo uploaded
        } else if (existingPhoto) {
          photo = existingPhoto; // Keep existing photo
        }

        // Generate new ID if type changed
        let employeeId = employee.employee_id;
        if (sanitizedData.type !== employee.type) {
          employeeId = await generateIdNumber(sanitizedData.type);
        }

        // Generate new QR code
        const qrCode = await generateQRCode(employeeId, employee.uuid);

        db.run(
          `UPDATE employees SET 
            name = ?, designation = ?, department = ?, type = ?, employment_type = ?, work_location = ?, status = ?, photo = ?, employee_id = ?, qr_code = ?,
            email = ?, phone = ?, address = ?, emergency_contact = ?, emergency_phone = ?, 
            date_of_birth = ?, joining_date = ?, salary = ?, bank_account = ?, 
            aadhar_number = ?, pan_number = ?, blood_group = ?, manager = ?
           WHERE id = ?`,
          [
            sanitizedData.name, sanitizedData.designation, sanitizedData.department, sanitizedData.type, 
            sanitizedData.employment_type, sanitizedData.work_location, sanitizedData.status, photo, employeeId, qrCode,
            sanitizedData.email, sanitizedData.phone, sanitizedData.address, sanitizedData.emergency_contact, 
            sanitizedData.emergency_phone, sanitizedData.date_of_birth, sanitizedData.joining_date, 
            sanitizedData.salary, sanitizedData.bank_account, sanitizedData.aadhar_number, 
            sanitizedData.pan_number, sanitizedData.blood_group, sanitizedData.manager, req.params.id
          ],
          function(err) {
            if (err) {
              console.error('Database update error:', err);
              return res.status(500).json({ error: 'Database update failed: ' + err.message });
            }
            res.json({ message: 'Employee updated successfully', employeeId });
          }
        );
      } catch (error) {
        console.error('Update error:', error);
        return res.status(500).json({ error: 'Failed to update employee: ' + error.message });
      }
    });
  } catch (error) {
    console.error('Outer error:', error);
    res.status(500).json({ error: error.message });
  }
});



app.get('/api/verify/:uuid', (req, res) => {
  const { uuid } = req.params;
  
  if (!uuid || uuid.trim().length === 0) {
    return res.status(400).json({ error: 'UUID or Employee ID is required' });
  }
  
  const sanitizedUuid = uuid.trim().substring(0, 100); // Limit length
  
  db.get('SELECT * FROM employees WHERE uuid = ? OR employee_id = ?', [sanitizedUuid, sanitizedUuid], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'ID not found' });
    }
    
    // Return only public information for verification
    const publicData = {
      name: row.name,
      employee_id: row.employee_id,
      designation: row.designation,
      department: row.department,
      type: row.type,
      photo: row.photo,
      created_at: row.created_at,
      status: row.status
    };
    
    res.json(publicData);
  });
});

// Admin-only endpoint for full employee details
app.get('/api/admin/employees/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid employee ID' });
  }
  
  db.get('SELECT * FROM employees WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(row);
  });
});

// Generate ID Card HTML for download
// Generate PDF for single employee
app.get('/api/print-pdf/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid employee ID' });
  }
  
  db.get('SELECT * FROM employees WHERE id = ?', [id], (err, employee) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${employee.name.replace(/[^a-zA-Z0-9]/g, '_')}_ID.json"`);
    res.json(employee);
  });
});

// Generate PDF for multiple employees
app.post('/api/print-pdf-bulk', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid IDs array' });
  }

  // Validate all IDs are integers
  const validIds = ids.filter(id => Number.isInteger(Number(id)) && Number(id) > 0);
  if (validIds.length === 0) {
    return res.status(400).json({ error: 'No valid employee IDs provided' });
  }

  const placeholders = validIds.map(() => '?').join(',');
  db.all(`SELECT * FROM employees WHERE id IN (${placeholders})`, validIds, (err, employees) => {
    if (err) return res.status(500).json({ error: err.message });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="Bulk_Employee_IDs.json"`);
    res.json(employees);
  });
});



// Search employees with advanced filters
app.get('/api/employees/search', (req, res) => {
  try {
    const { q, type, status, department, sortBy } = req.query;
    
    // Validate and sanitize search query
    if (q && (typeof q !== 'string' || q.length > 100)) {
      return res.status(400).json({ error: 'Invalid search query' });
    }
    
    // Validate parameters
    const validTypes = ['all', 'employee', 'intern'];
    const validStatuses = ['all', 'active', 'inactive', 'terminated', 'resigned', 'on_leave', 'suspended'];
    const validSortBy = ['name', 'date', 'id'];
    
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid type parameter' });
    }
    
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status parameter' });
    }
    
    if (sortBy && !validSortBy.includes(sortBy)) {
      return res.status(400).json({ error: 'Invalid sortBy parameter' });
    }
    
    if (department && (typeof department !== 'string' || department.length > 50)) {
      return res.status(400).json({ error: 'Invalid department parameter' });
    }
    
    let query = 'SELECT * FROM employees WHERE 1=1';
    let params = [];

    if (q && q.trim() !== '') {
      const sanitizedQuery = q.trim().replace(/[%_\\]/g, '\\$&');
      query += ' AND (name LIKE ? OR employee_id LIKE ? OR department LIKE ? OR designation LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${sanitizedQuery}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (type && type !== 'all') {
      query += ' AND type = ?';
      params.push(type);
    }

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (department && department !== 'all') {
      query += ' AND department = ?';
      params.push(department.trim());
    }

    // Sorting
    if (sortBy === 'name') {
      query += ' ORDER BY name ASC';
    } else if (sortBy === 'date') {
      query += ' ORDER BY created_at DESC';
    } else if (sortBy === 'id') {
      query += ' ORDER BY employee_id ASC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Search failed. Please try again.' });
      }
      res.json(rows || []);
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Summary report endpoint for Excel export
app.get('/api/summary-report', (req, res) => {
  const { period } = req.query; // 'month' or 'all'
  const isMonthly = period === 'month';
  const dateFilter = isMonthly ? ` AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')` : '';
  
  const queries = {
    totalEmployees: `SELECT COUNT(*) as count FROM employees WHERE 1=1${dateFilter}`,
    employees: `SELECT COUNT(*) as count FROM employees WHERE type = 'employee'${dateFilter}`,
    interns: `SELECT COUNT(*) as count FROM employees WHERE type = 'intern'${dateFilter}`,
    activeIDs: `SELECT COUNT(*) as count FROM employees WHERE status = 'active'${dateFilter}`,
    activeEmployees: `SELECT COUNT(*) as count FROM employees WHERE type = 'employee' AND status = 'active'${dateFilter}`,
    activeInterns: `SELECT COUNT(*) as count FROM employees WHERE type = 'intern' AND status = 'active'${dateFilter}`,
    inactiveEmployees: `SELECT COUNT(*) as count FROM employees WHERE type = 'employee' AND status = 'inactive'${dateFilter}`,
    inactiveInterns: `SELECT COUNT(*) as count FROM employees WHERE type = 'intern' AND status = 'inactive'${dateFilter}`,
    suspendedIDs: `SELECT COUNT(*) as count FROM employees WHERE status = 'suspended'${dateFilter}`,
    onLeaveIDs: `SELECT COUNT(*) as count FROM employees WHERE status = 'on_leave'${dateFilter}`,
    terminatedIDs: `SELECT COUNT(*) as count FROM employees WHERE status = 'terminated'${dateFilter}`,
    resignedIDs: `SELECT COUNT(*) as count FROM employees WHERE status = 'resigned'${dateFilter}`,
    createdThisMonth: `SELECT COUNT(*) as count FROM employees WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.get(query, (err, row) => {
      if (err) {
        results[key] = 0;
      } else {
        results[key] = row.count;
      }
      completed++;
      if (completed === total) {
        // Format for Excel export
        const summaryData = [
          { Metric: 'Total Employees', Count: results.totalEmployees },
          { Metric: 'Employees', Count: results.employees },
          { Metric: 'Interns', Count: results.interns },
          { Metric: 'Active IDs', Count: results.activeIDs },
          { Metric: 'Active Employees', Count: results.activeEmployees },
          { Metric: 'Active Interns', Count: results.activeInterns },
          { Metric: 'Inactive Employees', Count: results.inactiveEmployees },
          { Metric: 'Inactive Interns', Count: results.inactiveInterns },
          { Metric: 'Suspended IDs', Count: results.suspendedIDs },
          { Metric: 'IDs On Leave', Count: results.onLeaveIDs },
          { Metric: 'Terminated IDs', Count: results.terminatedIDs },
          { Metric: 'Resigned IDs', Count: results.resignedIDs },
          { Metric: 'Created This Month', Count: results.createdThisMonth }
        ];
        
        res.json({
          period: isMonthly ? 'Current Month' : 'All Time',
          data: summaryData,
          raw: results
        });
      }
    });
  });
});

// Get unique departments
app.get('/api/departments', (req, res) => {
  db.all('SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(row => row.department));
  });
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
  const { month } = req.query;
  const isMonthly = month === 'current';
  const dateFilter = isMonthly ? ` AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')` : '';
  
  const queries = {
    total: `SELECT COUNT(*) as count FROM employees WHERE 1=1${dateFilter}`,
    employees: `SELECT COUNT(*) as count FROM employees WHERE type = 'employee'${dateFilter}`,
    interns: `SELECT COUNT(*) as count FROM employees WHERE type = 'intern'${dateFilter}`,
    active: `SELECT COUNT(*) as count FROM employees WHERE status = 'active'${dateFilter}`,
    activeEmployees: `SELECT COUNT(*) as count FROM employees WHERE type = 'employee' AND status = 'active'${dateFilter}`,
    activeInterns: `SELECT COUNT(*) as count FROM employees WHERE type = 'intern' AND status = 'active'${dateFilter}`,
    inactiveEmployees: `SELECT COUNT(*) as count FROM employees WHERE type = 'employee' AND status = 'inactive'${dateFilter}`,
    inactiveInterns: `SELECT COUNT(*) as count FROM employees WHERE type = 'intern' AND status = 'inactive'${dateFilter}`,
    suspended: `SELECT COUNT(*) as count FROM employees WHERE status = 'suspended'${dateFilter}`,
    onLeave: `SELECT COUNT(*) as count FROM employees WHERE status = 'on_leave'${dateFilter}`,
    thisMonth: `SELECT COUNT(*) as count FROM employees WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.get(query, (err, row) => {
      if (err) {
        results[key] = 0;
      } else {
        results[key] = row.count;
      }
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

// Export data endpoint
app.get('/api/export/:type', (req, res) => {
  const { type } = req.params;
  const validTypes = ['all', 'employee', 'intern'];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid export type. Must be: all, employee, or intern' });
  }
  
  let query = 'SELECT * FROM employees';
  let params = [];

  if (type !== 'all') {
    query += ' WHERE type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Bulk status update endpoint
app.put('/api/employees/bulk-status', (req, res) => {
  const { employeeIds, status } = req.body;
  
  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({ error: 'Employee IDs are required' });
  }
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  // Validate all IDs are integers
  const validIds = employeeIds.filter(id => Number.isInteger(Number(id)) && Number(id) > 0);
  if (validIds.length === 0) {
    return res.status(400).json({ error: 'No valid employee IDs provided' });
  }
  
  // Validate status value
  const validStatuses = ['active', 'inactive', 'terminated', 'resigned', 'on_leave', 'suspended'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  
  const placeholders = validIds.map(() => '?').join(',');
  const query = `UPDATE employees SET status = ? WHERE id IN (${placeholders})`;
  const params = [status, ...validIds];
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ 
      message: `Successfully updated ${this.changes} employee(s)`,
      updatedCount: this.changes
    });
  });
});

// Simple bulk status update endpoint (no validation)
app.patch('/api/bulk-status-update', (req, res) => {
  const { employeeIds, status } = req.body;
  
  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({ error: 'Employee IDs are required' });
  }
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  // Validate all IDs are integers
  const validIds = employeeIds.filter(id => Number.isInteger(Number(id)) && Number(id) > 0);
  if (validIds.length === 0) {
    return res.status(400).json({ error: 'No valid employee IDs provided' });
  }
  
  const placeholders = validIds.map(() => '?').join(',');
  const query = `UPDATE employees SET status = ? WHERE id IN (${placeholders})`;
  const params = [status, ...validIds];
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ 
      message: `Successfully updated ${this.changes} employee(s)`,
      updatedCount: this.changes
    });
  });
});

// Bulk type update endpoint with ID regeneration
app.patch('/api/bulk-type-update', async (req, res) => {
  const { employeeIds, type } = req.body;
  
  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({ error: 'Employee IDs are required' });
  }
  
  if (!type || !['employee', 'intern'].includes(type)) {
    return res.status(400).json({ error: 'Valid type is required (employee or intern)' });
  }
  
  // Validate all IDs are integers
  const validIds = employeeIds.filter(id => Number.isInteger(Number(id)) && Number(id) > 0);
  if (validIds.length === 0) {
    return res.status(400).json({ error: 'No valid employee IDs provided' });
  }
  
  try {
    let updatedCount = 0;
    
    for (const employeeId of validIds) {
      // Get current employee data
      const employee = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM employees WHERE id = ?', [employeeId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (employee && employee.type !== type) {
        // Generate new employee ID and QR code
        const newEmployeeId = await generateIdNumber(type);
        const newQrCode = await generateQRCode(newEmployeeId, employee.uuid);
        
        // Update employee with new type, ID, and QR code
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE employees SET type = ?, employee_id = ?, qr_code = ? WHERE id = ?',
            [type, newEmployeeId, newQrCode, employeeId],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        updatedCount++;
      }
    }
    
    res.json({ 
      message: `Successfully updated ${updatedCount} employee(s)`,
      updatedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CERTIFICATE ROUTES ============

// Upload and parse Excel for bulk certificate generation
app.post('/api/certificates/upload-excel', uploadExcel.single('excel'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    // Delete uploaded file
    fs.unlinkSync(req.file.path);
    
    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }
    
    // Extract column headers
    const headers = Object.keys(data[0]);
    
    // Compute Excel hash for audit
    const excelHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    
    res.json({ 
      headers, 
      rowCount: data.length,
      preview: data.slice(0, 5),
      excelHash,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create single certificate
app.post('/api/certificates/create-single', async (req, res) => {
  try {
    const { certificateData } = req.body;
    
    if (!certificateData || !certificateData.person_uuid || !certificateData.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const certificateUuid = uuidv4();
    const certificateCode = generateCertificateId(certificateData.certificate_type || 'intern');
    const issueDate = new Date().toISOString().split('T')[0];
    
    const canonical = canonicalizeCertificateData({
      ...certificateData,
      issue_date: issueDate,
      schema_version: 1
    });
    
    const fingerprint = generateFingerprint(canonical);
    const signature = crypto.createHash('sha256').update(fingerprint).digest('hex');
    
    db.run(
      `INSERT INTO certificates (
        certificate_uuid, certificate_code, person_uuid, name, certificate_type,
        certificate_data, fingerprint, signature, issue_date, schema_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        certificateUuid, certificateCode, certificateData.person_uuid, certificateData.name,
        certificateData.certificate_type || 'Internship', canonical, fingerprint, signature,
        issueDate, 1
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ 
          success: true, 
          certificateCode,
          certificateUuid,
          message: 'Certificate created successfully' 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk certificate generation
app.post('/api/certificates/create-bulk', async (req, res) => {
  try {
    const { schema, excelData, excelHash } = req.body;
    
    if (!schema || !excelData || excelData.length === 0) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    const batchId = `BATCH-${Date.now()}`;
    const issueDate = new Date().toISOString().split('T')[0];
    
    // Create batch record
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO certificate_batches (batch_id, certificate_type, schema, excel_hash, certificate_count)
         VALUES (?, ?, ?, ?, ?)`,
        [batchId, 'Bulk', JSON.stringify(schema), excelHash, excelData.length],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    const results = [];
    
    for (const row of excelData) {
      // Start with ALL Excel row data to preserve everything
      const certificateData = { ...row };
      
      // Apply schema to override/add structured fields
      for (const field of schema) {
        if (field.source === 'excel') {
          certificateData[field.field] = row[field.excel_column];
        } else if (field.source === 'manual') {
          certificateData[field.field] = field.value;
        } else if (field.source === 'auto') {
          if (field.rule === 'today' || field.rule === 'current_date') {
            certificateData[field.field] = issueDate;
          }
        }
      }
      
      const certificateUuid = uuidv4();
      const certificateCode = generateCertificateId(certificateData.certificate_type || 'intern');
      
      const canonical = canonicalizeCertificateData({
        ...certificateData,
        issue_date: issueDate,
        schema_version: 1
      });
      
      const fingerprint = generateFingerprint(canonical);
      const signature = crypto.createHash('sha256').update(fingerprint).digest('hex');
      
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO certificates (
            certificate_uuid, certificate_code, person_uuid, name, certificate_type,
            certificate_data, fingerprint, signature, issue_date, batch_id, schema_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            certificateUuid, certificateCode, certificateData.person_uuid || certificateUuid,
            certificateData.name, certificateData.certificate_type || 'Internship',
            canonical, fingerprint, signature, issueDate, batchId, 1
          ],
          (err) => err ? reject(err) : resolve()
        );
      });
      
      results.push({ certificateCode, name: certificateData.name });
    }
    
    res.json({ 
      success: true, 
      batchId,
      count: results.length,
      certificates: results.slice(0, 10),
      message: `Successfully generated ${results.length} certificates` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all certificates
app.get('/api/certificates', (req, res) => {
  db.all('SELECT * FROM certificates ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Verify certificate by code or person UUID
app.get('/api/certificates/verify/:identifier', (req, res) => {
  const { identifier } = req.params;
  
  if (!identifier) {
    return res.status(400).json({ error: 'Identifier is required' });
  }
  
  // Check if it's a certificate code or person UUID
  const query = identifier.startsWith('CERT-') 
    ? 'SELECT * FROM certificates WHERE certificate_code = ? AND status = "active"'
    : 'SELECT * FROM certificates WHERE person_uuid = ? AND status = "active" ORDER BY created_at DESC';
  
  db.all(query, [identifier], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Return public data only
    const publicData = rows.map(cert => {
      const certData = JSON.parse(cert.certificate_data);
      return {
        certificate_code: cert.certificate_code,
        name: cert.name,
        certificate_type: cert.certificate_type,
        issue_date: cert.issue_date,
        status: cert.status,
        verified: true,
        ...certData
      };
    });
    
    res.json(rows.length === 1 ? publicData[0] : publicData);
  });
});

// Revoke certificate
app.post('/api/certificates/revoke/:id', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  db.run(
    'UPDATE certificates SET status = "revoked", revoked_at = CURRENT_TIMESTAMP, revocation_reason = ? WHERE id = ?',
    [reason || 'No reason provided', id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Certificate not found' });
      }
      res.json({ message: 'Certificate revoked successfully' });
    }
  );
});

// Export certificates endpoint
app.get('/api/certificates/export', (req, res) => {
  db.all('SELECT * FROM certificates ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// ============ OFFER LETTER ROUTES ============

// Generate unique offer letter number with retry logic
function generateOfferLetterNumber() {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `OL-${year}-${timestamp}${random.slice(0, 3)}`;
}

// Upload Excel for offer letters (staging)
app.post('/api/offer-letters/upload-excel', uploadExcel.single('excel'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Excel file is empty' });
    }
    
    const excelHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const stagingId = `STAGE-${Date.now()}`;
    const importTimestamp = new Date().toISOString();
    
    // Clear previous staging data
    db.run('DELETE FROM offer_letters_staging', (err) => {
      if (err) {
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: err.message });
      }
      
      // Insert staging records
      const stmt = db.prepare(`INSERT INTO offer_letters_staging 
        (staging_id, excel_data, excel_filename, excel_hash, row_number, import_timestamp) 
        VALUES (?, ?, ?, ?, ?, ?)`);
      
      data.forEach((row, index) => {
        stmt.run(
          `${stagingId}-${index}`,
          JSON.stringify(row),
          req.file.originalname,
          excelHash,
          index + 1,
          importTimestamp
        );
      });
      
      stmt.finalize();
      fs.unlinkSync(req.file.path);
      
      res.json({
        success: true,
        stagingId,
        filename: req.file.originalname,
        rowCount: data.length,
        excelHash,
        headers: Object.keys(data[0]),
        preview: data.slice(0, 5)
      });
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// Get staged offer letters
app.get('/api/offer-letters/staging', (req, res) => {
  db.all('SELECT * FROM offer_letters_staging ORDER BY row_number', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const data = rows.map(row => ({
      ...row,
      excel_data: JSON.parse(row.excel_data)
    }));
    res.json(data);
  });
});

// Generate offer letters from staging
app.post('/api/offer-letters/generate', async (req, res) => {
  try {
    const { issueDate, validityDays, offerType } = req.body;
    
    const stagingData = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM offer_letters_staging ORDER BY row_number', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (stagingData.length === 0) {
      return res.status(400).json({ error: 'No staged data found' });
    }
    
    const batchId = `BATCH-OL-${Date.now()}`;
    const generatedTimestamp = new Date().toISOString();
    const offerIssueDate = issueDate || new Date().toISOString().split('T')[0];
    const validity = validityDays || 15;
    const type = offerType || 'Full-time';
    
    // Calculate validity date
    const validityDate = new Date(offerIssueDate);
    validityDate.setDate(validityDate.getDate() + validity);
    const validUntil = validityDate.toISOString().split('T')[0];
    
    const results = [];
    
    // Start transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN IMMEDIATE TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    try {
      // Create batch record
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO offer_letter_batches 
           (batch_id, excel_filename, excel_hash, offer_count, import_timestamp, generated_timestamp) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            batchId,
            stagingData[0].excel_filename,
            stagingData[0].excel_hash,
            stagingData.length,
            stagingData[0].import_timestamp,
            generatedTimestamp
          ],
          (err) => err ? reject(err) : resolve()
        );
      });
      
      // Generate offer letters with unique numbers and custom settings
      for (const staged of stagingData) {
        const offerLetterNumber = generateOfferLetterNumber();
        const excelData = JSON.parse(staged.excel_data);
        
        // Merge Excel data with generation settings
        const enrichedData = {
          ...excelData,
          issue_date: offerIssueDate,
          validity_days: validity,
          valid_until: validUntil,
          offer_type: type,
          generated_at: generatedTimestamp
        };
        
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO offer_letters 
             (offer_letter_number, offer_data, batch_id, excel_filename, excel_hash, 
              row_number, import_timestamp, generated_timestamp) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              offerLetterNumber,
              JSON.stringify(enrichedData),
              batchId,
              staged.excel_filename,
              staged.excel_hash,
              staged.row_number,
              staged.import_timestamp,
              generatedTimestamp
            ],
            (err) => err ? reject(err) : resolve()
          );
        });
        
        results.push({ offerLetterNumber, row: staged.row_number });
      }
      
      // Clear staging after successful generation
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM offer_letters_staging', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Commit transaction
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      res.json({
        success: true,
        batchId,
        count: results.length,
        offerLetters: results,
        settings: { issueDate: offerIssueDate, validityDays: validity, validUntil, offerType: type },
        message: `Successfully generated ${results.length} offer letters`
      });
    } catch (error) {
      // Rollback on error
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create single offer letter
app.post('/api/offer-letters/create-single', async (req, res) => {
  try {
    const { offerData } = req.body;
    
    if (!offerData) {
      return res.status(400).json({ error: 'Offer data is required' });
    }
    
    const offerLetterNumber = generateOfferLetterNumber();
    const generatedTimestamp = new Date().toISOString();
    
    db.run(
      `INSERT INTO offer_letters 
       (offer_letter_number, offer_data, generated_timestamp) 
       VALUES (?, ?, ?)`,
      [offerLetterNumber, JSON.stringify(offerData), generatedTimestamp],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({
          success: true,
          offerLetterNumber,
          message: 'Offer letter created successfully'
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all offer letters
app.get('/api/offer-letters', (req, res) => {
  db.all('SELECT * FROM offer_letters ORDER BY generated_timestamp DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const data = rows.map(row => ({
      ...row,
      offer_data: JSON.parse(row.offer_data)
    }));
    res.json(data);
  });
});

// Verify offer letter
app.get('/api/offer-letters/verify/:offerNumber', (req, res) => {
  const { offerNumber } = req.params;
  
  if (!offerNumber) {
    return res.status(400).json({ error: 'Offer letter number is required' });
  }
  
  db.get(
    'SELECT * FROM offer_letters WHERE offer_letter_number = ? AND status = "active"',
    [offerNumber],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Offer letter not found' });
      }
      
      const offerData = JSON.parse(row.offer_data);
      
      // Return only public fields with flexible field name handling
      const publicData = {
        offer_letter_number: row.offer_letter_number,
        candidate_name: offerData.candidate_name || offerData['Candidate Name'] || offerData.name || 'N/A',
        company_name: offerData.company_name || offerData.Company || offerData['Company Name'] || 'N/A',
        designation: offerData.designation || offerData.Designation || 'N/A',
        validity_period: offerData.validity_period || offerData['Validity Period'] || 'N/A',
        issue_date: offerData.issue_date || row.generated_timestamp,
        status: row.status,
        verified: true
      };
      
      res.json(publicData);
    }
  );
});

// Export offer letters
app.get('/api/offer-letters/export', (req, res) => {
  db.all('SELECT * FROM offer_letters ORDER BY generated_timestamp DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const exportData = rows.map(row => {
      const offerData = JSON.parse(row.offer_data);
      return {
        'Offer Letter Number': row.offer_letter_number,
        'Batch ID': row.batch_id || 'Single',
        'Generated Date': new Date(row.generated_timestamp).toLocaleDateString(),
        'Status': row.status,
        ...offerData
      };
    });
    res.json(exportData);
  });
});

// Get offer letter batches
app.get('/api/offer-letters/batches', (req, res) => {
  db.all('SELECT * FROM offer_letter_batches ORDER BY generated_timestamp DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM employees', (err, row) => {
    if (err) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: err.message 
      });
    }
    res.json({ 
      status: 'ok', 
      message: 'Server and database are running',
      employeeCount: row.count,
      timestamp: new Date().toISOString()
    });
  });
});

// Monitoring dashboard endpoint
app.get('/api/monitoring/stats', (req, res) => {
  res.json(monitoring.getStats());
});

// Recent logs endpoint
app.get('/api/monitoring/logs/:type?', (req, res) => {
  const { type = 'combined' } = req.params;
  const { lines = 50 } = req.query;
  
  const validTypes = ['combined', 'error', 'security'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid log type' });
  }
  
  const logs = monitoring.getRecentLogs(type, parseInt(lines));
  res.json({ type, count: logs.length, logs });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Health check available at http://localhost:${PORT}/api/health`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
});


// Update offer letter
app.put('/api/offer-letters/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid offer letter ID' });
    }
    
    const { offerData, status } = req.body;
    
    if (!offerData) {
      return res.status(400).json({ error: 'Offer data is required' });
    }
    
    db.run(
      'UPDATE offer_letters SET offer_data = ?, status = ? WHERE id = ?',
      [JSON.stringify(offerData), status || 'active', id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Offer letter not found' });
        }
        res.json({ message: 'Offer letter updated successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete offer letter
app.delete('/api/offer-letters/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid offer letter ID' });
  }
  
  db.run('DELETE FROM offer_letters WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Offer letter not found' });
    }
    res.json({ message: 'Offer letter deleted successfully' });
  });
});

// Get single offer letter by ID
app.get('/api/offer-letters/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid offer letter ID' });
  }
  
  db.get('SELECT * FROM offer_letters WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Offer letter not found' });
    }
    res.json({
      ...row,
      offer_data: JSON.parse(row.offer_data)
    });
  });
});
