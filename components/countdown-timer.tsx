'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  expiresAt: Date
  onExpire?: () => void
}

function secondsUntil(target: Date): number {
  return Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000))
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  // Seeded from the real remaining time, not zero — otherwise the first paint
  // reads "00:00" for a full second before the interval corrects it.
  const [remaining, setRemaining] = useState(() => secondsUntil(expiresAt))

  // Held in a ref so a caller passing an inline arrow doesn't restart the timer
  // on every render.
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    setRemaining(secondsUntil(expiresAt))
    const timer = setInterval(() => {
      const next = secondsUntil(expiresAt)
      setRemaining(next)
      if (next === 0) {
        clearInterval(timer) // stop, rather than firing onExpire every second
        onExpireRef.current?.()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  const expired = remaining === 0
  const urgent = !expired && remaining < 120

  return (
    <div
      role="timer"
      aria-live={urgent ? 'polite' : 'off'}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
        expired
          ? 'bg-destructive/10 text-destructive'
          : urgent
            ? 'bg-accent/15 text-accent-foreground'
            : 'bg-muted text-muted-foreground'
      )}
    >
      <Clock className="size-4" aria-hidden />
      {expired ? (
        <span>Expired</span>
      ) : (
        <span>
          Expires in{' '}
          <span className="tabular-nums">
            {String(Math.floor(remaining / 60)).padStart(2, '0')}:
            {String(remaining % 60).padStart(2, '0')}
          </span>
        </span>
      )}
    </div>
  )
}
