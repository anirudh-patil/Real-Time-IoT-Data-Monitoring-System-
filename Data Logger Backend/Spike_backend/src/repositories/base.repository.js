import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../config/aws.config.js';
import { withDynamoErrors } from '../utils/dynamoError.util.js';

/**
 * Every table-specific repository (user, device, refreshToken,
 * activityLog...) wraps one of these instead of hand-rolling DynamoDB
 * commands. Keeps "only database access, no business logic" (spec section
 * 4) consistent and gives every table the same error translation for free.
 */
export function createBaseRepository(tableName) {
  return {
    async getItem(key) {
      return withDynamoErrors(async () => {
        const result = await dynamoDocClient.send(new GetCommand({ TableName: tableName, Key: key }));
        return result.Item || null;
      });
    },

    async putItem(item, { preventOverwrite = false, overwriteKeyField } = {}) {
      return withDynamoErrors(async () => {
        const command = new PutCommand({
          TableName: tableName,
          Item: item,
          ...(preventOverwrite
            ? { ConditionExpression: `attribute_not_exists(${overwriteKeyField})` }
            : {}),
        });
        await dynamoDocClient.send(command);
        return item;
      });
    },

    async updateItem(key, updates) {
      return withDynamoErrors(async () => {
        const entries = Object.entries(updates);
        if (entries.length === 0) return this.getItem(key);

        const updateExpressionParts = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        entries.forEach(([field, value], idx) => {
          const nameKey = `#f${idx}`;
          const valueKey = `:v${idx}`;
          updateExpressionParts.push(`${nameKey} = ${valueKey}`);
          expressionAttributeNames[nameKey] = field;
          expressionAttributeValues[valueKey] = value;
        });

        const result = await dynamoDocClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: key,
            UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
          })
        );
        return result.Attributes;
      });
    },

    async deleteItem(key) {
      return withDynamoErrors(async () => {
        await dynamoDocClient.send(new DeleteCommand({ TableName: tableName, Key: key }));
      });
    },

    async query({ indexName, keyConditionExpression, expressionAttributeValues, limit, cursor, scanIndexForward } = {}) {
      return withDynamoErrors(async () => {
        const result = await dynamoDocClient.send(
          new QueryCommand({
            TableName: tableName,
            IndexName: indexName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            Limit: limit,
            ExclusiveStartKey: cursor,
            ScanIndexForward: scanIndexForward,
          })
        );
        return { items: result.Items || [], nextCursor: result.LastEvaluatedKey || null };
      });
    },

    async scan({ limit, cursor } = {}) {
      return withDynamoErrors(async () => {
        const result = await dynamoDocClient.send(
          new ScanCommand({ TableName: tableName, Limit: limit, ExclusiveStartKey: cursor })
        );
        return { items: result.Items || [], nextCursor: result.LastEvaluatedKey || null };
      });
    },
  };
}
