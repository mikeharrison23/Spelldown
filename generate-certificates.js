const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

// Generate self-signed certificate
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, {
  algorithm: 'sha256',
  days: 365,
  keySize: 2048,
  extensions: [
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 2, // DNS
          value: 'localhost'
        },
        {
          type: 2,
          value: '69.162.238.181'
        }
      ]
    }
  ]
});

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

// Write certificate files
fs.writeFileSync(path.join(certsDir, 'key.pem'), pems.private);
fs.writeFileSync(path.join(certsDir, 'cert.pem'), pems.cert);

console.log('SSL certificates generated successfully!');
