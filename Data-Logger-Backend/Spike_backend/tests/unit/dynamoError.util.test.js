import { withDynamoErrors } from '../../src/utils/dynamoError.util.js';
import { HTTP_STATUS } from '../../src/constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../src/constants/errorCodes.js';

function fakeAwsError(name, message = 'boom') {
  const err = new Error(message);
  err.name = name;
  return err;
}

describe('dynamoError.util', () => {
  it('passes through a successful operation untouched', async () => {
    const result = await withDynamoErrors(async () => 'ok');
    expect(result).toBe('ok');
  });

  it.each([
    ['ConditionalCheckFailedException', HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT],
    ['ResourceNotFoundException', HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.SERVICE_UNAVAILABLE],
    ['ProvisionedThroughputExceededException', HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMIT_EXCEEDED],
    ['ValidationException', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR],
  ])('translates %s to statusCode %i / %s', async (awsErrorName, statusCode, errorCode) => {
    await expect(withDynamoErrors(async () => { throw fakeAwsError(awsErrorName); }))
      .rejects.toMatchObject({ statusCode, errorCode });
  });

  it('falls back to a 500 AWS_ERROR for unmodeled AWS errors', async () => {
    await expect(withDynamoErrors(async () => { throw fakeAwsError('SomeWeirdUnmodeledError', 'network blip'); }))
      .rejects.toMatchObject({ statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode: ERROR_CODES.AWS_ERROR });
  });
});
