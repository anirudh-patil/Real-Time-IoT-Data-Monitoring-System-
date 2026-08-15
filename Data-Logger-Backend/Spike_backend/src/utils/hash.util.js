import { createHash } from 'crypto';

/**
 * We never store raw refresh tokens in DynamoDB - only a SHA-256 hash.
 * This way a DynamoDB read/backup leak doesn't hand out usable tokens.
 */
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
