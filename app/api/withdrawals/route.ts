/**
 * POST /api/withdrawals
 *
 * Initiates a fiat withdrawal (offramp).  Two independent controls run here on
 * the backend, and the frontend cannot bypass either:
 *
 *   1. **KYC tier limit** — how much this customer is permitted to move.
 *   2. **AML screening**  — whether this particular movement is suspicious.
 *
 * They are separate on purpose.  A customer well inside their limit can still
 * be structuring; a customer over their limit is not thereby suspicious.  The
 * limit check runs first because it is local and cheap, so an over-limit
 * request never spends a paid screening call.
 *
 * Request body (JSON):
 *   {
 *     userId:      string   — wallet public key
 *     amountCents: number   — withdrawal amount in cents (USD)
 *     asset:       string   — e.g. "cNGN", "USDC"
 *     chain:       string   — e.g. "Stellar"
 *     kycTier:     KycTier  — "TIER_0" | "TIER_1" | "TIER_2" | "TIER_3"
 *     jurisdiction: "NG" | "KE" | "GH" | "ZA" | "UG"
 *                            — required: reporting thresholds and SAR filing
 *                              deadlines are per-market, so screening cannot be
 *                              performed correctly without it
 *     accountName?:   string — bank / mobile-money account holder; screened
 *                              against sanctions and PEP lists
 *     accountNumber?: string — destination account; hashed before it reaches
 *                              the monitoring ledger, never stored raw
 *     walletAddress?: string — counterparty address; screened for wallet risk
 *   }
 *
 * Success 200:
 *   { orderId, status, remaining, resetAt }
 *
 * Error 400: invalid request body
 * Error 403: limit exceeded or KYC required   (WithdrawalLimitError body)
 * Error 403: held or blocked by screening     (COMPLIANCE_BLOCKED body)
 * Error 503: screening could not be performed
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canWithdraw } from '@/lib/kyc/withdrawalLimitService'
import { WithdrawalLimitError } from '@/lib/kyc/errors'
import { isKycTier } from '@/lib/kyc/tiers'
import { screenTransaction } from '@/lib/compliance/monitor'

const RequestSchema = z.object({
  userId: z.string().min(1),
  amountCents: z.number().int().positive(),
  asset: z.string().min(1),
  chain: z.string().min(1),
  kycTier: z.string().refine(isKycTier, { message: 'Invalid KYC tier' }),
  jurisdiction: z.enum(['NG', 'KE', 'GH', 'ZA', 'UG']),
  accountName: z.string().trim().min(1).max(256).optional(),
  accountNumber: z.string().trim().min(1).max(64).optional(),
  walletAddress: z.string().trim().min(1).max(128).optional(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const {
    userId,
    amountCents,
    asset,
    chain,
    kycTier,
    jurisdiction,
    accountName,
    accountNumber,
    walletAddress,
  } = parsed.data

  // -- 1. KYC tier limit ------------------------------------------------------
  // Enforce the rolling 24-hour limit — this is the source of truth.
  const result = await canWithdraw(userId, amountCents, kycTier)

  if (!result.allowed) {
    const limitError = new WithdrawalLimitError(
      result.reason!,
      kycTier,
      result.used,
      result.remaining,
      result.resetAt
    )
    return NextResponse.json(limitError.toResponseBody(), { status: 403 })
  }

  // The id is minted before screening so the case file and the monitoring
  // ledger reference the same transaction the customer sees.
  const orderId = `OFF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  // -- 2. AML screening -------------------------------------------------------
  let screening
  try {
    screening = await screenTransaction({
      transactionId: orderId,
      userId,
      kind: 'offramp',
      amountCents,
      asset,
      chain,
      jurisdiction,
      accountName,
      accountNumber,
      walletAddress,
      counterpartyId: accountNumber ?? walletAddress,
      kycTier,
    })
  } catch (error) {
    // Screening is broken rather than adverse — a misconfigured provider or a
    // missing hash salt.  Refuse the withdrawal instead of settling it
    // unscreened, which is the exact failure this module exists to prevent.
    console.error('[withdrawals] screening failed', error)
    return NextResponse.json(
      {
        error: 'SCREENING_UNAVAILABLE',
        message: 'We could not complete required checks. Please try again shortly.',
      },
      { status: 503 }
    )
  }

  if (screening.decision === 'BLOCK' || screening.decision === 'REVIEW') {
    /*
     * BLOCK and REVIEW deliberately return the same response.
     *
     * Telling the customer which rule fired hands anyone probing our
     * thresholds a map of exactly where they sit.  More seriously, in all five
     * markets it is a separate criminal offence to tell the subject of a
     * suspicious-activity report that they are being reported ("tipping off"),
     * and a message distinguishing "under review" from "declined" leaks
     * precisely that.  The reasoning lives on the case file, which only
     * analysts can read.
     */
    return NextResponse.json(
      {
        error: 'COMPLIANCE_BLOCKED',
        message:
          'This withdrawal is being reviewed by our compliance team. We will contact you if anything further is needed.',
        // Safe to return: lets support correlate a customer enquiry to a case
        // without revealing anything about why it was flagged.
        referenceId: screening.caseId,
      },
      { status: 403 }
    )
  }

  // Both controls passed — proceed with order creation.
  // In production: persist the order to the DB, trigger the settlement flow.
  return NextResponse.json(
    {
      orderId,
      asset,
      chain,
      amountCents,
      status: 'pending',
      remaining: result.remaining,
      resetAt: result.resetAt,
    },
    { status: 200 }
  )
}
