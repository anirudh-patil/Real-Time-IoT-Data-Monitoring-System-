import { dynamoTables } from '../config/aws.config.js';
import { createBaseRepository } from './base.repository.js';

/**
 * Expected table schema for `env.dynamodb.usersTable` (must already exist -
 * this backend never issues CreateTableCommand):
 *
 *   Partition key: userId (String)
 *   GSI:           EmailIndex  (partition key: email)
 *
 * Item shape:
 *   {
 *     userId, email, passwordHash, name, role,
 *     isActive, createdAt, updatedAt, lastLoginAt
 *   }
 */

const EMAIL_INDEX = 'EmailIndex';
const repo = createBaseRepository(dynamoTables.users);

export async function createUser(user) {
  return repo.putItem(user, { preventOverwrite: true, overwriteKeyField: 'userId' });
}

export async function findUserById(userId) {
  return repo.getItem({ userId });
}

export async function findUserByEmail(email) {
  const { items } = await repo.query({
    indexName: EMAIL_INDEX,
    keyConditionExpression: 'email = :email',
    expressionAttributeValues: { ':email': email.toLowerCase() },
    limit: 1,
  });
  return items[0] || null;
}

export async function updateUser(userId, updates) {
  return repo.updateItem({ userId }, updates);
}

export async function deleteUser(userId) {
  return repo.deleteItem({ userId });
}

/**
 * Admin listing. Uses Scan since there's no access pattern requiring an
 * index for "all users" - fine at this table's expected scale.
 */
export async function listUsers({ limit = 20, cursor } = {}) {
  return repo.scan({ limit, cursor });
}
