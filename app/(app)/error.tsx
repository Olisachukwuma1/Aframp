'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import ErrorLayout from '@/components/error/ErrorLayout'

/**
 * Next.js unmounts app/(app)/layout.tsx (and the `dark` class it supplies)
 * before rendering an error boundary for a segment nested under it — so
 * without this file, an error thrown on any dashboard page falls through to
 * the root app/error.tsx with no dark ancestor, flashing to a light screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  const isBackendDown = 'status' in error && (error as { status: number }).status === 0

  return (
    <div className="dark bg-ink">
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
          { label: 'Go home', href: '/home' },
        ]}
      />
    </div>
  )
}
