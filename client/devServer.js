const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors({
  origin: true,
  credentials: true
}));

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Serve the React app for all routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Development server running at:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://192.168.86.59:${PORT}`);
});
