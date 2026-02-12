const { setupHandlers, authMiddleware, getConnectedUsers, getRoomMembers } = require('../src/handlers');

describe('handler exports', () => {
  test('setupHandlers is a function', () => {
    expect(typeof setupHandlers).toBe('function');
  });

  test('authMiddleware is a function', () => {
    expect(typeof authMiddleware).toBe('function');
  });

  test('getConnectedUsers is a function', () => {
    expect(typeof getConnectedUsers).toBe('function');
  });

  test('getRoomMembers is a function', () => {
    expect(typeof getRoomMembers).toBe('function');
  });
});

describe('authMiddleware', () => {
  test('rejects missing token with string error (v3 pattern)', () => {
    const socket = { handshake: { auth: {} } };
    const next = jest.fn();

    authMiddleware(socket, next);

    // In socket.io 3, next() receives a plain string — not an Error object.
    // This is one of the breaking changes in v4.
    expect(next).toHaveBeenCalledWith('Authentication failed: no token provided');
    expect(typeof next.mock.calls[0][0]).toBe('string');
  });

  test('rejects short token with string error', () => {
    const socket = { handshake: { auth: { token: 'short' } } };
    const next = jest.fn();

    authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith('Authentication failed: invalid token format');
  });

  test('accepts valid token and sets userId/username', () => {
    const socket = {
      handshake: { auth: { token: 'abcdefgh12345', username: 'alice' } },
    };
    const next = jest.fn();

    authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.userId).toBe('user_abcdefgh');
    expect(socket.username).toBe('alice');
  });
});
