# ⚙️ Spike Backend — API, Alerts, Real-time, Webhooks

> Node.js / Express · DynamoDB · Socket.IO · JWT auth · Threshold alert engine · HMAC-signed webhooks
> Deployed on AWS EC2, behind Nginx, TLS via Let's Encrypt

<p>
<img alt="node" src="https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white">
<img alt="express" src="https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white">
<img alt="dynamodb" src="https://img.shields.io/badge/DynamoDB-7%20tables-4053D6?style=flat-square&logo=amazondynamodb&logoColor=white">
<img alt="tests" src="https://img.shields.io/badge/tests-63%20passing-2ea44f?style=flat-square">
</p>

---

## 🚀 Quick start

```bash
npm install
cp .env.example .env     # fill in AWS credentials, table names, JWT secrets
npm run dev               # http://localhost:5000
```

- [ ] `.env` has real `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- [ ] All 6 DynamoDB tables exist (see schema table below) — this backend never creates tables itself
- [ ] `GET /health` returns `"status":"ok"` (not `"degraded"`)
- [ ] `GET /api-docs` loads the interactive Swagger UI

---

## 🧱 Architecture

Clean, layered, one direction of dependency:

```
Client → Routes → Controllers → Services → Repositories → DynamoDB
```

- **Controllers** validate the request shape and format the response — no business logic
- **Services** hold all business logic, ownership checks, and cross-table orchestration
- **Repositories** are the only layer that touches DynamoDB directly — every table has one, all built on a shared `base.repository.js` that wraps AWS SDK errors into consistent `AppError`s

Every response uses the same envelope:
```json
{ "success": true, "message": "...", "data": { }, "timestamp": "...", "requestId": "..." }
```

---

## 📦 Modules

| # | Module | What it does |
|---|---|---|
| 1 | **Auth** | Register/login, JWT access + refresh tokens (rotated, stored hashed), forgot/reset/change password, RBAC (`admin` / `engineer` / `viewer`) |
| 2 | **Users** | Profile, S3 profile-image upload, activity history, admin user management |
| 3 | **Devices** | Registration (auto-generated or user-supplied `deviceId`), ownership-scoped CRUD, derived online/offline status |
| 4 | **Telemetry** | Read-only against the existing sensor pipeline's table — **schema-agnostic**: any numeric field a device publishes is automatically available for stats/filtering, nothing hardcoded |
| 5 | **Dashboard** | Fleet-wide summary and period statistics, bounded fan-out with a visible `note` when a fleet exceeds the sampled cap |
| 6 | **WebSocket** | Socket.IO, JWT-authenticated handshake, room-based scoping (`user:{id}`, `role:managers`, `device:{id}`) |
| 7 | **Alert Engine** | Threshold checks (voltage/current/temperature) on every incoming reading, plus a background sweep for offline/silent devices. Dedupes while a condition persists; auto-resolves the instant it clears |
| 8 | **Notifications** | Email (SMTP, dev-mode falls back to logging), architecture-ready SMS/push channel stubs |
| 9 | **Webhooks** | User-registered outbound webhooks, HMAC-SHA256 signed, SSRF-guarded (rejects private/internal URLs), retried with backoff, fire-and-forget so a dead endpoint never blocks the alert pipeline — Zapier "Catch Hook" compatible out of the box |
| 10 | **Logging** | Winston, 5 separate log files: `application`, `error`, `auth`, `requests`, `audit` |
| 11 | **Swagger** | Full OpenAPI 3.0 spec generated from route JSDoc, served at `/api-docs` |
| 12 | **Testing** | Jest + Supertest, 63 tests across unit/integration/API layers, AWS mocked at the SDK client boundary so real repository/service code actually runs |

---

## 🔌 API surface

Full interactive reference: **`/api-docs`** once running. Condensed map:

| Base path | Auth | Notes |
|---|---|---|
| `/auth/*` | mixed | register, login, refresh, logout, password flows |
| `/users/*` | 🔒 | self-service + admin-only listing/management |
| `/devices/*` | 🔒 | owner or admin/engineer |
| `/telemetry/*` | 🔒 | owner or admin/engineer; dynamic fields |
| `/dashboard/*` | 🔒 | scoped to accessible fleet |
| `/alerts/*` | 🔒 | resolve is admin/engineer only |
| `/webhooks/*` | 🔒 | owner-scoped CRUD |
| `/health` | public | **not** under `/api/v1` — bare origin |

🔒 = requires `Authorization: Bearer <accessToken>`

---

## 🗄️ Required DynamoDB tables

This backend **never** issues `CreateTable` — every table below must already exist. One (`TelemetryData`) comes from your existing device ingestion pipeline; the other six are created for this app specifically.

| Table | Partition key | Sort key | GSI |
|---|---|---|---|
| `TelemetryData` *(existing)* | `deviceId` | `timestamp` | — |
| `Users` | `userId` | — | `EmailIndex` (email) |
| `Devices` | `deviceId` | — | `OwnerIndex` (ownerId) |
| `Alerts` | `alertId` | — | `DeviceIdIndex` (deviceId, createdAt) |
| `RefreshTokens` | `tokenId` | — | `UserIdIndex` (userId) |
| `ActivityLogs` | `userId` | `timestamp` | — |
| `Webhooks` | `webhookId` | — | `OwnerIndex` (ownerId) |

---

## 🔐 Security

- Passwords: bcrypt, refresh tokens: SHA-256 hashed at rest, never stored raw
- Refresh tokens **rotate** on every use — a stolen token has a one-shot shelf life
- Row-level ownership checks in the **service** layer (not just route gating) — a Viewer's query for another user's device fails even with a technically-valid, technically-authenticated request
- Webhook URLs are DNS-resolved and checked against private/loopback/link-local IP ranges before every delivery attempt (registration-time **and** delivery-time, closing the DNS-rebinding gap)
- Two independent, individually-revocable X.509 certificates for MQTT: one for the device fleet, one for this backend's own subscriber — compromising one never exposes the other

---

## 🛰️ Real-time (Socket.IO)

```js
const socket = io(SOCKET_URL, { auth: { token: accessToken } }); // bare origin, not /api/v1
socket.emit('subscribe:device', deviceId, (ack) => { ... });
socket.on('telemetry:update', ({ deviceId, reading }) => { ... });
socket.on('alert:new', ({ deviceId, alert }) => { ... });
```

---

## 🛠️ MQTT ingestion

A separate MQTT client (own cert, own AWS IoT policy) subscribes fleet-wide via wildcard:
```
AWS_IOT_MQTT_TOPIC=iot/datalogger/+/telemetry
```
On every message it: updates that device's `lastSeenAt` (driving the `online` field), evaluates the alert engine, and broadcasts `telemetry:update` over Socket.IO — all without ever writing to the telemetry table itself, which stays owned by the original ingestion pipeline.

---

## 🚢 Deployment

Runs as a plain PM2-managed Node process behind Nginx (TLS termination + WebSocket-aware reverse proxy) on an EC2 instance. Docker, CI/CD, and Redis were deliberately left out of this deployment to keep it simple and directly SSH-debuggable — see the architecture notes below if reintroducing them later.

```bash
pm2 start server.js --name spike-backend
pm2 save && pm2 startup
```

**Scaling note:** the current deployment is single-instance. Horizontal scaling would need a shared Socket.IO adapter (Redis) and a shared rate-limit store — straightforward to add back, not required at current load.

---

## 🧪 Testing

```bash
npm test               # run once
npm run test:coverage  # with coverage
```

AWS is mocked at the **SDK client boundary** (`aws-sdk-client-mock`), not by mocking this app's own modules — repositories and services run their real code; only the network call to DynamoDB/S3 is intercepted. Covers: auth flows, alert dedup/auto-resolve/multi-field breaches, RBAC across admin routes, pagination cursor integrity, and the AWS error-translation layer.

---

<sub>Part of the Spike monorepo — see the [root README](../README.md) for full system architecture.</sub>
