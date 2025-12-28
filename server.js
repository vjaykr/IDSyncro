require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
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
const jwt = require('jsonwebtoken');
const logger = require('./logger');
const monitoring = require('./monitoring');
const {
  connectDB,
  Employee,
  Certificate,
  CertificateBatch,
  OfferLetter,
  OfferLetterBatch,
  OfferLetterStaging,
  getNextSequenceValue,
  generateEmployeeCode
} = require('./database');

// Simple logging function
function log(level, message, data = null) {
  const logData = { message, ...data };
  logger[level](logData);
}

const DEFAULT_ADMIN_EMAIL = 'admin@idsyncro.local';
const DEFAULT_ADMIN_PASSWORD = 'ChangeMe123!';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '12h';

if (!JWT_SECRET) {
  logger.warn('JWT_SECRET is not configured. Authentication requests will fail until JWT_SECRET is set.');
}

if (ADMIN_EMAIL === DEFAULT_ADMIN_EMAIL || ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
  logger.warn('Default admin credentials are in use. Update ADMIN_EMAIL and ADMIN_PASSWORD in your .env file.');
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
const PORT = parseInt(process.env.PORT, 10) || 5000;
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'https://idsyncro.saralworkstechnologies.info'
];
const configuredOrigins = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;
const ALLOWED_CORS_ORIGINS = configuredOrigins
  ? configuredOrigins.split(',').map(origin => origin.trim()).filter(Boolean)
  : DEFAULT_CORS_ORIGINS;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    logger.warn('Blocked CORS origin', { origin });
    return callback(new Error('Not allowed by CORS'), false);
  },
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

// Database setup handled via MongoDB connection (see database.js)

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

function toPlainObject(doc) {
  if (!doc) {
    return null;
  }
  const raw = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = raw;
  return rest;
}

function toPlainList(list = []) {
  return list.map(item => toPlainObject(item));
}

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCurrentMonthRange() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

const PUBLIC_ROUTE_RULES = [
  { method: 'ALL', pattern: /^\/api\/verify/ },
  { method: 'ALL', pattern: /^\/api\/certificates\/verify/ },
  { method: 'ALL', pattern: /^\/api\/offer-letters\/verify/ },
  { method: 'GET', pattern: /^\/api\/health/ },
  { method: 'POST', pattern: /^\/api\/auth\/login$/ }
];

function routeMatches(rule, req) {
  if (!rule || !req.path) {
    return false;
  }
  const methodMatches = rule.method === 'ALL' || rule.method === req.method;
  return methodMatches && rule.pattern.test(req.path);
}

function isPublicRoute(req) {
  if (req.method === 'OPTIONS') {
    return true;
  }
  if (req.path && req.path.startsWith('/uploads')) {
    return true;
  }
  return PUBLIC_ROUTE_RULES.some(rule => routeMatches(rule, req));
}

function extractTokenFromRequest(req) {
  const header = req.headers?.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return null;
}

