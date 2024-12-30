const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Common proxy options
  const proxyConfig = {
    target: 'http://192.168.86.59:3001',
    changeOrigin: true,
    secure: false,
    ws: true,
    xfwd: true,
    logLevel: 'debug',
    headers: {
      'Access-Control-Allow-Origin': [
        'http://localhost:3000',
        'http://192.168.86.59:3000',
        'http://127.0.0.1:3000'
      ],
      'Access-Control-Allow-Credentials': 'true'
    },
    onError: (err, req, res) => {
      console.error('Proxy Error:', err);
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': req.headers.origin,
          'Access-Control-Allow-Credentials': 'true'
        });
        res.end(JSON.stringify({ 
          error: 'Proxy Error', 
          message: err.message 
        }));
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('origin', req.headers.origin);
      console.log('Proxying:', req.method, req.url);
    },
    onProxyRes: (proxyRes, req, res) => {
      proxyRes.headers['access-control-allow-origin'] = req.headers.origin;
      proxyRes.headers['access-control-allow-credentials'] = 'true';
      console.log('Proxy response:', proxyRes.statusCode, req.url);
    }
  };

  // Root path proxy (for the React app)
  app.use('/', createProxyMiddleware({
    ...proxyConfig,
    pathRewrite: {
      '^/': '/'
    }
  }));

  // Socket.IO proxy
  app.use('/socket.io', createProxyMiddleware({
    ...proxyConfig,
    ws: true,
    headers: {
      ...proxyConfig.headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization'
    }
  }));

  // API proxy
  app.use('/api', createProxyMiddleware({
    ...proxyConfig,
    pathRewrite: {
      '^/api': '/api'
    }
  }));
};
