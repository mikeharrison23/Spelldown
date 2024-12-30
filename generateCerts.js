const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create cert directory if it doesn't exist
const certDir = path.join(__dirname, 'cert');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

// Generate self-signed certificate using OpenSSL
const openssl = process.platform === 'win32' ? 'openssl.exe' : 'openssl';

try {
  // Generate private key
  execSync(`${openssl} genrsa -out ${path.join(certDir, 'key.pem')} 2048`);
  
  // Generate certificate
  execSync(`${openssl} req -new -x509 -key ${path.join(certDir, 'key.pem')} -out ${path.join(certDir, 'cert.pem')} -days 365 -subj "/CN=localhost"`);
  
  console.log('SSL certificates generated successfully');
} catch (err) {
  console.error('Error generating certificates:', err);
  
  // Create dummy certificates for development
  const dummyKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAvxVG8ZE...\n-----END RSA PRIVATE KEY-----\n';
  const dummyCert = '-----BEGIN CERTIFICATE-----\nMIIDpTCCAo2gAwIBAgIUJ...\n-----END CERTIFICATE-----\n';
  
  fs.writeFileSync(path.join(certDir, 'key.pem'), dummyKey);
  fs.writeFileSync(path.join(certDir, 'cert.pem'), dummyCert);
  
  console.log('Dummy certificates created for development');
}
