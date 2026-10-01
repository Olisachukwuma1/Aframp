'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuthenticatedSession } from '@/components/session-provider'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { api, type PushSubscriptionRequest } from '@/lib/api'

const DISMISSED_KEY = 'aframp:push-opt-in-dismissed'

interface PushNotificationOptInProps {
  ready: boolean
}

export function PushNotificationOptIn({ ready }: PushNotificationOptInProps) {
  const { token } = useAuthenticatedSession()
  const { permission, loading, error, subscribe } = usePushNotifications()
  const [backendEnabled, setBackendEnabled] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return
    try {
      if (window.localStorage.getItem(DISMISSED_KEY) === 'true') setDismissed(true)
    } catch {
      // Keep the banner usable when browser storage is unavailable.
    }

    let cancelled = false
    api
      .getPushSubscriptionStatus(token)
      .then((status) => {
        if (!cancelled) setBackendEnabled(status.enabled)
      })
      .catch(() => {
        if (!cancelled) setBackendEnabled(null)
      })
    return () => {
      cancelled = true
    }
  }, [ready, token])

  useEffect(() => {
    function onSubscribe(event: Event) {
      const detail = (event as CustomEvent<PushSubscriptionRequest>).detail
      api
        .registerPushSubscription(token, detail)
        .then(() => setBackendEnabled(true))
        .catch((cause: unknown) =>
          setApiError(cause instanceof Error ? cause.message : 'Could not save subscription')
        )
    }

    window.addEventListener('aframp:push-subscribe', onSubscribe)
    return () => window.removeEventListener('aframp:push-subscribe', onSubscribe)
  }, [token])

  if (
    !ready ||
    backendEnabled !== false ||
    dismissed ||
    permission === 'unsupported' ||
    permission === 'denied'
  ) {
    return null
  }

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // Dismissal remains effective for this visit if storage is unavailable.
    }
  }

  return (
    <section
      aria-label="Push notifications"
      className="bg-panel border-hairline flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Bell className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-semibold">Get payment alerts</p>
          <p className="text-dim mt-0.5 text-sm">
            Know as soon as a customer payment is confirmed.
          </p>
          {(error || apiError) && (
            <p role="alert" className="text-destructive mt-2 text-xs">
              {error || apiError}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="text-dim hover:text-bright rounded-md px-3 py-2 text-sm"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={() => {
            setApiError(null)
            void subscribe()
          }}
          disabled={loading}
          className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? 'Enabling…' : 'Enable'}
        </button>
        <button
          type="button"
          aria-label="Dismiss notification prompt"
          onClick={dismiss}
          className="text-dim hover:text-bright rounded-md p-2"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  )
}
