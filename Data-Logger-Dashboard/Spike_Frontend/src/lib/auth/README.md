# Auth & token storage

The backend returns `accessToken` + `refreshToken` in the JSON body of
`/auth/login`, `/auth/register`, and `/auth/refresh-token`. Because they
arrive as JS-readable values (not `httpOnly` cookies), they must live in
JS-readable storage. That is an inherent constraint of the current backend
contract, not a choice.

## Chosen tradeoff

- `accessToken` — kept **in-memory only** (module-level singleton in
  `tokenStore.ts`). A stolen `localStorage` snapshot does NOT contain a
  usable access token. On a full page reload, the app performs a silent
  refresh via `/auth/refresh-token` on the first authed call.
- `refreshToken` — `localStorage`. Required to survive reload. This is the
  XSS-exposed surface.
- `user` object — `localStorage` (public fields: id, name, role, email).
  Duplicated from the backend so the app can render its shell immediately
  before the first `/auth/me` roundtrip.

## Mitigations

- No `dangerouslySetInnerHTML` anywhere. Every API-provided string is
  rendered as plain text.
- Strict CSP meta tag in `__root.tsx` head: no inline scripts beyond
  TanStack's own hydration, no third-party origins.
- The API client automatically clears the session on refresh failure
  and dispatches `voltra:session-expired` so the UI can redirect.
- After `change-password` / `reset-password`, the frontend logs the user
  out immediately — the backend has already revoked all sessions.

## What we'd want long-term

`httpOnly` refresh cookies set by the backend + short-lived access tokens
kept only in memory. This requires a backend change (Set-Cookie header,
CSRF token) and is out of scope for v1.