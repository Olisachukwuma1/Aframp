import {
  CSRF_COOKIE_ATTRIBUTES,
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_ATTRIBUTES,
  clearCsrfToken,
  generateToken,
  getCsrfToken,
  isMutatingMethod,
  parseCookies,
  readCsrfToken,
  serializeCsrfCookie,
  tokensMatch,
  writeCsrfToken,
} from '@/lib/csrf'

/** jsdom persists cookies between tests; start each one from a clean jar. */
function clearAllCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  }
}

beforeEach(clearAllCookies)

describe('cookie attributes', () => {
  it('pins the CSRF cookie to SameSite=Strict', () => {
    expect(CSRF_COOKIE_ATTRIBUTES).toContain('SameSite=Strict')
  })

  it('requires the session cookie to be SameSite=Strict and HttpOnly', () => {
    // The issue's two headline requirements, asserted so neither can be
    // dropped without a test failing.
    expect(SESSION_COOKIE_ATTRIBUTES).toContain('SameSite=Strict')
    expect(SESSION_COOKIE_ATTRIBUTES).toContain('HttpOnly')
  })

  it('never marks the CSRF cookie HttpOnly — the app has to read it', () => {
    expect(CSRF_COOKIE_ATTRIBUTES).not.toContain('HttpOnly')
  })
})

describe('isMutatingMethod', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('treats %s as safe', (method) => {
    expect(isMutatingMethod(method)).toBe(false)
  })

  it.each(['POST', 'DELETE', 'PUT', 'PATCH'])('treats %s as mutating', (method) => {
    expect(isMutatingMethod(method)).toBe(true)
  })

  it('is case-insensitive, so a lowercased verb is still classified', () => {
    expect(isMutatingMethod('get')).toBe(false)
    expect(isMutatingMethod('post')).toBe(true)
  })

  it('defaults an unknown verb to mutating, so a new one is protected by default', () => {
    expect(isMutatingMethod('PROPFIND')).toBe(true)
  })
})

describe('generateToken', () => {
  it('returns 64 hex characters — 256 bits of entropy', () => {
    expect(generateToken()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('does not repeat across calls', () => {
    const tokens = new Set(Array.from({ length: 50 }, generateToken))
    expect(tokens.size).toBe(50)
  })
})

describe('parseCookies', () => {
  it('parses a normal cookie header', () => {
    expect(parseCookies('a=1; aframp.csrf=abc')).toEqual({ a: '1', 'aframp.csrf': 'abc' })
  })

  it('returns an empty jar for a missing header', () => {
    expect(parseCookies(null)).toEqual({})
    expect(parseCookies(undefined)).toEqual({})
  })

  it('keeps a value containing an equals sign', () => {
    expect(parseCookies('token=a=b=c')).toEqual({ token: 'a=b=c' })
  })

  it('percent-decodes values', () => {
    expect(parseCookies('token=a%20b')).toEqual({ token: 'a b' })
  })

  it('skips malformed segments instead of throwing', () => {
    expect(parseCookies('=novalue; good=1')).toEqual({ good: '1' })
  })

  it('survives an undecodable percent-escape', () => {
    expect(parseCookies('token=%E0%A4%A')).toEqual({ token: '%E0%A4%A' })
  })
})

describe('tokensMatch', () => {
  it('accepts an identical pair', () => {
    expect(tokensMatch('abc123', 'abc123')).toBe(true)
  })

  it('rejects a different value', () => {
    expect(tokensMatch('abc123', 'abc124')).toBe(false)
  })

  it('rejects a value of a different length', () => {
    expect(tokensMatch('abc', 'abcd')).toBe(false)
  })

  it('rejects when either side is missing', () => {
    expect(tokensMatch(undefined, 'abc')).toBe(false)
    expect(tokensMatch('abc', null)).toBe(false)
    expect(tokensMatch('', '')).toBe(false)
  })
})

describe('cookie round-trip', () => {
  it('serialises the token under the expected name and attributes', () => {
    const cookie = serializeCsrfCookie('tok', true)
    expect(cookie).toContain(`${CSRF_COOKIE_NAME}=tok`)
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).toContain('Secure')
  })

  it('omits Secure over plain http so local dev still works', () => {
    expect(serializeCsrfCookie('tok', false)).not.toContain('Secure')
  })

  it('percent-encodes a token containing cookie-significant characters', () => {
    const hostile = 'a;b c=d'
    writeCsrfToken(hostile)
    expect(readCsrfToken()).toBe(hostile)
  })

  it('returns null when no token has been written', () => {
    expect(readCsrfToken()).toBeNull()
  })

  it('returns the written token', () => {
    writeCsrfToken('abc123')
    expect(readCsrfToken()).toBe('abc123')
  })

  it('clears the token so it is no longer readable', () => {
    writeCsrfToken('abc123')
    clearCsrfToken()
    expect(readCsrfToken()).toBeNull()
  })
})

describe('getCsrfToken', () => {
  it('reuses the existing token rather than minting a new one', () => {
    const first = getCsrfToken()
    expect(getCsrfToken()).toBe(first)
  })

  it('persists the token so the header and the cookie agree', () => {
    expect(getCsrfToken()).toBe(readCsrfToken())
  })

  it('mints a new token after the old one is cleared', () => {
    const first = getCsrfToken()
    clearCsrfToken()
    expect(getCsrfToken()).not.toBe(first)
  })
})
