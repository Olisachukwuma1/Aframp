import { renderHook } from '@testing-library/react'
import { redirect } from 'next/navigation'
import { SessionProvider, useAuthenticatedSession } from './session-provider'

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

describe('useAuthenticatedSession', () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.clearAllMocks()
  })

  it('redirects to login when there is no session', () => {
    renderHook(() => useAuthenticatedSession(), { wrapper: SessionProvider })

    expect(redirect).toHaveBeenCalledWith('/login')
  })
})