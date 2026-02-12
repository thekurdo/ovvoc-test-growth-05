/**
 * Chat server entry point.
 * Uses socket.io 3.x — see handlers.js for v3-specific API usage.
 */

const http = require('http');
const { Server } = require('socket.io');
const { setupHandlers, authMiddleware } = require('./handlers');

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  // socket.io 3 option — allowEIO3 was added for backward compat
  allowEIO3: true,
});

// Apply auth middleware (v3 style — string errors)
io.use(authMiddleware);

// Handle new connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.username})`);
  setupHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`Chat server listening on port ${PORT}`);
});

module.exports = { httpServer, io };
