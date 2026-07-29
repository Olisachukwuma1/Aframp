import { NextResponse } from 'next/server'
import { generateReferralCode } from '@/lib/referral'
import { getStatsByCode } from '@/lib/referral/analytics'

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')

  if (!wallet) {
    return NextResponse.json({ error: 'wallet query parameter required' }, { status: 400 })
  }

  const code = generateReferralCode(wallet)
  const stats = getStatsByCode(code)

  return NextResponse.json({
    code,
    ownerAddress: wallet,
    clickCount: stats?.clickCount ?? 0,
    conversionCount: stats?.conversionCount ?? 0,
    totalRebatesEarned: stats?.totalRebatesEarned ?? 0,
  })
}
