import { PutCommand, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoMock, resetAllAwsMocks } from '../setup/awsMock.js';
import { evaluateReading } from '../../src/services/alert.service.js';

const device = { deviceId: 'd1', name: 'Substation-12', ownerId: 'u1' };

beforeEach(() => {
  resetAllAwsMocks();
  // findUserById (used by the notification step that fires after every
  // raised/resolved alert) issues a GetCommand against the users table -
  // not asserted on directly here, just needs to resolve without throwing.
  dynamoMock.on(GetCommand).resolves({ Item: { userId: 'u1', email: 'owner@example.com' } });
});

describe('alert.service.evaluateReading', () => {
  it('raises a HIGH_VOLTAGE alert when voltage exceeds the configured max', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [] }); // no existing active alert
    dynamoMock.on(PutCommand).resolves({});

    await evaluateReading(device, { voltage: 260, current: 5, temperature: 30 });

    const alertPut = dynamoMock.commandCalls(PutCommand).find((c) => c.args[0].input.Item.type === 'HIGH_VOLTAGE');
    expect(alertPut).toBeDefined();
    expect(alertPut.args[0].input.Item.status).toBe('active');
    expect(alertPut.args[0].input.Item.severity).toBe('critical');
  });

  it('does not raise a duplicate alert while the condition persists', async () => {
    // Simulate an already-active HIGH_VOLTAGE alert for this device.
    dynamoMock.on(QueryCommand).resolves({
      Items: [{ alertId: 'existing', deviceId: 'd1', type: 'HIGH_VOLTAGE', status: 'active' }],
    });
    dynamoMock.on(PutCommand).resolves({});

    await evaluateReading(device, { voltage: 260, current: 5, temperature: 30 });

    const newAlertPuts = dynamoMock.commandCalls(PutCommand).filter((c) => c.args[0].input.Item.type === 'HIGH_VOLTAGE');
    expect(newAlertPuts).toHaveLength(0); // no new alert created, existing one reused
  });

  it('auto-resolves a HIGH_VOLTAGE alert once voltage returns to normal', async () => {
    dynamoMock.on(QueryCommand).resolves({
      Items: [{ alertId: 'existing', deviceId: 'd1', type: 'HIGH_VOLTAGE', status: 'active' }],
    });
    dynamoMock.on(UpdateCommand).resolves({ Attributes: {} });

    await evaluateReading(device, { voltage: 230, current: 5, temperature: 30 }); // back in range

    const resolveCall = dynamoMock.commandCalls(UpdateCommand).find((c) => c.args[0].input.Key.alertId === 'existing');
    expect(resolveCall).toBeDefined();
    expect(resolveCall.args[0].input.ExpressionAttributeValues[':v0']).toBe('resolved');
  });

  it('does not raise any alert for a reading fully within all thresholds', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [] });
    dynamoMock.on(PutCommand).resolves({});

    await evaluateReading(device, { voltage: 230, current: 5, temperature: 40 });

    const anyAlertPut = dynamoMock.commandCalls(PutCommand).find((c) => 'type' in (c.args[0].input.Item || {}));
    expect(anyAlertPut).toBeUndefined();
  });

  it('raises independent alerts for simultaneous multi-field breaches', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [] });
    dynamoMock.on(PutCommand).resolves({});

    await evaluateReading(device, { voltage: 260, current: 15, temperature: 70 });

    const types = dynamoMock.commandCalls(PutCommand).map((c) => c.args[0].input.Item?.type).filter(Boolean);
    expect(types).toEqual(expect.arrayContaining(['HIGH_VOLTAGE', 'HIGH_CURRENT', 'HIGH_TEMPERATURE']));
  });
});
