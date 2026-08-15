import { encodeCursor, decodeCursor } from '../../src/utils/pagination.util.js';
import { AppError } from '../../src/utils/apiResponse.js';

describe('pagination.util', () => {
  it('round-trips a DynamoDB-shaped key through encode/decode', () => {
    const key = { userId: 'u1', createdAt: '2026-07-21T00:00:00.000Z' };
    const cursor = encodeCursor(key);
    expect(typeof cursor).toBe('string');
    expect(decodeCursor(cursor)).toEqual(key);
  });

  it('returns null when encoding a null/undefined key (no more pages)', () => {
    expect(encodeCursor(null)).toBeNull();
    expect(encodeCursor(undefined)).toBeNull();
  });

  it('returns undefined when decoding an absent cursor', () => {
    expect(decodeCursor(undefined)).toBeUndefined();
    expect(decodeCursor(null)).toBeUndefined();
  });

  it('throws a clean AppError on a malformed cursor instead of crashing', () => {
    expect(() => decodeCursor('not-valid-base64-json!!!')).toThrow(AppError);
  });

  it('does not leak the raw DynamoDB key shape as plain JSON in the token', () => {
    const cursor = encodeCursor({ userId: 'secret-shaped-key' });
    expect(cursor).not.toContain('userId');
  });
});
