'use client'

import Link from 'next/link'
import { ReferralCard } from '@/components/referral/referral-card'
import { useWallet } from '@/hooks/useWallet'
import { useWalletConnection } from '@/hooks/use-wallet-connection'
import { useReferral } from '@/hooks/use-referral'
import { MousePointerClick, Users, Coins, History } from 'lucide-react'

export function ReferralPageClient() {
  const { publicKey } = useWallet()
  const { address } = useWalletConnection()
  const walletAddress = address || publicKey || ''
  const { stats } = useReferral(walletAddress)

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <header>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Referral Program</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite friends to Aframp. They get 10% off their first ramp — you earn fee rebates.
          </p>
        </header>

        {walletAddress ? (
          <>
            <ReferralCard walletAddress={walletAddress} />

            {/* Analytics snapshot */}
            {stats && (stats.clickCount > 0 || stats.conversionCount > 0) && (
              <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground text-sm">Referral History</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Total link clicks</span>
                    </div>
                    <span className="font-semibold text-foreground">{stats.clickCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Completed conversions</span>
                    </div>
                    <span className="font-semibold text-foreground">{stats.conversionCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Total rebates earned</span>
                    </div>
                    <span className="font-semibold text-primary">
                      {stats.totalRebatesEarned > 0
                        ? `₦${stats.totalRebatesEarned.toLocaleString()}`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Conversion rate insight */}
            {stats && stats.clickCount > 0 && (
              <div className="rounded-3xl border border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                Conversion rate:{' '}
                <strong className="text-foreground">
                  {((stats.conversionCount / stats.clickCount) * 100).toFixed(1)}%
                </strong>
                {' '}({stats.conversionCount} of {stats.clickCount} clicks converted)
              </div>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Connect your wallet to access your referral code.
          </div>
        )}

        <div className="rounded-3xl border border-border bg-muted/20 p-6 space-y-3 text-sm text-muted-foreground">
          <h3 className="font-semibold text-foreground">How it works</h3>
          <ol className="space-y-2 list-decimal list-inside">
            <li>Share your unique referral link</li>
            <li>Your friend clicks the link and applies the code before their first ramp</li>
            <li>They get <strong className="text-foreground">10% off</strong> their first ramp fees</li>
            <li>You earn a <strong className="text-foreground">5% fee rebate</strong> on their transaction</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
