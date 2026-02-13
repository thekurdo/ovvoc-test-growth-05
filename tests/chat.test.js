const { createRoom, addUser, removeUser, getMessages, addMessage } = require('../src/chat');

describe('createRoom', () => {
  test('creates a room with correct properties', () => {
    const room = createRoom('general', 'user_1');
    expect(room.name).toBe('general');
    expect(room.creator).toBe('user_1');
    expect(room.users).toBeInstanceOf(Map);
    expect(room.users.size).toBe(0);
    expect(room.messages).toEqual([]);
    expect(typeof room.createdAt).toBe('number');
  });

  test('trims whitespace from room name', () => {
    const room = createRoom('  lobby  ', 'user_1');
    expect(room.name).toBe('lobby');
  });

  test('throws on empty name', () => {
    expect(() => createRoom('', 'user_1')).toThrow('Room name is required');
  });

  test('throws on missing creator', () => {
    expect(() => createRoom('test', '')).toThrow('Creator is required');
  });
});

describe('addUser / removeUser', () => {
  let room;

  beforeEach(() => {
    room = createRoom('test-room', 'creator_1');
  });

  test('adds a user to the room', () => {
    addUser(room, { id: 'u1', username: 'alice' });
    expect(room.users.size).toBe(1);
    expect(room.users.get('u1').username).toBe('alice');
    expect(typeof room.users.get('u1').joinedAt).toBe('number');
  });

  test('throws when adding duplicate user', () => {
    addUser(room, { id: 'u1', username: 'alice' });
    expect(() => addUser(room, { id: 'u1', username: 'alice' })).toThrow('already in room');
  });

  test('removes a user from the room', () => {
    addUser(room, { id: 'u1', username: 'alice' });
    removeUser(room, 'u1');
    expect(room.users.size).toBe(0);
  });

  test('throws when removing non-existent user', () => {
    expect(() => removeUser(room, 'ghost')).toThrow('not in room');
  });
});

describe('messages', () => {
  let room;

  beforeEach(() => {
    room = createRoom('chat', 'u1');
    addUser(room, { id: 'u1', username: 'alice' });
  });

  test('addMessage creates message with correct fields', () => {
    const msg = addMessage(room, 'u1', 'Hello world');
    expect(msg.userId).toBe('u1');
    expect(msg.text).toBe('Hello world');
    expect(msg.id).toMatch(/^msg_/);
    expect(typeof msg.timestamp).toBe('number');
    expect(room.messages).toHaveLength(1);
  });

  test('addMessage throws for non-member', () => {
    expect(() => addMessage(room, 'stranger', 'hi')).toThrow('not in room');
  });

  test('addMessage throws for empty text', () => {
    expect(() => addMessage(room, 'u1', '   ')).toThrow('empty');
  });

  test('getMessages returns limited results', () => {
    for (let i = 0; i < 10; i++) {
      addMessage(room, 'u1', `Message ${i}`);
    }
    const recent = getMessages(room, 3);
    expect(recent).toHaveLength(3);
    expect(recent[0].text).toBe('Message 7');
    expect(recent[2].text).toBe('Message 9');
  });

  test('getMessages defaults to 50', () => {
    for (let i = 0; i < 60; i++) {
      addMessage(room, 'u1', `m${i}`);
    }
    const msgs = getMessages(room);
    expect(msgs).toHaveLength(50);
    expect(msgs[0].text).toBe('m10');
  });

  test('getMessages with limit 0 returns empty', () => {
    addMessage(room, 'u1', 'hello');
    expect(getMessages(room, 0)).toEqual([]);
  });
});
