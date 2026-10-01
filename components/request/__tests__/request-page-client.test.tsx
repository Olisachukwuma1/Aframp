import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { RequestPageClient } from '../request-page-client'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('react-qr-code', () => () => null)

describe('RequestPageClient copy actions', () => {
  const writeText = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    ;(useRouter as jest.Mock).mockReturnValue({ back: jest.fn() })
    window.history.replaceState({}, '', '/')
  })

  it('copies the wallet address and shows feedback only on that button', async () => {
    render(<RequestPageClient requestId="123456" />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH'
      )
    )
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy payment link' })).toBeInTheDocument()
  })

  it('copies the current page URL and shows feedback on the link button', async () => {
    window.history.replaceState({}, '', '/request/123456?source=merchant')
    render(<RequestPageClient requestId="123456" />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy payment link' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href))
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy SEP-7 URI' })).toBeInTheDocument()
  })

  it('copies the QR SEP-7 URI and shows feedback on the URI button', async () => {
    render(<RequestPageClient requestId="123456" />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy SEP-7 URI' }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'stellar:GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH?amount=100&memo=123456'
      )
    )
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy payment link' })).toBeInTheDocument()
  })
})