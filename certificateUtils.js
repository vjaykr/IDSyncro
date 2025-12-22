const crypto = require('crypto');

// Generate unique certificate ID
function generateCertificateId(type) {
  const year = new Date().getFullYear().toString().slice(-2);
  const typeCode = type === 'employee' ? 'EMP' : 'INT';
  
  // 8-digit secure random number
  const numericPart = crypto.randomInt(10000000, 99999999).toString();
  
  // 4-char alphanumeric salt
  const alphaPart = crypto.randomBytes(2).toString('hex').toUpperCase().substring(0, 4);
  
  return `CERT-${typeCode}-${year}-${numericPart}-${alphaPart}`;
}

// Canonicalize certificate data
function canonicalizeCertificateData(data) {
  const canonical = {};
  const keys = Object.keys(data).sort();
  
  keys.forEach(key => {
    const value = data[key];
    if (value !== null && value !== undefined && value !== '') {
      canonical[key] = typeof value === 'string' ? value.trim() : value;
    }
  });
  
  return JSON.stringify(canonical);
}

// Generate SHA-256 fingerprint
function generateFingerprint(canonicalData) {
  return crypto.createHash('sha256').update(canonicalData).digest('hex');
}

// Sign fingerprint with private key
function signFingerprint(fingerprint, privateKey) {
  const sign = crypto.createSign('SHA256');
  sign.update(fingerprint);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

// Verify signature
function verifySignature(fingerprint, signature, publicKey) {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(fingerprint);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  } catch (error) {
    return false;
  }
}

// Generate simple signing key pair (for demo - use proper key management in production)
function generateKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

module.exports = {
  generateCertificateId,
  canonicalizeCertificateData,
  generateFingerprint,
  signFingerprint,
  verifySignature,
  generateKeyPair
};
