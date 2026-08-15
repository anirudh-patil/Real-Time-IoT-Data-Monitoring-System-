import { hashPassword, comparePassword } from '../../src/utils/password.util.js';

describe('password.util', () => {
  it('hashes a password using bcrypt', async () => {
    const hash = await hashPassword('SuperSecret123');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toBe('SuperSecret123');
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('SuperSecret123');
    await expect(comparePassword('SuperSecret123', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('SuperSecret123');
    await expect(comparePassword('WrongPassword1', hash)).resolves.toBe(false);
  });

  it('produces a different hash each time (salted)', async () => {
    const hashA = await hashPassword('SuperSecret123');
    const hashB = await hashPassword('SuperSecret123');
    expect(hashA).not.toBe(hashB);
  });
});
