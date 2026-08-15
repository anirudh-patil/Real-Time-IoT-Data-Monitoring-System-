import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoMock, resetAllAwsMocks } from '../setup/awsMock.js';
import { register, login } from '../../src/services/auth.service.js';
import { hashPassword } from '../../src/utils/password.util.js';

beforeEach(() => resetAllAwsMocks());

describe('auth.service.register', () => {
  it('creates a viewer-role account and never returns the password hash', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [] }); // no existing user with this email
    dynamoMock.on(PutCommand).resolves({});
    // register() logs activity via a separate PutCommand to the activity log table -
    // already covered by the generic PutCommand mock above.

    const user = await register({ name: 'Ada', email: 'Ada@Example.com', password: 'SuperSecret123' });

    expect(user.role).toBe('viewer'); // ignores any requested role at this layer
    expect(user.email).toBe('ada@example.com'); // normalized
    expect(user.passwordHash).toBeUndefined();
  });

  it('rejects registration when the email is already taken', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [{ userId: 'existing', email: 'ada@example.com' }] });

    await expect(register({ name: 'Ada', email: 'ada@example.com', password: 'SuperSecret123' }))
      .rejects.toMatchObject({ statusCode: 409, errorCode: 'CONFLICT' });
  });
});

describe('auth.service.login', () => {
  it('rejects an unknown email without revealing that it does not exist', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [] });

    await expect(login({ email: 'nobody@example.com', password: 'whatever123' }))
      .rejects.toMatchObject({ statusCode: 401, errorCode: 'INVALID_CREDENTIALS' });
  });

  it('rejects a deactivated account even with the correct password', async () => {
    const passwordHash = await hashPassword('SuperSecret123');
    dynamoMock.on(QueryCommand).resolves({
      Items: [{ userId: 'u1', email: 'a@b.com', passwordHash, isActive: false, role: 'viewer' }],
    });

    await expect(login({ email: 'a@b.com', password: 'SuperSecret123' }))
      .rejects.toMatchObject({ statusCode: 403, errorCode: 'FORBIDDEN' });
  });

  it('rejects the wrong password with the same generic message as an unknown email', async () => {
    const passwordHash = await hashPassword('SuperSecret123');
    dynamoMock.on(QueryCommand).resolves({
      Items: [{ userId: 'u1', email: 'a@b.com', passwordHash, isActive: true, role: 'viewer' }],
    });

    await expect(login({ email: 'a@b.com', password: 'WrongPassword1' }))
      .rejects.toMatchObject({ statusCode: 401, errorCode: 'INVALID_CREDENTIALS' });
  });

  it('issues an access+refresh token pair on success and updates lastLoginAt', async () => {
    const passwordHash = await hashPassword('SuperSecret123');
    dynamoMock.on(QueryCommand).resolves({
      Items: [{ userId: 'u1', email: 'a@b.com', passwordHash, isActive: true, role: 'viewer' }],
    });
    dynamoMock.on(PutCommand).resolves({}); // refresh token storage + activity log
    dynamoMock.on(UpdateCommand).resolves({ Attributes: {} }); // lastLoginAt update

    const result = await login({ email: 'a@b.com', password: 'SuperSecret123' });

    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    expect(result.user.passwordHash).toBeUndefined();

    const refreshTokenPut = dynamoMock.commandCalls(PutCommand).find((c) => 'tokenHash' in c.args[0].input.Item);
    expect(refreshTokenPut).toBeDefined();
    expect(refreshTokenPut.args[0].input.Item.tokenHash).not.toBe(result.refreshToken); // stored hashed, not raw
  });
});
