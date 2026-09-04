'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import ErrorLayout from '@/components/error/ErrorLayout'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  // ApiError with status 0 means the backend is unreachable (network failure /
  // CORS rejection). Show a specific message so users aren't left confused.
  const isBackendDown = 'status' in error && (error as { status: number }).status === 0

  return (
    <ErrorLayout
      status={500}
      title={isBackendDown ? 'Payment server unreachable' : 'Something went wrong'}
      message={
        isBackendDown
          ? "We can't connect to the payment server right now. Please try again in a moment."
          : "The page couldn't load. Try again, and if it keeps happening let us know."
      }
      actions={[
        { label: 'Try again', onClick: reset },
        { label: 'Go home', href: '/' },
      ]}
    />
  )
}
