import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.config.js';

/**
 * Same policy as aws.config.js: this backend only PutObject/DeleteObject's
 * into an existing bucket. It never issues CreateBucketCommand.
 * The bucket (env.s3.bucket) must already exist and, for the simple public
 * URL scheme used in user.service.js, allow public-read on the
 * `profile-images/*` prefix (or be fronted by CloudFront). If you'd rather
 * keep the bucket private, swap the URL builder in user.service.js for a
 * presigned GetObject URL instead - the S3 client here supports either.
 */
const s3ClientConfig = { region: env.aws.region };

if (env.aws.accessKeyId && env.aws.secretAccessKey) {
  s3ClientConfig.credentials = {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  };
}

export const s3Client = new S3Client(s3ClientConfig);
export const profileImagesBucket = env.s3.bucket;
