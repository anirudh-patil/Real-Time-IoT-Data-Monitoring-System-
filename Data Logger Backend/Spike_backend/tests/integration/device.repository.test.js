import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoMock, resetAllAwsMocks } from '../setup/awsMock.js';
import { findDevicesByOwner, listAllDevices } from '../../src/repositories/device.repository.js';

beforeEach(() => resetAllAwsMocks());

describe('device.repository (DynamoDB mocked)', () => {
  it('findDevicesByOwner queries the OwnerIndex GSI for the given owner', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [{ deviceId: 'd1', ownerId: 'u1' }] });

    const result = await findDevicesByOwner('u1', { limit: 20 });

    expect(result.items).toHaveLength(1);
    const call = dynamoMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.IndexName).toBe('OwnerIndex');
    expect(call.args[0].input.ExpressionAttributeValues[':ownerId']).toBe('u1');
  });

  it('listAllDevices scans the whole table (admin/engineer path)', async () => {
    dynamoMock.on(ScanCommand).resolves({ Items: [{ deviceId: 'd1' }, { deviceId: 'd2' }] });

    const result = await listAllDevices({ limit: 100 });

    expect(result.items).toHaveLength(2);
  });
});
