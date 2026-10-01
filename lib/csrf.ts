/**
 * CSRF protection for the `/backend/*` rewrite (see next.config.mjs).
 *
 * The rewrite makes the backend look like a same-origin endpoint, which is
 * what makes the browser attach cookies to it without a CORS preflight — the
 * exact property a CSRF attack needs. Tokens in `localStorage` don't travel
 * automatically, so today the blast radius is limited; the moment the session
 * moves into an HTTP-only cookie, every mutating route (`/withdraw`,
 * `/remittance`, `/onramp/ozow/initiate`, …) becomes forgeable by any page
 * the user visits.
 *
 * The model is the OWASP-recommended **double submit + SameSite** pair:
 *
 *  1. A per-session random token lives in a JS-readable cookie
 *     (`aframp.csrf`) carrying `SameSite=Strict`, so a cross-site request
 *     never carries it to us at all.
 *  2. Every mutating request echoes that exact value back in the
 *     `X-CSRF-Token` header (see `request()` in lib/api.ts). A cross-origin
 *     page can force a form post but cannot set a custom header without
 *     passing a CORS preflight we never answer.
 *  3. `middleware.ts` compares the two and answers 403 on any mismatch,
 *     before the rewrite forwards anything to the backend.
 *
 * See docs/SECURITY_CSRF.md for the full write-up, including the cookie
 * contract the backend has to honour.
 */

/** Cookie the browser echoes back in `X-CSRF-Token`. Deliberately JS-readable. */
export const CSRF_COOKIE_NAME = 'aframp.csrf'

/** Header carrying the double-submitted token. Custom, so it forces a preflight. */
export const CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * Attributes for the CSRF cookie. `SameSite=Strict` is the belt to the
 * double-submit braces: it stops the cookie being attached to a cross-site
 * request in the first place. `Secure` is added on top when the page is
 * served over https, so the cookie still works on plain-http localhost in
 * `npm run dev`.
 */
export const CSRF_COOKIE_ATTRIBUTES = 'Path=/; SameSite=Strict; Max-Age=43200'

/**
 * The contract the backend must honour when it issues the session cookie, so
 * the session is unreadable from JavaScript and is never attached to a
 * cross-site request. Exported as the single definition in the frontend, and
 * asserted in `lib/__tests__/csrf.test.ts` so a change here is a deliberate
 * one. See docs/SECURITY_CSRF.md.
 */
export const SESSION_COOKIE_ATTRIBUTES = 'Path=/; SameSite=Strict; HttpOnly; Max-Age=43200'

/**
 * Methods that can change server state and therefore need a token. `GET`,
 * `HEAD` and `OPTIONS` are the safe set; anything else is treated as mutating
 * so a new verb is protected by default rather than by omission.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isMutatingMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase())
}

/**
 * 256 bits from the platform CSPRNG, hex-encoded. Falls back to a timestamp
 * only where `crypto` is genuinely absent (very old browsers) — the token is
 * a CSRF nonce, not a credential, so predictability there degrades to the
 * pre-cookie status quo rather than breaking the app.
 */
export function generateToken(): string {
  const source = globalThis.crypto
  if (source?.getRandomValues) {
    const bytes = new Uint8Array(32)
    source.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
}

/** Parses a `Cookie:` request header into a plain object. */
export function parseCookies(header: string | null | undefined): Record<string, string> {
  const jar: Record<string, string> = {}
  if (!header) return jar
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 1) continue
    const name = part.slice(0, separator).trim()
    if (!name) continue
    try {
      jar[name] = decodeURIComponent(part.slice(separator + 1).trim())
    } catch {
      // A malformed percent-escape shouldn't take the whole request down.
      jar[name] = part.slice(separator + 1).trim()
    }
  }
  return jar
}

/** Builds a `Set-Cookie` value for the CSRF cookie. */
export function serializeCsrfCookie(token: string, secure: boolean): string {
  const attributes = secure ? `${CSRF_COOKIE_ATTRIBUTES}; Secure` : CSRF_COOKIE_ATTRIBUTES
  return `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; ${attributes}`
}

/** Length-safe equality check, so a mismatch can't be probed byte by byte. */
export function tokensMatch(expected: string | undefined, provided: string | null): boolean {
  if (!expected || !provided) return false
  if (expected.length !== provided.length) return false
  let mismatch = 0
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ provided.charCodeAt(index)
  }
  return mismatch === 0
}

/* ------------------------------------------------------------------ *
 * Browser side. Everything above is pure so `middleware.ts` can run it
 * in the Edge runtime; the helpers below touch `document` and are only
 * ever called from client components.
 * ------------------------------------------------------------------ */

/** True when we're in a browser with a usable `document.cookie`. */
function canUseCookies(): boolean {
  return typeof document !== 'undefined'
}

/** The token currently in the cookie jar, or null. */
export function readCsrfToken(): string | null {
  if (!canUseCookies()) return null
  return parseCookies(document.cookie)[CSRF_COOKIE_NAME] ?? null
}

/** Stores the token in a `SameSite=Strict` cookie readable by this app. */
export function writeCsrfToken(token: string): void {
  if (!canUseCookies()) return
  const secure = typeof location !== 'undefined' && location.protocol === 'https:'
  document.cookie = serializeCsrfCookie(token, secure)
}

/** Expires the cookie — called on sign-out so a new session gets a new token. */
export function clearCsrfToken(): void {
  if (!canUseCookies()) return
  document.cookie = `${CSRF_COOKIE_NAME}=; Path=/; SameSite=Strict; Max-Age=0`
}

/**
 * The token to send with the next mutating request, minting one on first use.
 *
 * Always returns a value so `request()` can attach the header without a
 * branching call site; if the cookie can't be persisted (cookies blocked, or
 * a hard refresh racing the first write) middleware will reject the mutation
 * with a 403 naming the cause rather than letting it through unchecked.
 */
export function getCsrfToken(): string {
  const existing = readCsrfToken()
  if (existing) return existing
  const token = generateToken()
  writeCsrfToken(token)
  return token
}
