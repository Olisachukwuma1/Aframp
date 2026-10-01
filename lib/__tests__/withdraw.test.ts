import {
  getBankOptions,
  getWithdrawableAssets,
  getWithdrawalAssetConfig,
  WITHDRAWAL_ASSETS,
  WITHDRAWAL_ASSET_CONFIG,
  validateWithdrawal,
} from '@/lib/withdraw'
import type { Balance } from '@/lib/api'

function balance(asset: string, available: bigint): Balance {
  return { merchant_id: 'm', asset, available, pending: 0n, updated_at: '' }
}

describe('WITHDRAWAL_ASSET_CONFIG', () => {
  it('defines cNGN, cKES and cGHS with distinct minimums', () => {
    expect(WITHDRAWAL_ASSETS).toEqual(['cNGN', 'cKES', 'cGHS'])
    const minimums = WITHDRAWAL_ASSETS.map((asset) => WITHDRAWAL_ASSET_CONFIG[asset].minimumStroops)
    expect(new Set(minimums).size).toBe(3)
  })

  it('maps each asset to the correct country', () => {
    expect(getWithdrawalAssetConfig('cNGN').country).toBe('Nigeria')
    expect(getWithdrawalAssetConfig('cKES').country).toBe('Kenya')
    expect(getWithdrawalAssetConfig('cGHS').country).toBe('Ghana')
  })

  it.each([
    ['cNGN', 100_000n],
    ['cKES', 100_000n],
    ['cGHS', 100_000n],
  ] as const)('%s uses its configured currency sub-unit precision', (asset, precision) => {
    expect(getWithdrawalAssetConfig(asset).minimumPrecisionStroops).toBe(precision)
  })
})

describe('getBankOptions', () => {
  it('filters banks to the selected asset country', () => {
    expect(getBankOptions('cNGN')[0].name).toBe('Access Bank')
    expect(getBankOptions('cKES')[0].name).toBe('M-PESA')
    expect(getBankOptions('cGHS')[0].name).toBe('MTN Mobile Money')
  })
})

describe('getWithdrawableAssets', () => {
  it('returns only non-zero withdrawal balances in canonical order', () => {
    const balances = [
      balance('XLM', 100n),
      balance('cGHS', 500n),
      balance('cNGN', 0n),
      balance('cKES', 10n),
    ]
    expect(getWithdrawableAssets(balances)).toEqual(['cKES', 'cGHS'])
  })

  it('returns empty when no withdrawal asset has a balance', () => {
    expect(getWithdrawableAssets([balance('XLM', 100n), balance('cNGN', 0n)])).toEqual([])
  })
})

describe('validateWithdrawal', () => {
  const config = getWithdrawalAssetConfig('cNGN')
  const available = 1_000_000_000n
  const validAmount = 500_000_000n
  const validAccount = '0123456789'

  it.each([null, 0n, -1n])('requires a positive parsed amount (%s)', (amount) => {
    expect(validateWithdrawal(amount, config, available, '044', validAccount)).toBe(
      'Enter an amount to cash out.'
    )
  })

  it('rejects amounts below the configured precision', () => {
    expect(validateWithdrawal(validAmount + 1n, config, available, '044', validAccount)).toBe(
      'Amount must have at most 2 decimal places.'
    )
  })

  it('rejects amounts below the asset minimum', () => {
    expect(validateWithdrawal(100_000n, config, available, '044', validAccount)).toBe(
      'The smallest cash-out is 50 cNGN.'
    )
  })

  it('rejects amounts above the available balance', () => {
    expect(validateWithdrawal(1_000_100_000n, config, available, '044', validAccount)).toBe(
      'That is more than your available balance.'
    )
  })

  it('requires a bank selection', () => {
    expect(validateWithdrawal(validAmount, config, available, '', validAccount)).toBe(
      'Choose your bank.'
    )
  })

  it('requires an account number with the configured length', () => {
    expect(validateWithdrawal(validAmount, config, available, '044', '123')).toBe(
      'Account numbers are 10 digits.'
    )
  })

  it('accepts a valid withdrawal', () => {
    expect(validateWithdrawal(validAmount, config, available, '044', validAccount)).toBeNull()
  })
})
