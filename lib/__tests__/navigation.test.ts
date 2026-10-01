import { redirectTo } from '@/lib/navigation'

/**
 * `redirectTo` assigns to `window.location.href`, which jsdom refuses to
 * honour — it logs "not implemented" and drops the URL. So this test asserts
 * the assignment was *attempted* by watching for jsdom's navigation error,
 * and leaves the URL assertion to the callers, which mock this module.
 */
describe('redirectTo', () => {
  it('attempts to navigate away by assigning location.href', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    redirectTo('https://payments.ozow.com/pay/abc123')

    // jsdom's virtual console emits this for any unhandled navigation.
    const reportedNavigation = consoleError.mock.calls.some((args) =>
      args.some((arg) => typeof arg === 'object' && arg !== null && 'type' in arg)
    )
    expect(reportedNavigation).toBe(true)
    consoleError.mockRestore()
  })
})
