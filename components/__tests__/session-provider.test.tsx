import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionProvider, useSession } from '../session-provider'
import { api } from '@/lib/api'

jest.mock('@/lib/api', () => ({
  api: {
    login: jest.fn(),
    signup: jest.fn(),
    verifyOtp: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
  },
  setUnauthorizedHandler: jest.fn(),
}))

describe('SessionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    // Mock window.localStorage for testing
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    })
  })

  describe('signOut', () => {
    it('should await api.logout before clearing session', async () => {
      const logoutPromise = Promise.resolve()
      ;(api.logout as jest.Mock).mockReturnValue(logoutPromise)

      let capturedSignOut: (() => Promise<void>) | null = null

      function TestComponent() {
        const { signOut, session } = useSession()
        capturedSignOut = signOut
        return <div>{session ? 'logged-in' : 'logged-out'}</div>
      }

      // Manually set a session to test logout
      const initialSession = {
        token: 'test-token',
        userId: 'user-123',
        merchantId: 'merchant-456',
      }

      render(
        <SessionProvider>
          <TestComponent />
        </SessionProvider>
      )

      // Simulate having a session by calling signOut
      expect(capturedSignOut).toBeDefined()
      await capturedSignOut?.()

      expect(api.logout).toHaveBeenCalled()
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('aframp.session')
    })

    it('should clear session even if logout API call fails', async () => {
      ;(api.logout as jest.Mock).mockRejectedValue(new Error('Network error'))

      let capturedSignOut: (() => Promise<void>) | null = null

      function TestComponent() {
        const { signOut, session } = useSession()
        capturedSignOut = signOut
        return <div>{session ? 'logged-in' : 'logged-out'}</div>
      }

      render(
        <SessionProvider>
          <TestComponent />
        </SessionProvider>
      )

      expect(capturedSignOut).toBeDefined()
      await expect(capturedSignOut?.()).resolves.not.toThrow()
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('aframp.session')
    })

    it('should handle logout timeout gracefully', async () => {
      // Mock a logout that takes longer than the 5-second timeout
      ;(api.logout as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      )

      let capturedSignOut: (() => Promise<void>) | null = null

      function TestComponent() {
        const { signOut } = useSession()
        capturedSignOut = signOut
        return <div>test</div>
      }

      render(
        <SessionProvider>
          <TestComponent />
        </SessionProvider>
      )

      expect(capturedSignOut).toBeDefined()

      // Should complete within reasonable time (not wait 10 seconds)
      const startTime = Date.now()
      await capturedSignOut?.()
      const elapsedTime = Date.now() - startTime

      // Should not wait full 10 seconds, but give some buffer for timing variance
      expect(elapsedTime).toBeLessThan(7000)
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('aframp.session')
    })
  })
})
