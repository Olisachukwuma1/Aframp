import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PushNotificationOptIn } from '@/components/push-notification-opt-in'
import { api } from '@/lib/api'
import { usePushNotifications } from '@/hooks/use-push-notifications'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'session-token' }),
}))

jest.mock('@/hooks/use-push-notifications', () => ({
  usePushNotifications: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: {
    getPushSubscriptionStatus: jest.fn(),
    registerPushSubscription: jest.fn(),
  },
}))

const mockUsePushNotifications = usePushNotifications as jest.Mock
const mockGetStatus = api.getPushSubscriptionStatus as jest.Mock
const mockRegister = api.registerPushSubscription as jest.Mock

describe('PushNotificationOptIn', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUsePushNotifications.mockReturnValue({
      permission: 'default',
      loading: false,
      error: null,
      subscribe: jest.fn(),
    })
    mockGetStatus.mockResolvedValue({ enabled: false })
    mockRegister.mockResolvedValue({})
  })

  it('shows the prompt after the home page is ready and persists dismissal', async () => {
    const { rerender } = render(<PushNotificationOptIn ready={false} />)
    expect(mockGetStatus).not.toHaveBeenCalled()

    rerender(<PushNotificationOptIn ready />)
    expect(await screen.findByText('Get payment alerts')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByText('Get payment alerts')).not.toBeInTheDocument()
    expect(localStorage.getItem('aframp:push-opt-in-dismissed')).toBe('true')
  })

  it('does not show the prompt when push notifications are already enabled', async () => {
    mockGetStatus.mockResolvedValue({ enabled: true })
    render(<PushNotificationOptIn ready />)

    await waitFor(() => expect(mockGetStatus).toHaveBeenCalledWith('session-token'))
    expect(screen.queryByText('Get payment alerts')).not.toBeInTheDocument()
  })

  it('uses the existing subscription flow and registers the browser subscription', async () => {
    const subscribe = jest.fn()
    mockUsePushNotifications.mockReturnValue({
      permission: 'default',
      loading: false,
      error: null,
      subscribe,
    })
    render(<PushNotificationOptIn ready />)

    fireEvent.click(await screen.findByRole('button', { name: 'Enable' }))
    expect(subscribe).toHaveBeenCalledTimes(1)

    window.dispatchEvent(
      new CustomEvent('aframp:push-subscribe', {
        detail: { endpoint: 'endpoint', p256dh: 'key', auth: 'auth' },
      })
    )
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith('session-token', {
        endpoint: 'endpoint',
        p256dh: 'key',
        auth: 'auth',
      })
    )
    await waitFor(() => expect(screen.queryByText('Get payment alerts')).not.toBeInTheDocument())
  })
})
