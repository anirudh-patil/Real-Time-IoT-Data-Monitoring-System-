import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from '../../src/utils/token.util.js';
import { AppError } from '../../src/utils/apiResponse.js';

describe('token.util', () => {
  describe('access tokens', () => {
    it('round-trips userId/email/role', () => {
      const token = generateAccessToken({ userId: 'u1', email: 'a@b.com', role: 'admin' });
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe('u1');
      expect(payload.email).toBe('a@b.com');
      expect(payload.role).toBe('admin');
    });

    it('rejects a garbage token', () => {
      expect(() => verifyAccessToken('not.a.jwt')).toThrow(AppError);
    });

    it('rejects a token signed with the wrong secret', () => {
      const foreignToken = generateRefreshToken({ userId: 'u1' }).token; // signed with refresh secret
      expect(() => verifyAccessToken(foreignToken)).toThrow(AppError);
    });
  });

  describe('refresh tokens', () => {
    it('embeds a unique tokenId (jti) usable for revocation lookups', () => {
      const { token, tokenId } = generateRefreshToken({ userId: 'u1' });
      const payload = verifyRefreshToken(token);
      expect(payload.jti).toBe(tokenId);
      expect(payload.sub).toBe('u1');
    });

    it('two refresh tokens for the same user get different tokenIds', () => {
      const a = generateRefreshToken({ userId: 'u1' });
      const b = generateRefreshToken({ userId: 'u1' });
      expect(a.tokenId).not.toBe(b.tokenId);
    });
  });

  describe('password reset tokens', () => {
    it('round-trips and carries the password_reset purpose claim', () => {
      const token = generatePasswordResetToken({ userId: 'u1' });
      const payload = verifyPasswordResetToken(token);
      expect(payload.sub).toBe('u1');
      expect(payload.purpose).toBe('password_reset');
    });

    it('rejects an access token presented as a reset token (purpose mismatch)', () => {
      const accessToken = generateAccessToken({ userId: 'u1', email: 'a@b.com', role: 'viewer' });
      expect(() => verifyPasswordResetToken(accessToken)).toThrow(AppError);
    });
  });
});
