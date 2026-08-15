import request from 'supertest';
import { resetAllAwsMocks } from '../setup/awsMock.js';
import app from '../../app.js';
import { generateAccessToken } from '../../src/utils/token.util.js';

beforeEach(() => resetAllAwsMocks());

function tokenFor(role) {
  return generateAccessToken({ userId: 'u1', email: 'u1@example.com', role });
}

describe('RBAC across admin-only routes', () => {
  it.each([
    ['GET', '/api/v1/users'],
    ['PATCH', '/api/v1/alerts/a1/resolve'],
    ['PATCH', '/api/v1/devices/d1/heartbeat'],
  ])('%s %s is rejected for a viewer with 403 FORBIDDEN', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path).set('Authorization', `Bearer ${tokenFor('viewer')}`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('FORBIDDEN');
  });

  it('an engineer IS allowed through the heartbeat route (Admin/Engineer only, not Admin-only)', async () => {
    const res = await request(app)
      .patch('/api/v1/devices/d1/heartbeat')
      .set('Authorization', `Bearer ${tokenFor('engineer')}`)
      .send({});
    // Passes the RBAC gate and reaches the service layer - it may still
    // fail downstream against the mocked DynamoDB (device not found), but
    // must NOT be a 403.
    expect(res.status).not.toBe(403);
  });

  it('a viewer IS allowed through their own profile route (no role gate)', async () => {
    const res = await request(app).get('/api/v1/users/profile').set('Authorization', `Bearer ${tokenFor('viewer')}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
