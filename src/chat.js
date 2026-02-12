/**
 * Chat room management — pure functions for testability.
 * No socket.io dependency; these handle room/message state only.
 */

/**
 * Create a new chat room.
 * @param {string} name - Room name
 * @param {string} creator - User ID of room creator
 * @returns {{ name: string, creator: string, users: Map, messages: Array, createdAt: number }}
 */
function createRoom(name, creator) {
  if (!name || typeof name !== 'string') {
    throw new Error('Room name is required');
  }
  if (!creator || typeof creator !== 'string') {
    throw new Error('Creator is required');
  }

  return {
    name: name.trim(),
    creator,
    users: new Map(),
    messages: [],
    createdAt: Date.now(),
  };
}

/**
 * Add a user to a room.
 * @param {object} room - Room object
 * @param {{ id: string, username: string }} user - User to add
 * @returns {object} Updated room
 */
function addUser(room, user) {
  if (!user || !user.id || !user.username) {
    throw new Error('User must have id and username');
  }
  if (room.users.has(user.id)) {
    throw new Error(`User ${user.id} is already in room ${room.name}`);
  }

  room.users.set(user.id, {
    id: user.id,
    username: user.username,
    joinedAt: Date.now(),
  });

  return room;
}

/**
 * Remove a user from a room.
 * @param {object} room - Room object
 * @param {string} userId - ID of user to remove
 * @returns {object} Updated room
 */
function removeUser(room, userId) {
  if (!room.users.has(userId)) {
    throw new Error(`User ${userId} is not in room ${room.name}`);
  }

  room.users.delete(userId);
  return room;
}

/**
 * Get recent messages from a room.
 * @param {object} room - Room object
 * @param {number} [limit=50] - Maximum number of messages to return
 * @returns {Array} Recent messages (newest last)
 */
function getMessages(room, limit = 50) {
  if (limit <= 0) {
    return [];
  }
  return room.messages.slice(-limit);
}

/**
 * Add a message to a room.
 * @param {object} room - Room object
 * @param {string} userId - ID of the message author
 * @param {string} text - Message text
 * @returns {{ id: string, userId: string, text: string, timestamp: number }}
 */
function addMessage(room, userId, text) {
  if (!room.users.has(userId)) {
    throw new Error(`User ${userId} is not in room ${room.name}`);
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Message text cannot be empty');
  }

  const message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    text: text.trim(),
    timestamp: Date.now(),
  };

  room.messages.push(message);
  return message;
}

module.exports = {
  createRoom,
  addUser,
  removeUser,
  getMessages,
  addMessage,
};