function authenticateRequest(req, res, next) {
  if (isPublicRoute(req)) {
    return next();
  }

  const token = extractTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!JWT_SECRET) {
    logger.error('Authentication attempted without JWT_SECRET configured');
    return res.status(500).json({ error: 'Authentication not configured' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

async function getNextEmployeeRowId() {
  return getNextSequenceValue('employees');
}

async function getNextCertificateRowId() {
  return getNextSequenceValue('certificates');
}

async function getNextOfferLetterRowId() {
  return getNextSequenceValue('offer_letters');
}

async function generateIdNumber(type) {
  return generateEmployeeCode(type);
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'Authentication is not configured on this server' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      logger.warn('Failed login attempt', { email: normalizedEmail, requestId: req.requestId });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ email: ADMIN_EMAIL, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    logger.info('Admin login successful', { email: ADMIN_EMAIL, requestId: req.requestId });

    res.json({
      token,
      user: { email: ADMIN_EMAIL, role: 'admin' }
    });
  } catch (error) {
    logger.error('Login failed', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Unable to process login' });
  }
});

app.use(authenticateRequest);

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: { email: req.user.email, role: req.user.role || 'admin' } });
});

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

      const sanitizedData = sanitizeEmployeeData({
        name, designation, department, type, employment_type, work_location, email, phone, address,
        emergency_contact, emergency_phone, date_of_birth, joining_date,
        salary, bank_account, aadhar_number, pan_number, blood_group, manager
      });

      const validation = validateEmployeeData(sanitizedData);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: validation.errors
        });
      }

      const uuid = uuidv4();
      const employeeType = sanitizedData.type || 'employee';
      const employeeId = await generateIdNumber(employeeType);
      const numericId = await getNextEmployeeRowId();

      const photo = req.file ? req.file.filename : null;
      const qrCode = await generateQRCode(employeeId, uuid);

      const employee = await Employee.create({
        id: numericId,
        uuid,
        employee_id: employeeId,
        name: sanitizedData.name,
        designation: sanitizedData.designation,
        department: sanitizedData.department,
        type: employeeType,
        employment_type: sanitizedData.employment_type,
        work_location: sanitizedData.work_location,
        photo,
        qr_code: qrCode,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        address: sanitizedData.address,
        emergency_contact: sanitizedData.emergency_contact,
        emergency_phone: sanitizedData.emergency_phone,
        date_of_birth: sanitizedData.date_of_birth,
        joining_date: sanitizedData.joining_date,
        salary: sanitizedData.salary,
        bank_account: sanitizedData.bank_account,
        aadhar_number: sanitizedData.aadhar_number,
        pan_number: sanitizedData.pan_number,
        blood_group: sanitizedData.blood_group,
        manager: sanitizedData.manager
      });

      log('info', 'Employee created successfully', {
        id: employee.id,
        employeeId,
        name: sanitizedData.name,
        requestId: req.requestId
      });

      res.json({
        id: employee.id,
        uuid,
        employeeId,
        message: 'Employee created successfully'
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          error: 'Employee ID conflict. Please try again.',
          details: 'Duplicate key detected while saving employee. Retrying will issue a fresh ID.'
        });
      }
      res.status(500).json({ error: error.message });
    }
  });
});

