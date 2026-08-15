import { mockClient } from 'aws-sdk-client-mock';
import { dynamoDocClient } from '../../src/config/aws.config.js';
import rawDynamoClient from '../../src/config/aws.config.js';
import { s3Client } from '../../src/config/s3.config.js';

/**
 * Mocking at the AWS SDK client boundary (rather than mocking our own
 * repository/service modules) means every layer above it - repositories,
 * services, controllers - runs its REAL code. Only the actual network
 * call to AWS is intercepted. This is what the spec means by "mock AWS
 * services where applicable": the app's own logic isn't mocked, AWS is.
 */
export const dynamoMock = mockClient(dynamoDocClient);
export const rawDynamoMock = mockClient(rawDynamoClient);
export const s3Mock = mockClient(s3Client);

export function resetAllAwsMocks() {
  dynamoMock.reset();
  rawDynamoMock.reset();
  s3Mock.reset();
}
