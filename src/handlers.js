/**
 * Socket.io event handlers for the chat server.
 *
 * ⚠️  SOCKET.IO 3.x PATTERNS — These use APIs that changed in socket.io 4:
 *
 *   1. io.allSockets()         → In v4, renamed to io.fetchSockets() which
 *                                 returns full Socket objects instead of Set<SocketId>.
 *
 *   2. next('string error')    → In v4, middleware must pass Error objects:
 *                                 next(new Error('message')), not plain strings.
 *
 *   3. socket.rooms is a Set   → Same in v4, but adapter methods changed.
 *
 *   4. io.to(room).allSockets()→ In v4, use io.in(room).fetchSockets().
 *
 *   5. Callback error pattern  → In v4, use socket.emitWithAck() for promises.
 */

const { createRoom, addUser, removeUser, addMessage, getMessages } = require('./chat');

// In-memory room store (would be Redis in production)
const rooms = new Map();

/**
 * Authentication middleware — socket.io 3 style.
 * In v3, passing a string to next() works as an error.
 * In v4, this MUST be next(new Error('...')) or the client won't receive it.
 */
function authMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    // socket.io 3 pattern: passing string to next()
    // In v4 this should be: next(new Error('Authentication failed: no token'))
    next('Authentication failed: no token provided');
    return;
  }

  if (typeof token !== 'string' || token.length < 8) {
    next('Authentication failed: invalid token format');
    return;
  }

  // Simulate token decode (in production, verify JWT)
  socket.userId = `user_${token.slice(0, 8)}`;
  socket.username = socket.handshake.auth?.username || 'anonymous';
  next();
}

/**
 * Get all connected socket IDs — socket.io 3 style.
 * Uses io.allSockets() which returns a Set<SocketId>.
 * In v4 this is renamed to io.fetchSockets() and returns Socket objects.
 */
async function getConnectedUsers(io) {
  // socket.io 3.x API — allSockets() returns Set of socket IDs
  // In v4: const sockets = await io.fetchSockets();
  //        return sockets.map(s => s.id);
  const socketIds = await io.allSockets();
  return Array.from(socketIds);
}

/**
 * Get all socket IDs in a specific room — socket.io 3 style.
 * In v4, io.in(room).fetchSockets() returns full socket objects.
 */
async function getRoomMembers(io, roomName) {
  // socket.io 3.x API
  // In v4: const sockets = await io.in(roomName).fetchSockets();
  //        return sockets.map(s => ({ id: s.id, userId: s.data.userId }));
  const socketIds = await io.to(roomName).allSockets();
  return Array.from(socketIds);
}

/**
 * Set up all event handlers for a connected socket.
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {import('socket.io').Socket} socket - Connected socket
 */
function setupHandlers(io, socket) {
  const { userId, username } = socket;

  // --- Join Room ---
  socket.on('join-room', async (roomName, callback) => {
    try {
      if (!rooms.has(roomName)) {
        const room = createRoom(roomName, userId);
        rooms.set(roomName, room);
      }

      const room = rooms.get(roomName);
      addUser(room, { id: userId, username });
      socket.join(roomName);

      // Notify others in the room
      socket.to(roomName).emit('user-joined', { userId, username });

      // Send room history to the joining user
      const messages = getMessages(room, 100);

      // socket.io 3 pattern: get member count via allSockets()
      // In v4: const members = await io.in(roomName).fetchSockets();
      const memberIds = await io.to(roomName).allSockets();

      if (typeof callback === 'function') {
        callback({
          success: true,
          messages,
          memberCount: memberIds.size,
        });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // --- Send Message ---
  socket.on('send-message', (roomName, text, callback) => {
    try {
      const room = rooms.get(roomName);
      if (!room) {
        throw new Error(`Room ${roomName} does not exist`);
      }

      const message = addMessage(room, userId, text);

      // Broadcast to all in room (including sender)
      io.to(roomName).emit('new-message', {
        ...message,
        username,
      });

      if (typeof callback === 'function') {
        callback({ success: true, messageId: message.id });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // --- Leave Room ---
  socket.on('leave-room', (roomName, callback) => {
    try {
      const room = rooms.get(roomName);
      if (room) {
        removeUser(room, userId);
        socket.leave(roomName);
        socket.to(roomName).emit('user-left', { userId, username });
      }

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // --- List Connected Users (v3 API) ---
  socket.on('list-users', async (callback) => {
    try {
      // socket.io 3 pattern
      const users = await getConnectedUsers(io);
      if (typeof callback === 'function') {
        callback({ success: true, users });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    // Clean up user from all rooms
    for (const [roomName, room] of rooms.entries()) {
      if (room.users.has(userId)) {
        try {
          removeUser(room, userId);
          socket.to(roomName).emit('user-left', { userId, username });
        } catch {
          // Already removed, ignore
        }

        // Delete empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomName);
        }
      }
    }
  });
}

module.exports = {
  setupHandlers,
  authMiddleware,
  getConnectedUsers,
  getRoomMembers,
  rooms,
};
