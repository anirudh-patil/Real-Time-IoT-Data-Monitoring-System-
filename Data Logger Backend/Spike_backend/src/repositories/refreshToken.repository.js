import { dynamoTables } from '../config/aws.config.js';
import { createBaseRepository } from './base.repository.js';

/**
 * Expected table schema for `env.dynamodb.refreshTokensTable` (must already
 * exist - this backend never issues CreateTableCommand):
 *
 *   Partition key: tokenId (String)
 *   GSI:           UserIdIndex (partition key: userId)
 *   TTL attribute: expiresAt (Number, epoch seconds) - recommended so
 *                  DynamoDB auto-expires old tokens, but revocation is
 *                  still enforced explicitly via the `revoked` flag since
 *                  DynamoDB TTL deletion is not instantaneous.
 *
 * Item shape:
 *   { tokenId, userId, tokenHash, expiresAt, revoked, createdAt, userAgent, ip }
 */

const USER_ID_INDEX = 'UserIdIndex';
const repo = createBaseRepository(dynamoTables.refreshTokens);

export async function storeRefreshToken(tokenRecord) {
  return repo.putItem(tokenRecord);
}

export async function findRefreshTokenById(tokenId) {
  return repo.getItem({ tokenId });
}

export async function revokeRefreshToken(tokenId) {
  return repo.updateItem({ tokenId }, { revoked: true });
}

export async function findRefreshTokensByUserId(userId) {
  const { items } = await repo.query({
    indexName: USER_ID_INDEX,
    keyConditionExpression: 'userId = :userId',
    expressionAttributeValues: { ':userId': userId },
  });
  return items;
}

export async function revokeAllRefreshTokensForUser(userId) {
  const tokens = await findRefreshTokensByUserId(userId);
  const active = tokens.filter((t) => !t.revoked);
  await Promise.all(active.map((t) => revokeRefreshToken(t.tokenId)));
}
