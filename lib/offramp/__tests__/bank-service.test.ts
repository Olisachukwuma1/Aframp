import {
  SAVED_ACCOUNTS_STORAGE_KEY,
  ResolutionUnsupportedError,
  buildKycMessage,
  fetchBanks,
  getOfframpFormCurrency,
  getSavedAccounts,
  getSelectedOfframpAccount,
  saveAccount,
  setSelectedOfframpAccount,
  verifyAccountNumber,
  type BankAccount,
} from '@/lib/offramp/bank-service'
import { NIGERIAN_BANKS } from '@/lib/offramp/bank-directory'

const kenyanAccount: Omit<BankAccount, 'id'> = {
  country: 'KE',
  currency: 'KES',
  bankName: 'Equity Bank Kenya',
  bankCode: '68',
  accountNumber: '01234567890',
  accountName: 'ASHA WANJIKU',
  accountNameSource: 'manual',
}

describe('saved accounts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a non-Nigerian account with its currency intact', () => {
    saveAccount(kenyanAccount)

    const [saved] = getSavedAccounts()
    expect(saved.country).toBe('KE')
    expect(saved.currency).toBe('KES')
    expect(saved.accountNameSource).toBe('manual')
  })

  it('treats the same account number in two countries as two accounts', () => {
    saveAccount({ ...kenyanAccount, accountNumber: '0123456789' })
    saveAccount({
      ...kenyanAccount,
      country: 'NG',
      currency: 'NGN',
      bankName: 'Access Bank',
      bankCode: '044',
      accountNumber: '0123456789',
    })

    expect(getSavedAccounts()).toHaveLength(2)
  })

  it('still de-duplicates the same account in the same country', () => {
    saveAccount(kenyanAccount)
    saveAccount({ ...kenyanAccount, accountName: 'ASHA W' })

    const accounts = getSavedAccounts()
    expect(accounts).toHaveLength(1)
    expect(accounts[0].accountName).toBe('ASHA W')
  })

  it('migrates accounts saved before the offramp supported other countries', () => {
    // Pre-migration shape: no country, no currency, no name source.
    localStorage.setItem(
      SAVED_ACCOUNTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'legacy',
          bankName: 'Access Bank',
          bankCode: '044',
          accountNumber: '0123456789',
          accountName: 'CHUKWUEMEKA OKAFOR',
        },
      ])
    )

    const [migrated] = getSavedAccounts()
    expect(migrated.country).toBe('NG')
    expect(migrated.currency).toBe('NGN')
    // The logo is recovered from the static list rather than lost.
    expect(migrated.bankLogo).toBe(NIGERIAN_BANKS.find((bank) => bank.code === '044')?.logo)
  })

  it('returns an empty list rather than throwing on corrupt storage', () => {
    localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, 'not json')
    expect(getSavedAccounts()).toEqual([])
  })
})

describe('selected offramp account', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('carries the destination account and currency to the review step', () => {
    setSelectedOfframpAccount({ ...kenyanAccount, id: 'abc' })

    const selected = getSelectedOfframpAccount()
    expect(selected?.currency).toBe('KES')
    expect(selected?.bankName).toBe('Equity Bank Kenya')
  })

  it('is null when nothing has been chosen yet', () => {
    expect(getSelectedOfframpAccount()).toBeNull()
  })
})

describe('getOfframpFormCurrency', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reads the currency the customer priced their withdrawal in', () => {
    localStorage.setItem(
      'offramp:form',
      JSON.stringify({ data: { fiatCurrency: 'GHS' }, timestamp: Date.now() })
    )

    expect(getOfframpFormCurrency()).toBe('GHS')
  })

  it('is null when the calculator has not been used', () => {
    expect(getOfframpFormCurrency()).toBeNull()
  })
})

describe('buildKycMessage', () => {
  it('states the amount in the destination currency, not naira', () => {
    expect(buildKycMessage(5000, '01234567890', 'KES')).toContain('account 01234567890')
    expect(buildKycMessage(5000, '01234567890', 'KES')).not.toContain('₦')
    expect(buildKycMessage(5000, '0123456789', 'NGN')).toContain('₦')
  })
})

describe('fetchBanks', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('returns the list the API serves', async () => {
    const payload = {
      country: 'GH',
      currency: 'GHS',
      source: 'paystack',
      banks: [{ id: 'gh-130100', name: 'Ecobank Ghana', code: '130100', country: 'GH' }],
    }
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) })

    await expect(fetchBanks('GH')).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith('/api/offramp/banks?country=GH')
  })

  it('falls back to the static list when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    const result = await fetchBanks('NG')
    expect(result.source).toBe('static')
    expect(result.banks).toEqual(NIGERIAN_BANKS)
  })

  it('reports the list unavailable when there is nothing to fall back to', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })

    const result = await fetchBanks('KE')
    expect(result.source).toBe('unavailable')
    expect(result.banks).toEqual([])
  })
})

describe('verifyAccountNumber', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('rejects a badly formatted account number without calling the API', async () => {
    await expect(verifyAccountNumber('NG', '044', '12345')).rejects.toThrow('10 digits')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not attempt a lookup in markets that have none', async () => {
    await expect(verifyAccountNumber('KE', '68', '01234567890')).rejects.toBeInstanceOf(
      ResolutionUnsupportedError
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns the resolved account holder name', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ accountName: 'CHUKWUEMEKA OKAFOR' }),
    })

    await expect(verifyAccountNumber('NG', '044', '0123456789')).resolves.toBe('CHUKWUEMEKA OKAFOR')
  })

  it('surfaces an unsupported lookup so the form can ask for the name instead', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: 'RESOLUTION_UNSUPPORTED' }),
    })

    await expect(verifyAccountNumber('NG', '044', '0123456789')).rejects.toBeInstanceOf(
      ResolutionUnsupportedError
    )
  })

  it('passes a gateway failure message through to the customer', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: () =>
        Promise.resolve({ error: 'RESOLUTION_FAILED', message: 'Check the account number.' }),
    })

    await expect(verifyAccountNumber('NG', '044', '0123456789')).rejects.toThrow(
      'Check the account number.'
    )
  })
})
