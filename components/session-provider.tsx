'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { redirect } from 'next/navigation'
import {
  api,
  setUnauthorizedHandler,
  type AuthResponse,
  type LoginResult,
  type Me,
  type OtpChallengeResponse,
} from '@/lib/api'
import { clearCsrfToken, getCsrfToken } from '@/lib/csrf'

const STORAGE_KEY = 'aframp.session'

interface Session {
  token: string
  userId: string
  merchantId: string | null
}

interface SessionContextValue {
  session: Session | null
  /** False until localStorage has been read — guards against redirecting on first paint. */
  ready: boolean
  /** Returns the raw result so the caller can branch: a session (legacy
   * no-phone accounts) vs a challenge (everyone else) that needs `/verify`. */
  signIn: (email: string, password: string) => Promise<LoginResult>
  /** Always a challenge — the account doesn't exist until `completeOtp` succeeds. */
  signUp: (
    email: string,
    password: string,
    name: string,
    phoneNumber: string
  ) => Promise<OtpChallengeResponse>
  completeOtp: (challengeId: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  /** Re-fetches /me and updates any cached profile data. */
  refreshMe: () => Promise<Me | null>
  /** Latest profile data from /me, if fetched. */
  me: Me | null
  /** True while the logout API call is in flight. */
  isLoggingOut: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

function toSession(response: AuthResponse): Session {
  return {
    token: response.token,
    userId: response.user_id,
    merchantId: response.merchant_id,
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<Me | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    // Mint the CSRF token up front rather than lazily on the first mutation:
    // `middleware.ts` rejects a state-changing request that arrives without
    // one, and seeding here means even an immediate submit has a token.
    getCsrfToken()
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setSession(JSON.parse(stored) as Session)
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setReady(true)
  }, [])

  const persist = useCallback((next: Session) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage may be unavailable (private mode, quota, blocked) — the
      // session still works for this tab, it just won't survive a reload.
    }
    setSession(next)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await api.login(email, password)
      // Only a legacy no-phone account gets a session straight away; a
      // challenge means the caller still has to route to `/verify`.
      if ('token' in result) persist(toSession(result))
      return result
    },
    [persist]
  )

  const signUp = useCallback(
    (email: string, password: string, name: string, phoneNumber: string) => {
      return api.signup(email, password, name, phoneNumber)
    },
    []
  )

  const completeOtp = useCallback(
    async (challengeId: string, code: string) => {
      persist(toSession(await api.verifyOtp(challengeId, code)))
    },
    [persist]
  )

  const signOut = useCallback(async () => {
    setIsLoggingOut(true)
    try {
      if (session) {
        // Must await logout before clearing local state to ensure server-side
        // session is invalidated. Use a short timeout to prevent user being
        // blocked indefinitely if the request hangs.
        const logoutPromise = api.logout(session.token)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Logout timeout')), 5000)
        )
        await Promise.race([logoutPromise, timeoutPromise]).catch(() => {
          // Timeout or other error; continue with local cleanup.
        })
      }
    } finally {
      window.localStorage.removeItem(STORAGE_KEY)
      // The token is bound to the session that just ended; dropping it means
      // the next sign-in starts from a fresh one.
      clearCsrfToken()
      setSession(null)
      setMe(null)
      setIsLoggingOut(false)
    }
  }, [session])

  const refreshMe = useCallback(async () => {
    if (!session) return null
    try {
      const data = await api.getMe(session.token)
      setMe(data)
      return data
    } catch {
      return null
    }
  }, [session])

  // Tokens expire after 24h with no refresh path, so drop the session on any
  // 401 from an authenticated call — the route guards handle the redirect.
  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  const value = useMemo(
    () => ({ session, ready, signIn, signUp, completeOtp, signOut, refreshMe, me, isLoggingOut }),
    [session, ready, signIn, signUp, completeOtp, signOut, refreshMe, me, isLoggingOut]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside <SessionProvider>')
  return context
}

/**
 * For screens that cannot render without a token. The `(app)` layout guarantees
 * one exists before mounting children, so this narrows the type for them.
 */
export function useAuthenticatedSession(): Session {
  const { session } = useSession()
  if (!session) redirect('/login')
  return session
}
