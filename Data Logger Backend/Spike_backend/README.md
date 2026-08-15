# IoT Energy Monitoring Platform — Backend

Production-grade Node.js backend for the IoT Energy Monitoring Platform.

## Pipeline Context

```
STM32 -> UART -> ESP32 -> MQTT over TLS -> AWS IoT Core -> IoT Rule -> DynamoDB -> [THIS BACKEND]
```

This backend **reads from existing AWS infrastructure only**. It never creates,
modifies, or deletes AWS resources (DynamoDB tables, IoT rules, etc.). All
tables listed in `.env` are assumed to already exist.

## Architecture

Clean Architecture, strict layering:

```
Client -> Routes -> Controllers -> Services -> Repositories -> DynamoDB
```

- **Controllers**: validate requests, call services, shape responses
- **Services**: business logic, alert generation, dashboard calculations
- **Repositories**: database access only, no business logic

## Module 1 — Project Initialization & Config (this delivery)

What's included:

| Path | Purpose |
|---|---|
| `src/config/env.config.js` | Loads & validates all environment variables, fails fast on startup if required vars are missing |
| `src/config/aws.config.js` | AWS SDK v3 DynamoDB Document Client — **read/write to existing tables only, never provisions infra** |
| `src/config/server.config.js` | CORS, rate limiting, Helmet, Socket.IO options |
| `src/constants/httpStatusCodes.js` | Shared HTTP status constants |
| `src/constants/errorCodes.js` | Shared application error codes |
| `src/utils/apiResponse.js` | `sendSuccess` / `sendError` helpers enforcing the spec's response envelope, plus `AppError` |
| `src/middlewares/requestId.middleware.js` | Attaches a unique `requestId` to every request (used in every response per spec section 16) |
| `src/middlewares/notFound.middleware.js` | 404 handler |
| `src/middlewares/errorHandler.middleware.js` | Central error handler (console-based for now — swapped for Winston in the Logging module) |
| `src/controllers/health.controller.js` | Basic `/health` liveness check (extended with AWS/DynamoDB checks in the Logging & Monitoring module) |
| `src/routes/index.routes.js` | Root API router — future modules mount here |
| `app.js` | Express app: security middleware, parsing, routing, error handling |
| `server.js` | HTTP server bootstrap, graceful shutdown, process-level error handlers |

Every other folder (`services/`, `repositories/`, `validators/`, `websocket/`,
`docs/`, `tests/`) is scaffolded and empty, ready for its respective module.

## Setup

```bash
npm install
cp .env.example .env
# fill in .env with real AWS credentials / table names / secrets
npm run dev
```

Server starts on `http://localhost:5000` (or `PORT` from `.env`).

- `GET /health` → liveness check
- API routes will be mounted under `/api/v1` as modules are added

## Response Envelope (spec section 16)

Success:
```json
{ "success": true, "message": "...", "data": {}, "timestamp": "...", "requestId": "..." }
```

Error:
```json
{ "success": false, "message": "...", "errorCode": "...", "timestamp": "...", "requestId": "..." }
```

Use `sendSuccess(res, {...})` / `sendError(res, {...})` from
`src/utils/apiResponse.js` in every controller — don't hand-roll `res.json()`.

## Module 2 — Authentication (this delivery)

