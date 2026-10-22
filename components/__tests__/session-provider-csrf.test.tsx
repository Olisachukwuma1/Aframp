import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api, setUnauthorizedHandler } from '@/lib/api'
import { CSRF_COOKIE_NAME, getCsrfToken } from '@/lib/csrf'
import { SessionProvider, useSession } from '../session-provider'

jest.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }
  return {
    api: {
      login: jest.fn(),
      signup: jest.fn(),
      verifyOtp: jest.fn(),
      logout: jest.fn(),
      getMe: jest.fn(),
    },
    ApiError,
    setUnauthorizedHandler: jest.fn(),
  }
})

const STORAGE_KEY = 'aframp.session'
const mockApi = api as jest.Mocked<typeof api>

/** The token currently in the cookie jar, or null. */
function currentToken(): string | null {
  return (
    document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`))
      ?.slice(CSRF_COOKIE_NAME.length + 1) ?? null
  )
}

/** Everything the provider exposes, so tests can drive each branch. */
function Probe() {
  const value = useSession()
  return (
    <div>
      <p data-testid="ready">{value.ready ? 'ready' : 'loading'}</p>
      <p data-testid="token">{value.session?.token ?? 'none'}</p>
      <p data-testid="me">{value.me?.email ?? 'no-me'}</p>
      <button type="button" onClick={() => void value.signIn('a@b.c', 'pw')}>
        sign in
      </button>
      <button type="button" onClick={() => void value.signUp('a@b.c', 'pw', 'Name', '08011122233')}>
        sign up
      </button>
      <button type="button" onClick={() => void value.completeOtp('chal-1', '482913')}>
        verify
      </button>
      <button type="button" onClick={value.signOut}>
        sign out
      </button>
      <button type="button" onClick={() => void value.refreshMe()}>
        refresh
      </button>
    </div>
  )
}

function renderProvider() {
  return render(
    <SessionProvider>
      <Probe />
    </SessionProvider>
  )
}

async function signInThroughUi() {
  const user = userEvent.setup()
  renderProvider()
  await screen.findByText('ready')
  await user.click(screen.getByRole('button', { name: 'sign in' }))
}

beforeEach(() => {
  jest.clearAllMocks()
  window.localStorage.clear()
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  }
  mockApi.logout.mockResolvedValue(undefined)
  mockApi.getMe.mockResolvedValue({
    user_id: 'u',
    email: 'merchant@example.com',
    name: 'Merchant',
    is_admin: false,
    created_at: '',
    merchant_id: 'm',
    merchant_name: 'Acme',
  })
})

describe('SessionProvider', () => {
  it('restores a persisted session on mount', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: 'stored-token', userId: 'u', merchantId: 'm' })
    )
    renderProvider()

    await screen.findByText('ready')
    expect(screen.getByTestId('token')).toHaveTextContent('stored-token')
  })

  it('discards a corrupt stored session rather than throwing', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'not json')
    renderProvider()

    await screen.findByText('ready')
    expect(screen.getByTestId('token')).toHaveTextContent('none')
    // The unreadable value is cleared so it can't fail again on reload.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('signs in and persists the session for a direct-session response', async () => {
    mockApi.login.mockResolvedValue({ token: 'fresh', user_id: 'u', merchant_id: 'm' })
    await signInThroughUi()

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('fresh'))
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      token: 'fresh',
    })
  })

  it('does not persist anything when login returns an OTP challenge', async () => {
    mockApi.login.mockResolvedValue({ challenge_id: 'chal-1', expires_in_secs: 600 })
    await signInThroughUi()

    await waitFor(() => expect(mockApi.login).toHaveBeenCalled())
    // A challenge is not a session — storing one would let the route guards
    // let an unauthenticated user through.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.getByTestId('token')).toHaveTextContent('none')
  })

  it('completes OTP and persists the resulting session', async () => {
    const user = userEvent.setup()
    mockApi.verifyOtp.mockResolvedValue({ token: 'otp-token', user_id: 'u', merchant_id: 'm' })
    renderProvider()
    await screen.findByText('ready')

    await user.click(screen.getByRole('button', { name: 'verify' }))

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('otp-token'))
  })

  it('signs up without creating a session', async () => {
    const user = userEvent.setup()
    mockApi.signup.mockResolvedValue({ challenge_id: 'chal-2', expires_in_secs: 600 })
    renderProvider()
    await screen.findByText('ready')

    await user.click(screen.getByRole('button', { name: 'sign up' }))

    await waitFor(() => expect(mockApi.signup).toHaveBeenCalled())
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('signs out, clearing local state even though a server call was made', async () => {
    const user = userEvent.setup()
    mockApi.login.mockResolvedValue({ token: 'fresh', user_id: 'u', merchant_id: 'm' })
    renderProvider()
    await screen.findByText('ready')
    await user.click(screen.getByRole('button', { name: 'sign in' }))
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('fresh'))

    await user.click(screen.getByRole('button', { name: 'sign out' }))

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('none'))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(mockApi.logout).toHaveBeenCalledWith('fresh')
  })

  it('clears the local session even when the logout call fails', async () => {
    const user = userEvent.setup()
    mockApi.login.mockResolvedValue({ token: 'fresh', user_id: 'u', merchant_id: 'm' })
    mockApi.logout.mockRejectedValue(new Error('network down'))
    renderProvider()
    await screen.findByText('ready')
    await user.click(screen.getByRole('button', { name: 'sign in' }))
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('fresh'))

    await user.click(screen.getByRole('button', { name: 'sign out' }))

    // A failed server round-trip must not leave the user looking signed in.
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('none'))
  })

  it('does not call logout when there was no session to end', async () => {
    const user = userEvent.setup()
    renderProvider()
    await screen.findByText('ready')

    await user.click(screen.getByRole('button', { name: 'sign out' }))

    expect(mockApi.logout).not.toHaveBeenCalled()
  })

  it('refreshes the profile for a signed-in merchant', async () => {
    const user = userEvent.setup()
    mockApi.login.mockResolvedValue({ token: 'fresh', user_id: 'u', merchant_id: 'm' })
    renderProvider()
    await screen.findByText('ready')
    await user.click(screen.getByRole('button', { name: 'sign in' }))
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('fresh'))

    await user.click(screen.getByRole('button', { name: 'refresh' }))

    await waitFor(() => expect(screen.getByTestId('me')).toHaveTextContent('merchant@example.com'))
    expect(mockApi.getMe).toHaveBeenCalledWith('fresh')
  })

  it('skips the profile fetch when there is no session', async () => {
    const user = userEvent.setup()
    renderProvider()
    await screen.findByText('ready')

    await user.click(screen.getByRole('button', { name: 'refresh' }))

    // Nothing to refresh — and it must not call /me unauthenticated.
    expect(mockApi.getMe).not.toHaveBeenCalled()
    expect(screen.getByTestId('me')).toHaveTextContent('no-me')
  })

  it('leaves the profile empty when /me fails, rather than throwing', async () => {
    const user = userEvent.setup()
    mockApi.login.mockResolvedValue({ token: 'fresh', user_id: 'u', merchant_id: 'm' })
    mockApi.getMe.mockRejectedValue(new Error('boom'))
    renderProvider()
    await screen.findByText('ready')
    await user.click(screen.getByRole('button', { name: 'sign in' }))
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('fresh'))

    await user.click(screen.getByRole('button', { name: 'refresh' }))

    expect(screen.getByTestId('me')).toHaveTextContent('no-me')
  })

  it('registers an unauthorized handler on mount and clears it on unmount', async () => {
    const { unmount } = renderProvider()
    await screen.findByText('ready')
    // lib/api calls this on any 401 so an expired token lands the user back
    // on the login screen instead of a bare error.
    expect(setUnauthorizedHandler).toHaveBeenCalledWith(expect.any(Function))

    unmount()
    expect(setUnauthorizedHandler).toHaveBeenLastCalledWith(null)
  })

  it('stores the session even when localStorage is unavailable', async () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    mockApi.login.mockResolvedValue({ token: 'fresh', user_id: 'u', merchant_id: 'm' })
    await signInThroughUi()

    // Private mode / quota: the session still works for this tab.
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('fresh'))
    setItem.mockRestore()
  })
})

describe('SessionProvider CSRF lifecycle', () => {
  it('seeds a token cookie on mount, so an immediate submit cannot race one', async () => {
    renderProvider()

    await screen.findByText('ready')
    await waitFor(() => expect(currentToken()).not.toBeNull())
  })

  it('keeps the same token across a re-render, rather than churning it', async () => {
    const { rerender } = renderProvider()
    await screen.findByText('ready')
    await waitFor(() => expect(currentToken()).not.toBeNull())
    const first = currentToken()

    rerender(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    )
    await waitFor(() => expect(currentToken()).toBe(first))
  })

  it('hands the provider-minted token to getCsrfToken, so both agree', async () => {
    renderProvider()

    await screen.findByText('ready')
    await waitFor(() => expect(currentToken()).not.toBeNull())
    expect(getCsrfToken()).toBe(currentToken())
  })

  it('drops the token on sign-out so the next session starts fresh', async () => {
    const user = userEvent.setup()
    mockApi.login.mockResolvedValue({ token: 'fresh', user_id: 'u', merchant_id: 'm' })
    renderProvider()
    await screen.findByText('ready')
    await waitFor(() => expect(currentToken()).not.toBeNull())
    const before = currentToken()

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'sign out' }))
    })

    // A stale token outliving the session it belonged to is exactly the
    // reuse we want to prevent.
    expect(currentToken()).not.toBe(before)
  })
})
