import { render, screen } from '@testing-library/react'
import { ZarOnramp } from '@/components/onramp/zar-onramp'
import { RequestPageClient } from '@/components/request/request-page-client'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: jest.fn() }),
}))

jest.mock('@/components/send/qr-scanner', () => ({
  QRScanner: () => null,
}))

describe.each(['light', 'dark'])('%s theme surfaces', (theme) => {
  beforeEach(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('keeps the ZAR onramp surfaces on theme-aware tokens', () => {
    const { container } = render(<ZarOnramp token="test-token" />)

    expect(screen.getByText('Buy Crypto with ZAR')).toBeInTheDocument()
    expect(container.querySelector('.bg-card')).toBeInTheDocument()
    expect(screen.getByText(/Instant bank transfer via Ozow/)).toHaveClass('text-muted-foreground')
  })

  it('keeps payment request surfaces theme-aware and the QR scan field light', () => {
    const { container } = render(<RequestPageClient requestId="request-1" />)

    expect(container.firstElementChild).toHaveClass('bg-background')
    expect(container.querySelector('.bg-card')).toBeInTheDocument()
    expect(screen.getByText('Payment Request')).toBeInTheDocument()
    expect(container.querySelector('.bg-white')).toBeInTheDocument()
  })
})