app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ created_at: -1 }).lean();
    res.json(toPlainList(employees));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/employees/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid employee ID' });
  }

  try {
    const employee = await Employee.findOne({ id }).lean();
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(toPlainObject(employee));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid employee ID' });
  }

  try {
    const result = await Employee.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/employees/:id', uploadImage.single('photo'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const {
      name, designation, department, type, employment_type, work_location, status, email, phone, address,
      emergency_contact, emergency_phone, date_of_birth, joining_date,
      salary, bank_account, aadhar_number, pan_number, blood_group, manager, existingPhoto
    } = req.body;

    const employee = await Employee.findOne({ id });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const sanitizedData = sanitizeEmployeeData({
      name, designation, department, type, employment_type, work_location, status, email, phone, address,
      emergency_contact, emergency_phone, date_of_birth, joining_date,
      salary, bank_account, aadhar_number, pan_number, blood_group, manager
    });

    const validation = validateEmployeeData(sanitizedData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    let photo = employee.photo;
    if (req.file) {
      photo = req.file.filename;
    } else if (existingPhoto) {
      photo = existingPhoto;
    }

    let employeeId = employee.employee_id;
    if (sanitizedData.type && sanitizedData.type !== employee.type) {
      employeeId = await generateIdNumber(sanitizedData.type);
    }

    const qrCode = await generateQRCode(employeeId, employee.uuid);

    employee.name = sanitizedData.name ?? employee.name;
    employee.designation = sanitizedData.designation ?? employee.designation;
    employee.department = sanitizedData.department ?? employee.department;
    employee.type = sanitizedData.type ?? employee.type;
    employee.employment_type = sanitizedData.employment_type ?? employee.employment_type;
    employee.work_location = sanitizedData.work_location ?? employee.work_location;
    employee.status = sanitizedData.status ?? employee.status;
    employee.photo = photo;
    employee.employee_id = employeeId;
    employee.qr_code = qrCode;
    employee.email = sanitizedData.email ?? employee.email;
    employee.phone = sanitizedData.phone ?? employee.phone;
    employee.address = sanitizedData.address ?? employee.address;
    employee.emergency_contact = sanitizedData.emergency_contact ?? employee.emergency_contact;
    employee.emergency_phone = sanitizedData.emergency_phone ?? employee.emergency_phone;
    employee.date_of_birth = sanitizedData.date_of_birth ?? employee.date_of_birth;
    employee.joining_date = sanitizedData.joining_date ?? employee.joining_date;
    employee.salary = sanitizedData.salary ?? employee.salary;
    employee.bank_account = sanitizedData.bank_account ?? employee.bank_account;
    employee.aadhar_number = sanitizedData.aadhar_number ?? employee.aadhar_number;
    employee.pan_number = sanitizedData.pan_number ?? employee.pan_number;
    employee.blood_group = sanitizedData.blood_group ?? employee.blood_group;
    employee.manager = sanitizedData.manager ?? employee.manager;

    await employee.save();

    res.json({ message: 'Employee updated successfully', employeeId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.get('/api/verify/:uuid', async (req, res) => {
  const { uuid } = req.params;

  if (!uuid || uuid.trim().length === 0) {
    return res.status(400).json({ error: 'UUID or Employee ID is required' });
  }

  const sanitizedUuid = uuid.trim().substring(0, 100);

  try {
    const employee = await Employee.findOne({
      $or: [{ uuid: sanitizedUuid }, { employee_id: sanitizedUuid }]
    }).lean();

    if (!employee) {
      return res.status(404).json({ error: 'ID not found' });
    }

    const publicData = {
      name: employee.name,
      employee_id: employee.employee_id,
      designation: employee.designation,
      department: employee.department,
      type: employee.type,
      photo: employee.photo,
      created_at: employee.created_at,
      status: employee.status
    };

    res.json(publicData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin-only endpoint for full employee details
app.get('/api/admin/employees/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid employee ID' });
  }

  try {
    const employee = await Employee.findOne({ id }).lean();
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(toPlainObject(employee));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate ID Card HTML for download
// Generate PDF for single employee
app.get('/api/print-pdf/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid employee ID' });
  }

  try {
    const employee = await Employee.findOne({ id }).lean();
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${employee.name.replace(/[^a-zA-Z0-9]/g, '_')}_ID.json"`);
    res.json(toPlainObject(employee));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate PDF for multiple employees
app.post('/api/print-pdf-bulk', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid IDs array' });
  }

  const validIds = ids
    .map(id => parseInt(id, 10))
    .filter(id => Number.isInteger(id) && id > 0);

  if (validIds.length === 0) {
    return res.status(400).json({ error: 'No valid employee IDs provided' });
  }

  try {
    const employees = await Employee.find({ id: { $in: validIds } }).lean();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="Bulk_Employee_IDs.json"');
    res.json(toPlainList(employees));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Search employees with advanced filters
app.get('/api/employees/search', async (req, res) => {
  try {
    const { q, type, status, department, sortBy } = req.query;

    if (q && (typeof q !== 'string' || q.length > 100)) {
      return res.status(400).json({ error: 'Invalid search query' });
    }

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

    const filter = {};

    if (q && q.trim()) {
      const regex = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [
        { name: regex },
        { employee_id: regex },
        { department: regex },
        { designation: regex },
        { email: regex },
        { phone: regex }
      ];
    }

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (department && department !== 'all') {
      filter.department = department.trim();
    }

    let sort = { created_at: -1 };
    if (sortBy === 'name') {
      sort = { name: 1 };
    } else if (sortBy === 'id') {
      sort = { employee_id: 1 };
    }

    const employees = await Employee.find(filter).sort(sort).lean();
    res.json(toPlainList(employees));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Summary report endpoint for Excel export
app.get('/api/summary-report', async (req, res) => {
  try {
    const { period } = req.query;
    const isMonthly = period === 'month';
    const baseFilter = {};
    const monthRange = getCurrentMonthRange();

    if (isMonthly) {
      baseFilter.created_at = { $gte: monthRange.start, $lt: monthRange.end };
    }

    const count = (extra = {}) => Employee.countDocuments({ ...baseFilter, ...extra });

    const [
      totalEmployees,
      employees,
      interns,
      activeIDs,
      activeEmployees,
      activeInterns,
      inactiveEmployees,
      inactiveInterns,
      suspendedIDs,
      onLeaveIDs,
      terminatedIDs,
      resignedIDs,
      createdThisMonth
    ] = await Promise.all([
      count(),
      count({ type: 'employee' }),
      count({ type: 'intern' }),
      count({ status: 'active' }),
      count({ type: 'employee', status: 'active' }),
      count({ type: 'intern', status: 'active' }),
      count({ type: 'employee', status: 'inactive' }),
      count({ type: 'intern', status: 'inactive' }),
      count({ status: 'suspended' }),
      count({ status: 'on_leave' }),
      count({ status: 'terminated' }),
      count({ status: 'resigned' }),
      Employee.countDocuments({ created_at: { $gte: monthRange.start, $lt: monthRange.end } })
    ]);

    const summaryData = [
      { Metric: 'Total Employees', Count: totalEmployees },
      { Metric: 'Employees', Count: employees },
      { Metric: 'Interns', Count: interns },
      { Metric: 'Active IDs', Count: activeIDs },
      { Metric: 'Active Employees', Count: activeEmployees },
      { Metric: 'Active Interns', Count: activeInterns },
      { Metric: 'Inactive Employees', Count: inactiveEmployees },
      { Metric: 'Inactive Interns', Count: inactiveInterns },
      { Metric: 'Suspended IDs', Count: suspendedIDs },
      { Metric: 'IDs On Leave', Count: onLeaveIDs },
      { Metric: 'Terminated IDs', Count: terminatedIDs },
      { Metric: 'Resigned IDs', Count: resignedIDs },
      { Metric: 'Created This Month', Count: createdThisMonth }
    ];

    res.json({
      period: isMonthly ? 'Current Month' : 'All Time',
      data: summaryData,
      raw: {
        totalEmployees,
        employees,
        interns,
        activeIDs,
        activeEmployees,
        activeInterns,
        inactiveEmployees,
        inactiveInterns,
        suspendedIDs,
        onLeaveIDs,
        terminatedIDs,
        resignedIDs,
        createdThisMonth
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unique departments
app.get('/api/departments', async (req, res) => {
  try {
    const departments = await Employee.distinct('department', { department: { $nin: [null, ''] } });
    res.json(departments.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    const { month } = req.query;
    const isMonthly = month === 'current';
    const baseFilter = {};
    const monthRange = getCurrentMonthRange();

    if (isMonthly) {
      baseFilter.created_at = { $gte: monthRange.start, $lt: monthRange.end };
    }

    const count = (extra = {}) => Employee.countDocuments({ ...baseFilter, ...extra });

    const [
      total,
      employees,
      interns,
      active,
      activeEmployees,
      activeInterns,
      inactiveEmployees,
      inactiveInterns,
      suspended,
      onLeave,
      thisMonth
    ] = await Promise.all([
      count(),
      count({ type: 'employee' }),
      count({ type: 'intern' }),
      count({ status: 'active' }),
      count({ type: 'employee', status: 'active' }),
      count({ type: 'intern', status: 'active' }),
      count({ type: 'employee', status: 'inactive' }),
      count({ type: 'intern', status: 'inactive' }),
      count({ status: 'suspended' }),
      count({ status: 'on_leave' }),
      Employee.countDocuments({ created_at: { $gte: monthRange.start, $lt: monthRange.end } })
    ]);

    res.json({
      total,
      employees,
      interns,
      active,
      activeEmployees,
      activeInterns,
      inactiveEmployees,
      inactiveInterns,
      suspended,
      onLeave,
      thisMonth
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export data endpoint
app.get('/api/export/:type', async (req, res) => {
  const { type } = req.params;
  const validTypes = ['all', 'employee', 'intern'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid export type. Must be: all, employee, or intern' });
  }

  const filter = type === 'all' ? {} : { type };

  try {
    const employees = await Employee.find(filter).sort({ created_at: -1 }).lean();
    res.json(toPlainList(employees));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk status update endpoint
app.put('/api/employees/bulk-status', async (req, res) => {
  const { employeeIds, status } = req.body;

  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({ error: 'Employee IDs are required' });
  }

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validIds = employeeIds
    .map(id => parseInt(id, 10))
    .filter(id => Number.isInteger(id) && id > 0);

  if (validIds.length === 0) {
    return res.status(400).json({ error: 'No valid employee IDs provided' });
  }

  const validStatuses = ['active', 'inactive', 'terminated', 'resigned', 'on_leave', 'suspended'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await Employee.updateMany({ id: { $in: validIds } }, { $set: { status } });
    res.json({
      message: `Successfully updated ${result.modifiedCount} employee(s)`,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simple bulk status update endpoint (no validation)
app.patch('/api/bulk-status-update', async (req, res) => {
  const { employeeIds, status } = req.body;

  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({ error: 'Employee IDs are required' });
  }

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validIds = employeeIds
    .map(id => parseInt(id, 10))
    .filter(id => Number.isInteger(id) && id > 0);

  if (validIds.length === 0) {
    return res.status(400).json({ error: 'No valid employee IDs provided' });
  }

  try {
    const result = await Employee.updateMany({ id: { $in: validIds } }, { $set: { status } });
    res.json({
      message: `Successfully updated ${result.modifiedCount} employee(s)`,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

  const validIds = employeeIds
    .map(id => parseInt(id, 10))
    .filter(id => Number.isInteger(id) && id > 0);

  if (validIds.length === 0) {
    return res.status(400).json({ error: 'No valid employee IDs provided' });
  }

  try {
    let updatedCount = 0;

    for (const rowId of validIds) {
      const employee = await Employee.findOne({ id: rowId });
      if (employee && employee.type !== type) {
        const newEmployeeId = await generateIdNumber(type);
        const newQrCode = await generateQRCode(newEmployeeId, employee.uuid);

        employee.type = type;
        employee.employee_id = newEmployeeId;
        employee.qr_code = newQrCode;
        await employee.save();
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
    const numericId = await getNextCertificateRowId();

    await Certificate.create({
      id: numericId,
      certificate_uuid: certificateUuid,
      certificate_code: certificateCode,
      person_uuid: certificateData.person_uuid,
      name: certificateData.name,
      certificate_type: certificateData.certificate_type || 'Internship',
      certificate_data: canonical,
      fingerprint,
      signature,
      issue_date: issueDate,
      schema_version: 1
    });

    res.json({
      success: true,
      certificateCode,
      certificateUuid,
      message: 'Certificate created successfully'
    });
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

    await CertificateBatch.create({
      batch_id: batchId,
      certificate_type: 'Bulk',
      schema: JSON.stringify(schema),
      excel_hash: excelHash,
      certificate_count: excelData.length
    });

    const certificatesToInsert = [];
    const results = [];

    for (const row of excelData) {
      const certificateData = { ...row };

      for (const field of schema) {
        if (field.source === 'excel') {
          certificateData[field.field] = row[field.excel_column];
        } else if (field.source === 'manual') {
          certificateData[field.field] = field.value;
        } else if (field.source === 'auto' && (field.rule === 'today' || field.rule === 'current_date')) {
          certificateData[field.field] = issueDate;
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
      const numericId = await getNextCertificateRowId();

      certificatesToInsert.push({
        id: numericId,
        certificate_uuid: certificateUuid,
        certificate_code: certificateCode,
        person_uuid: certificateData.person_uuid || certificateUuid,
        name: certificateData.name,
        certificate_type: certificateData.certificate_type || 'Internship',
        certificate_data: canonical,
        fingerprint,
        signature,
        issue_date: issueDate,
        batch_id: batchId,
        schema_version: 1
      });

      results.push({ certificateCode, name: certificateData.name });
    }

    await Certificate.insertMany(certificatesToInsert);

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
app.get('/api/certificates', async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ created_at: -1 }).lean();
    res.json(toPlainList(certificates));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify certificate by code or person UUID
app.get('/api/certificates/verify/:identifier', async (req, res) => {
  const { identifier } = req.params;

  if (!identifier) {
    return res.status(400).json({ error: 'Identifier is required' });
  }

  try {
    let certificates = [];

    if (identifier.startsWith('CERT-')) {
      const certificate = await Certificate.findOne({ certificate_code: identifier, status: 'active' }).lean();
      if (!certificate) {
        return res.status(404).json({ error: 'Certificate not found' });
      }
      certificates = [certificate];
    } else {
      certificates = await Certificate.find({ person_uuid: identifier, status: 'active' })
        .sort({ created_at: -1 })
        .lean();
      if (certificates.length === 0) {
        return res.status(404).json({ error: 'Certificate not found' });
      }
    }

    const publicData = certificates.map(cert => {
      const certData = JSON.parse(cert.certificate_data || '{}');
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

    res.json(publicData.length === 1 ? publicData[0] : publicData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revoke certificate
app.post('/api/certificates/revoke/:id', async (req, res) => {
  const numericId = parseInt(req.params.id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ error: 'Invalid certificate ID' });
  }

  try {
    const updated = await Certificate.findOneAndUpdate(
      { id: numericId },
      {
        status: 'revoked',
        revoked_at: new Date(),
        revocation_reason: req.body.reason || 'No reason provided'
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({ message: 'Certificate revoked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export certificates endpoint
app.get('/api/certificates/export', async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ created_at: -1 }).lean();
    res.json(toPlainList(certificates));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
app.post('/api/offer-letters/upload-excel', uploadExcel.single('excel'), async (req, res) => {
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

    await OfferLetterStaging.deleteMany({});

    const stagingDocs = data.map((row, index) => ({
      staging_id: `${stagingId}-${index}`,
      excel_data: JSON.stringify(row),
      excel_filename: req.file.originalname,
      excel_hash: excelHash,
      row_number: index + 1,
      import_timestamp: importTimestamp
    }));

    await OfferLetterStaging.insertMany(stagingDocs);
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
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// Get staged offer letters
app.get('/api/offer-letters/staging', async (req, res) => {
  try {
    const rows = await OfferLetterStaging.find().sort({ row_number: 1 }).lean();
    const data = rows.map(row => ({
      ...toPlainObject(row),
      excel_data: JSON.parse(row.excel_data)
    }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate offer letters from staging
app.post('/api/offer-letters/generate', async (req, res) => {
  try {
    const { issueDate, validityDays, offerType } = req.body;

    const stagingData = await OfferLetterStaging.find().sort({ row_number: 1 }).lean();
    if (stagingData.length === 0) {
      return res.status(400).json({ error: 'No staged data found' });
    }

    const batchId = `BATCH-OL-${Date.now()}`;
    const generatedTimestamp = new Date().toISOString();
    const offerIssueDate = issueDate || new Date().toISOString().split('T')[0];
    const validity = validityDays || 15;
    const type = offerType || 'Full-time';

    const validityDate = new Date(offerIssueDate);
    validityDate.setDate(validityDate.getDate() + validity);
    const validUntil = validityDate.toISOString().split('T')[0];

    const results = [];
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await OfferLetterBatch.create([
        {
          batch_id: batchId,
          excel_filename: stagingData[0].excel_filename,
          excel_hash: stagingData[0].excel_hash,
          offer_count: stagingData.length,
          import_timestamp: stagingData[0].import_timestamp,
          generated_timestamp: generatedTimestamp
        }
      ], { session });

      const offerDocs = [];

      for (const staged of stagingData) {
        const offerLetterNumber = generateOfferLetterNumber();
        const excelData = JSON.parse(staged.excel_data);
        const enrichedData = {
          ...excelData,
          issue_date: offerIssueDate,
          validity_days: validity,
          valid_until: validUntil,
          offer_type: type,
          generated_at: generatedTimestamp
        };

        const numericId = await getNextOfferLetterRowId();

        offerDocs.push({
          id: numericId,
          offer_letter_number: offerLetterNumber,
          offer_data: JSON.stringify(enrichedData),
          batch_id: batchId,
          excel_filename: staged.excel_filename,
          excel_hash: staged.excel_hash,
          row_number: staged.row_number,
          import_timestamp: staged.import_timestamp,
          generated_timestamp: generatedTimestamp
        });

        results.push({ offerLetterNumber, row: staged.row_number });
      }

      await OfferLetter.insertMany(offerDocs, { session });
      await OfferLetterStaging.deleteMany({}, { session });

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        batchId,
        count: results.length,
        offerLetters: results,
        settings: { issueDate: offerIssueDate, validityDays: validity, validUntil, offerType: type },
        message: `Successfully generated ${results.length} offer letters`
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
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
    const numericId = await getNextOfferLetterRowId();

    await OfferLetter.create({
      id: numericId,
      offer_letter_number: offerLetterNumber,
      offer_data: JSON.stringify(offerData),
      generated_timestamp: generatedTimestamp
    });

    res.json({
      success: true,
      offerLetterNumber,
      message: 'Offer letter created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all offer letters
app.get('/api/offer-letters', async (req, res) => {
  try {
    const rows = await OfferLetter.find().sort({ generated_timestamp: -1 }).lean();
    const data = rows.map(row => ({
      ...toPlainObject(row),
      offer_data: JSON.parse(row.offer_data)
    }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify offer letter
app.get('/api/offer-letters/verify/:offerNumber', async (req, res) => {
  const { offerNumber } = req.params;

  if (!offerNumber) {
    return res.status(400).json({ error: 'Offer letter number is required' });
  }

  try {
    const row = await OfferLetter.findOne({ offer_letter_number: offerNumber, status: 'active' }).lean();
    if (!row) {
      return res.status(404).json({ error: 'Offer letter not found' });
    }

    const offerData = JSON.parse(row.offer_data);

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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export offer letters
app.get('/api/offer-letters/export', async (req, res) => {
  try {
    const rows = await OfferLetter.find().sort({ generated_timestamp: -1 }).lean();
    const exportData = rows.map(row => {
      const offerData = JSON.parse(row.offer_data);
      return {
        'Offer Letter Number': row.offer_letter_number,
        'Batch ID': row.batch_id || 'Single',
        'Generated Date': row.generated_timestamp ? new Date(row.generated_timestamp).toLocaleDateString() : 'N/A',
        'Status': row.status,
        ...offerData
      };
    });
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get offer letter batches
app.get('/api/offer-letters/batches', async (req, res) => {
  try {
    const rows = await OfferLetterBatch.find().sort({ generated_timestamp: -1 }).lean();
    res.json(toPlainList(rows));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const count = await Employee.countDocuments();
    res.json({
      status: 'ok',
      message: 'Server and database are running',
      employeeCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
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

async function startServer() {
  try {
    logger.info('Attempting MongoDB connection');
    console.log('Attempting MongoDB connection...');
    await connectDB();
    logger.info('Connected to MongoDB Atlas cluster');
    console.log('Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to initialize MongoDB connection', { error: error.message });
    console.error('Failed to initialize MongoDB connection:', error);
    process.exit(1);
  }
}

startServer();

// Update offer letter
app.put('/api/offer-letters/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid offer letter ID' });
    }

    const { offerData, status } = req.body;

    if (!offerData) {
      return res.status(400).json({ error: 'Offer data is required' });
    }

    const updated = await OfferLetter.findOneAndUpdate(
      { id },
      { offer_data: JSON.stringify(offerData), status: status || 'active' }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Offer letter not found' });
    }

    res.json({ message: 'Offer letter updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete offer letter
app.delete('/api/offer-letters/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid offer letter ID' });
  }

  try {
    const result = await OfferLetter.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Offer letter not found' });
    }
    res.json({ message: 'Offer letter deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single offer letter by ID
app.get('/api/offer-letters/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid offer letter ID' });
  }

  try {
    const row = await OfferLetter.findOne({ id }).lean();
    if (!row) {
      return res.status(404).json({ error: 'Offer letter not found' });
    }
    res.json({
      ...toPlainObject(row),
      offer_data: JSON.parse(row.offer_data)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
