export class ApiError extends Error {
  status: number;
  errorCode: string;
  requestId?: string;
  constructor(opts: { message: string; status: number; errorCode?: string; requestId?: string }) {
    super(opts.message);
    this.name = "ApiError";
    this.status = opts.status;
    this.errorCode = opts.errorCode ?? "UNKNOWN";
    this.requestId = opts.requestId;
  }
  get isValidation() {
    return this.errorCode === "VALIDATION_ERROR";
  }
  get isForbidden() {
    return this.status === 403 || this.errorCode === "FORBIDDEN";
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isTokenExpired() {
    return this.errorCode === "TOKEN_EXPIRED";
  }
}