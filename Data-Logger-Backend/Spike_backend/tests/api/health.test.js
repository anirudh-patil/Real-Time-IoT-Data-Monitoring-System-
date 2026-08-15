import request from 'supertest';
import { ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { rawDynamoMock, resetAllAwsMocks } from '../setup/awsMock.js';
import app from '../../app.js';

beforeEach(() => resetAllAwsMocks());

describe('GET /health', () => {
  it('reports ok when DynamoDB is reachable', async () => {
    rawDynamoMock.on(ListTablesCommand).resolves({ TableNames: [] });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.dynamodb.status).toBe('ok');
  });

  it('reports degraded (503) when DynamoDB is unreachable', async () => {
    rawDynamoMock.on(ListTablesCommand).rejects(new Error('connection refused'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.dynamodb.status).toBe('error');
  });

  it('response always carries the standard envelope fields', async () => {
    rawDynamoMock.on(ListTablesCommand).resolves({ TableNames: [] });
    const res = await request(app).get('/health');

    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('requestId');
  });
});
