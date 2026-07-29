'use client'

import { Suspense } from 'react'
import { OfframpWalletGuard } from '@/components/offramp/offramp-wallet-guard'
import { OfframpBankDetailsClient } from '@/components/offramp/offramp-bank-details-client'

export default function OfframpBankDetailsPage() {
  return (
    <OfframpWalletGuard>
      {/* OfframpBankDetailsClient reads the order id via useSearchParams. */}
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <OfframpBankDetailsClient />
      </Suspense>
    </OfframpWalletGuard>
  )
}
