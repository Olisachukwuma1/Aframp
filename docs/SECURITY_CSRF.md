# CSRF Protection Model

**Status:** implemented
**Scope:** the `/backend/*` rewrite in [`next.config.mjs`](../next.config.mjs)

## The problem

`next.config.mjs` rewrites every `/backend/*` request to the real backend
origin (`NEXT_API_URL`). The browser only ever talks to this app's own origin,
so those requests are **same-origin** as far as the browser is concerned —
which is exactly the property a CSRF attack depends on. A page on
`evil.example` can POST to `https://app.aframp.com/backend/withdraw`, the
browser attaches the session cookie without asking us anything, and the
request is indistinguishable from a real one.

Today the session token lives in `localStorage` (see
`components/session-provider.tsx`) and is sent as an `Authorization` header, so
the cookie isn't attached automatically and the practical risk is low. **That is
exactly what makes this worth fixing now rather than later:** the moment the
token moves into an HTTP-only cookie — the storage model the backend's
`/logout` already implies — every mutating endpoint becomes forgeable:

| Endpoint                             | Effect of a forged request               |
| ------------------------------------ | ---------------------------------------- |
| `POST /backend/withdraw`             | Money leaves the merchant's wallet       |
| `POST /backend/remittance`           | Funds sent to an attacker-chosen address |
| `POST /backend/onramp/ozow/initiate` | Payment flow redirected                  |
| `POST /backend/payments/:id/refund`  | Refund issued                            |
| `POST /backend/api-keys`             | Attacker mints their own API key         |
| `DELETE /backend/me`                 | Account deleted                          |

## The model: double-submit + SameSite

Three layers, following the [OWASP CSRF Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)'s
recommended "double submit cookie with SameSite" pattern.

### 1. `SameSite=Strict` on the session cookie

`SESSION_COOKIE_ATTRIBUTES` in [`lib/csrf.ts`](../lib/csrf.ts) is the contract
the backend must use when issuing the session cookie:

```
Path=/; SameSite=Strict; HttpOnly; Max-Age=43200
```

- `SameSite=Strict` — the browser does not attach the cookie to any request
  initiated by another site, so a cross-origin POST arrives with no
  credentials at all.
- `HttpOnly` — JavaScript can't read the session, so an XSS bug can't exfiltrate
  it. (`localStorage`, which we use today, offers no such protection.)

`Max-Age` matches the 24h token expiry, so the cookie and the token die
together.

### 2. A per-session CSRF token in a readable cookie

`getCsrfToken()` mints a 256-bit token from the platform CSPRNG and stores it
in `aframp.csrf` with `SameSite=Strict` and no `HttpOnly` — it _has_ to be
readable by the app, which is what makes it the "submit" half of the pattern.
`middleware.ts` seeds it on the first request of a visit, and
`SessionProvider` also mints it on mount so an immediate submit has one.

### 3. Double submission, verified before the request is proxied

`request()` in [`lib/api.ts`](../lib/api.ts) attaches the token as
`X-CSRF-Token` on every state-changing request:

```ts
const csrfToken = isMutatingMethod(method) ? getCsrfToken() : null
// …
headers: {
  // …
  ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
}
```

`middleware.ts` then compares the header against the cookie and answers `403`
on any mismatch — **before** the rewrite forwards anything to the backend. A
cross-origin attacker can make the browser send the cookie, but cannot read it
to populate the header, and cannot set a custom header at all without a CORS
preflight that we never answer. Either way the check fails.

Safe methods (`GET`, `HEAD`, `OPTIONS`) skip both the header and the check —
sending the token on reads would only widen the surface for leaking it into
logs and referrers.

## Why the token is not a credential

The CSRF token is a per-visitor nonce, not a secret that authorises anything on
its own. It is never accepted in place of the session: the backend still
requires the `Authorization` header, and a request still fails if either the
session or the token is wrong. That means the token can be regenerated, logged
in a test, or rotated without invalidating anyone's session — but it must
never be _predictable_, or the whole check collapses. Hence
`crypto.getRandomValues`, never `Math.random` on the happy path.

## Cookie contract for the backend

| Cookie        | Attributes                                                     | Notes                                               |
| ------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| session       | `Path=/; SameSite=Strict; HttpOnly; Max-Age=43200`             | Issued by the backend on `/login` and `/verify-otp` |
| `aframp.csrf` | `Path=/; SameSite=Strict; Max-Age=43200` (+ `Secure` on https) | Readable by design                                  |

The backend should also verify `X-CSRF-Token` against the cookie it receives as
a defence in depth. The middleware already blocks forged requests, but a
non-browser client reaching the backend directly bypasses the rewrite — and
`openapi.yaml` should document the header as required on mutating operations.

## Testing

- [`lib/__tests__/csrf.test.ts`](../lib/__tests__/csrf.test.ts) — token
  generation, cookie attributes, the mutating-method split, `tokensMatch`.
- [`lib/__tests__/api.test.ts`](../lib/__tests__/api.test.ts) — the header is
  present on `POST`/`DELETE`, absent on `GET`, and the cookie/header agree.
- [`__tests__/middleware.test.ts`](../__tests__/middleware.test.ts) — the gate
  accepts a matching pair and rejects each failure mode with a 403.
