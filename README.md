# IDSyncro ID Management System

A comprehensive web application for organizations to design, issue, and verify ID cards and certificates.

## Features

### ID Card Management
- **Employee IDs**: Format `SWT-25-EMP-0XXX`
- **Intern IDs**: Format `SWT-25-INT-0XXX`
- Auto-generated unique ID numbers
- Photo upload and management
- QR code generation for verification

### Offer Letter Generator
- **Individual Generation**: Create single offer letters via web form
- **Bulk Generation**: Import Excel files for mass generation
- **Staging System**: Review data before generating offer letter numbers
- **Unique Numbers**: Format `OL-YYYY-XXXXXX` (immutable, globally unique)
- **Public Verification**: Verify offer letters by number
- **Excel Export**: Export with all original data plus generated numbers
- **Batch Tracking**: Track and manage bulk generations
- **Metadata Storage**: Complete audit trail with timestamps and file hashes

### Template Designer
- Dynamic form fields based on ID type
- Photo upload with preview
- Automatic ID number generation
- QR code integration

### Verification System
- Public verification page
- QR code scanning support
- UUID-based verification
- Real-time status checking

### Management Features
- CRUD operations for all ID types
- Filtering by ID type
- Dashboard with statistics
- Bulk operations support

## Technology Stack

### Backend
- Node.js with Express
- MongoDB Atlas via Mongoose
- Multer for file uploads
- QRCode generation
- Canvas for image processing

### Frontend
- React.js
- React Router for navigation
- Axios for API calls
- Modern responsive design

## Installation

### Backend Setup
1. Navigate to the root directory:
   ```bash
   cd IDSyncro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the project root
   - Set `MONGODB_URI` to your MongoDB Atlas connection string
   - Set `ADMIN_EMAIL` to the email that is allowed to access the admin portal
    - Set `ADMIN_PASSWORD` to the plaintext password that should unlock the admin portal (change the defaults from `admin@idsyncro.local` / `ChangeMe123!`)
   - Set `JWT_SECRET` to a long random string used to sign session tokens
   - Optionally set `JWT_EXPIRY`, `PORT`, `CORS_ORIGIN`, and other overrides referenced in `server.js`
   - Set `VERIFY_PORTAL_BASE_URL` to the fully qualified verification portal domain (e.g., `https://verify.saralworkstechnologies.info`) so generated QR codes and email links always target the public site

4. Start the backend server:
   ```bash
   npm run dev
   ```
      Server will run on http://localhost:9091

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the frontend environment variables:
   - Update `frontend/.env` (or copy from `.env.example` if you keep one) so `REACT_APP_API_BASE_URL` targets your API gateway
   - Set `REACT_APP_VERIFY_PORTAL_URL` to `https://verify.saralworkstechnologies.info` in production; use `http://localhost:9090` when testing locally so redirects stay on your dev box

4. Start the React development server:
   ```bash
   npm start
   ```
   Frontend will run on http://localhost:9090

### Authentication & Subdomains
- The admin portal now requires a JWT login. Use the credentials defined by `ADMIN_EMAIL`/`ADMIN_PASSWORD` (defaults are `admin@idsyncro.local` / `ChangeMe123!`, update them in `.env`).
- Verification endpoints remain public so the `/verify` page and external scanners continue to work without signing in.
- Plan two deployments if you want branded subdomains:
   - `id.saralworkstechnologies.info` → full portal (requires login)
   - `verify.saralworkstechnologies.info` → renders only the Verify page and hides the navigation bar
- The React SPA now forces any `/verify` navigation on the admin host to `https://verify.saralworkstechnologies.info`, ensuring the verification UI is only accessible on that dedicated domain.
- Both subdomains can point to the same backend API; update `REACT_APP_API_BASE_URL` in the frontend build if the API is not on `http://localhost:9091`.

## Usage

### Creating IDs
1. Go to "Create ID" page
2. Select ID type (Employee/Intern)
3. Fill required fields based on type
4. Upload photo
5. Click "Generate ID"

### Creating Offer Letters

#### Individual Offer Letter
1. Go to "Offer Letters" → "Create Single"
2. Fill in candidate details (name, company, designation, etc.)
3. Click "Generate Offer Letter"
4. Unique offer letter number is generated instantly

#### Bulk Offer Letter Generation
1. Go to "Offer Letters" → "Bulk Generation"
2. Prepare Excel file with offer letter data
3. Upload Excel file - data is staged (no numbers yet)
4. Review staged data preview
5. Click "Generate Offer Letters" to create unique numbers
6. All offer letters generated in a single batch
7. Export results with generated numbers

### Managing Offer Letters
1. Go to "Offer Letters" → "Manage"
2. View all generated offer letters
3. Filter by batch
4. Export to Excel with all data
5. View batch statistics

### Verifying Offer Letters
1. Go to "Verify ID" page (`https://verify.saralworkstechnologies.info/verify` in production or `http://localhost:9090/verify` locally)
2. Select "Offer Letter" tab
3. Enter offer letter number
4. View public information (company, designation, validity)
5. Confirm authenticity

### Managing IDs
1. Go to "Manage IDs" page
2. View all created IDs
3. Filter by type
4. Delete IDs as needed
5. Verify IDs directly

### Verification
1. Go to "Verify ID" page
2. Enter UUID or Employee ID
3. View verification results
4. Check ID status and details

## API Endpoints

### Employee/ID Endpoints
- `POST /api/employees` - Create new employee/intern
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get specific employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `GET /api/verify/:uuid` - Verify ID by UUID

### Offer Letter Endpoints
- `POST /api/offer-letters/upload-excel` - Upload Excel for staging
- `GET /api/offer-letters/staging` - Get staged data
- `POST /api/offer-letters/generate` - Generate offer letters from staging
- `POST /api/offer-letters/create-single` - Create individual offer letter
- `GET /api/offer-letters` - Get all offer letters
- `GET /api/offer-letters/verify/:offerNumber` - Verify offer letter (public)
- `GET /api/offer-letters/export` - Export offer letters
- `GET /api/offer-letters/batches` - Get batch information

## ID Format

### Employee ID
- Format: `SWT-25-EMP-0XXX`
- Example: `SWT-25-EMP-0001`

### Intern ID
- Format: `SWT-25-INT-0XXX`
- Example: `SWT-25-INT-0001`

### Offer Letter Number
- Format: `OL-YYYY-XXXXXX`
- Example: `OL-2024-123456`
- YYYY: Current year
- XXXXXX: Last 6 digits of timestamp (ensures uniqueness)

## QR Code Integration

Each ID includes a QR code that contains:
- Verification URL: `https://verify.saralworkstechnologies.info/verify/{UUID}` (use `http://localhost:9090/verify/{UUID}` during local development)
- Direct access to verification page
- Real-time status checking

## Security Features

- UUID-based verification
- Unique offer letter numbers (immutable, database-enforced)
- Secure file upload handling
- Input validation
- CORS protection
- SQL injection prevention
- SHA-256 file hash verification
- Public data control (sensitive data protected)
- Transaction-based generation (all-or-nothing)

## Documentation

- [Main README](README.md) - This file
- [Offer Letter Guide](OFFER_LETTER_GUIDE.md) - Detailed offer letter feature documentation
- [Implementation Complete](IMPLEMENTATION_COMPLETE.md) - Certificate system documentation
- [Security Audit](SECURITY_AUDIT.md) - Security features and best practices

## Future Enhancements

- Cryptographic signatures
- Blockchain integration
- Bulk CSV upload
- PDF export functionality
- Advanced template designer
- Role-based access control
- Email notifications
- Audit logging