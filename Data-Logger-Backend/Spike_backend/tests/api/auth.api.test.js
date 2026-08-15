import request from 'supertest';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoMock, resetAllAwsMocks } from '../setup/awsMock.js';
import app from '../../app.js';

beforeEach(() => resetAllAwsMocks());

describe('POST /api/v1/auth/register', () => {
  it('rejects an invalid email with a 422 validation envelope', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Ada', email: 'not-an-email', password: 'SuperSecret123' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('rejects a password under 8 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'short1' });

    expect(res.status).toBe(422);
  });

  it('rejects a password with no digit', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'nodigitshere' });

    expect(res.status).toBe(422);
  });

  it('succeeds with a valid payload and always assigns viewer, even if a role is smuggled in', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [] });
    dynamoMock.on(PutCommand).resolves({});

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'SuperSecret123', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('viewer');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });
});

describe('POST /api/v1/auth/login', () => {
  it('rejects a missing body with a 422, not a 500', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(422);
  });
});

describe('protected routes without a token', () => {
  it.each([
    ['/api/v1/auth/me'],
    ['/api/v1/users/profile'],
    ['/api/v1/devices'],
  ])('GET %s returns 401 UNAUTHORIZED', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });
});

describe('protected routes with a garbage token', () => {
  it('returns 401 TOKEN_INVALID, not a 500', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('TOKEN_INVALID');
  });
});

describe('unknown route', () => {
  it('returns a 404 in the standard error envelope, not an Express default HTML page', async () => {
    const res = await request(app).get('/api/v1/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
