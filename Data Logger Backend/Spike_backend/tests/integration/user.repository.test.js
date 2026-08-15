import { GetCommand, PutCommand, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoMock, resetAllAwsMocks } from '../setup/awsMock.js';
import {
  createUser,
  findUserById,
  findUserByEmail,
  updateUser,
  listUsers,
} from '../../src/repositories/user.repository.js';
import { AppError } from '../../src/utils/apiResponse.js';

beforeEach(() => resetAllAwsMocks());

describe('user.repository (DynamoDB mocked)', () => {
  it('createUser puts the item with a not-exists condition (no silent overwrite)', async () => {
    dynamoMock.on(PutCommand).resolves({});
    const user = { userId: 'u1', email: 'a@b.com' };

    await createUser(user);

    const call = dynamoMock.commandCalls(PutCommand)[0];
    expect(call.args[0].input.Item).toEqual(user);
    expect(call.args[0].input.ConditionExpression).toBe('attribute_not_exists(userId)');
  });

  it('createUser translates a duplicate-key condition failure into a 409 AppError', async () => {
    const conflict = new Error('conditional check failed');
    conflict.name = 'ConditionalCheckFailedException';
    dynamoMock.on(PutCommand).rejects(conflict);

    await expect(createUser({ userId: 'u1' })).rejects.toMatchObject({ statusCode: 409, errorCode: 'CONFLICT' });
  });

  it('findUserById returns null (not undefined/throw) when the item is missing', async () => {
    dynamoMock.on(GetCommand).resolves({});
    await expect(findUserById('missing')).resolves.toBeNull();
  });

  it('findUserByEmail queries the EmailIndex GSI and lowercases the input', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [{ userId: 'u1', email: 'a@b.com' }] });

    const result = await findUserByEmail('A@B.COM');

    expect(result.userId).toBe('u1');
    const call = dynamoMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.IndexName).toBe('EmailIndex');
    expect(call.args[0].input.ExpressionAttributeValues[':email']).toBe('a@b.com');
  });

  it('updateUser builds a correct SET expression for multiple fields', async () => {
    dynamoMock.on(UpdateCommand).resolves({ Attributes: { userId: 'u1', name: 'New Name' } });

    await updateUser('u1', { name: 'New Name', isActive: false });

    const call = dynamoMock.commandCalls(UpdateCommand)[0];
    expect(call.args[0].input.UpdateExpression).toContain('SET');
    expect(Object.values(call.args[0].input.ExpressionAttributeValues)).toEqual(
      expect.arrayContaining(['New Name', false])
    );
  });

  it('listUsers paginates via ExclusiveStartKey/LastEvaluatedKey', async () => {
    dynamoMock.on(ScanCommand).resolves({ Items: [{ userId: 'u1' }], LastEvaluatedKey: { userId: 'u1' } });

    const result = await listUsers({ limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toEqual({ userId: 'u1' });
  });

  it('an unmodeled AWS failure surfaces as an AppError, not a raw SDK exception', async () => {
    dynamoMock.on(GetCommand).rejects(new Error('network blip'));
    await expect(findUserById('u1')).rejects.toBeInstanceOf(AppError);
  });
});