Endpoints mounted at `/api/v1/auth`:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/register` | Public | Self-registration, always assigned `viewer` role |
| POST | `/register/admin` | Admin only | Provision a user with any role (Admin/Engineer/Viewer) |
| POST | `/login` | Public | Returns access + refresh token pair |
| POST | `/refresh-token` | Public (valid refresh token) | Rotates refresh token, issues new pair |
| POST | `/logout` | Public (valid refresh token) | Revokes the given refresh token |
| POST | `/forgot-password` | Public | Emails a 15-minute password reset link (never reveals if the email exists) |
| POST | `/reset-password` | Public (valid reset token) | Sets new password, revokes all sessions |
| POST | `/change-password` | Authenticated | Requires current password, revokes all sessions |
| GET | `/me` | Authenticated | Returns the current user |

What's included:

| Path | Purpose |
|---|---|
| `src/constants/roles.js` | `admin` / `engineer` / `viewer` role constants |
| `src/utils/password.util.js` | bcrypt hash/compare |
| `src/utils/token.util.js` | Access, refresh, and password-reset JWT generation/verification |
| `src/utils/hash.util.js` | SHA-256 helper — refresh tokens are stored **hashed**, never raw |
| `src/utils/email.util.js` | Minimal email sender (nodemailer); logs to console if SMTP isn't configured yet, so auth flows are testable without real SMTP |
| `src/utils/asyncHandler.js` | Wraps async controllers so rejected promises reach the error handler |
| `src/repositories/user.repository.js` | User CRUD against DynamoDB (schema documented in-file) |
| `src/repositories/refreshToken.repository.js` | Refresh-token storage/revocation against DynamoDB (schema documented in-file) |
| `src/services/auth.service.js` | All business logic: register, login, refresh (with rotation), logout, forgot/reset/change password |
| `src/validators/auth.validator.js` | express-validator rule sets + shared `validate()` middleware |
| `src/middlewares/auth.middleware.js` | `authenticate` — verifies Bearer access token, attaches `req.user` |
| `src/middlewares/role.middleware.js` | `authorize(...roles)` — RBAC guard, use after `authenticate` |
| `src/routes/auth.routes.js` | Route wiring |

### Required DynamoDB tables (must already exist)

These are **not** the existing telemetry pipeline table — they're new
tables this backend owns for app-level data. Create them (e.g. via your
existing IaC) before running Module 2 against real AWS:

**Users table** (`DYNAMODB_USERS_TABLE`)
- Partition key: `userId` (String)
- GSI `EmailIndex`: partition key `email` (String)

**RefreshTokens table** (`DYNAMODB_REFRESH_TOKENS_TABLE`)
- Partition key: `tokenId` (String)
- GSI `UserIdIndex`: partition key `userId` (String)
- Recommended: enable TTL on the `expiresAt` attribute (epoch seconds)

### Security notes

- Refresh tokens are stored as SHA-256 hashes, never in plaintext.
- Refresh tokens **rotate** on every use (old one revoked, new one issued) — limits replay if one is ever stolen.
- Password reset / change **revokes all active sessions** for that user.
- `forgot-password` never reveals whether an email is registered.
- `/register/admin` is the only way to create non-Viewer accounts, and it requires an existing Admin's access token.

### Not yet wired up (later modules per the dev sequence)

- Winston logging — now live (Module 12)
- `/health` now checks DynamoDB/AWS connectivity (Module 12)
- Swagger docs — now live at `/api-docs` (Module 13)

## Module 14 — Testing (this delivery)

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

AWS is mocked at the SDK client boundary using `aws-sdk-client-mock` (see
`tests/setup/awsMock.js`) - repositories and services run their **real**
code, only the network call to DynamoDB/S3 is intercepted. This is more
honest than mocking our own modules: a bug in a repository's query shape
would still be caught.

| Directory | What it covers |
|---|---|
| `tests/unit/` | Pure functions: password hashing, JWT round-trips, pagination cursors, the AWS error translator, telemetry statistics math |
| `tests/integration/` | Repositories and services against mocked DynamoDB: user/device repositories, the full auth service (register/login), the alert threshold engine (raise/dedupe/auto-resolve/multi-field) |
| `tests/api/` | Full HTTP requests via `supertest` against the real Express app: `/health` degraded-vs-ok, auth validation, 401/403/404 error envelopes, RBAC across admin-gated routes |

63 tests, 12 suites, all passing. Coverage intentionally isn't 100% -
things like the MQTT subscriber's live AWS IoT connection and the
Socket.IO broadcast plumbing are better suited to manual/staging
verification than unit mocks of a mocked MQTT broker.

## Status

All 14 functional modules from the spec are implemented (Auth, Users,
Devices, Telemetry, Dashboard, WebSocket, Alert Engine, Notifications,
Logging, Swagger, Testing). Deployment infrastructure (Docker, Nginx,
Redis, CI/CD, CloudWatch) was intentionally left out of this delivery to
keep the backend simple and self-contained for direct frontend
integration - it can run with just `npm install && npm run dev`.

**To connect a frontend to this backend:**
- Base API URL: `http://localhost:5000/api/v1` (or wherever you deploy it)
- Set `CLIENT_ORIGIN` in `.env` to your frontend's origin (CORS)
- Full endpoint reference: run the server and visit `/api-docs`, or see
  `src/routes/*.routes.js` for the JSDoc annotations directly
- Auth: `POST /auth/login` returns `{ user, accessToken, refreshToken }` -
  send `accessToken` as `Authorization: Bearer <token>` on every
  subsequent request
- Real-time: connect via `socket.io-client` to the same origin (not
  under `/api/v1`), authenticating with `{ auth: { token: accessToken } }`
