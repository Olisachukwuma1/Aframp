import { buildDailyRevenue, assetsInSeries } from '../revenue'
import type { Payment } from '../api'

describe('revenue', () => {
  const mockNow = new Date('2024-01-10T12:00:00Z')

  describe('buildDailyRevenue', () => {
    it('should aggregate payments by day and asset', () => {
      const payments: Payment[] = [
        {
          id: '1',
          amount_stroops: 1000000n,
          asset: 'XLM',
          status: 'confirmed',
          created_at: '2024-01-09T10:00:00Z',
        } as Payment,
        {
          id: '2',
          amount_stroops: 500000n,
          asset: 'XLM',
          status: 'confirmed',
          created_at: '2024-01-09T14:00:00Z',
        } as Payment,
      ]

      const result = buildDailyRevenue(payments, mockNow)
      const day = result.find((d) => d.date === '2024-01-09')

      expect(day).toBeDefined()
      expect(day?.totals.XLM).toBeCloseTo(0.15, 5) // 1500000 stroops / 10^7
    })

    it('should warn when stroops exceed MAX_SAFE_INTEGER', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const bigBalance = BigInt(Number.MAX_SAFE_INTEGER) + 1000000n

      const payments: Payment[] = [
        {
          id: '1',
          amount_stroops: bigBalance,
          asset: 'XLM',
          status: 'confirmed',
          created_at: '2024-01-09T10:00:00Z',
        } as Payment,
      ]

      buildDailyRevenue(payments, mockNow)

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Precision loss')
      )
      warnSpy.mockRestore()
    })

    it('should ignore unconfirmed payments', () => {
      const payments: Payment[] = [
        {
          id: '1',
          amount_stroops: 1000000n,
          asset: 'XLM',
          status: 'pending',
          created_at: '2024-01-09T10:00:00Z',
        } as Payment,
      ]

      const result = buildDailyRevenue(payments, mockNow)
      const day = result.find((d) => d.date === '2024-01-09')

      expect(day?.totals.XLM).toBeUndefined()
    })

    it('should handle payments from different assets separately', () => {
      const payments: Payment[] = [
        {
          id: '1',
          amount_stroops: 1000000n,
          asset: 'XLM',
          status: 'confirmed',
          created_at: '2024-01-09T10:00:00Z',
        } as Payment,
        {
          id: '2',
          amount_stroops: 1000000n,
          asset: 'cNGN',
          status: 'confirmed',
          created_at: '2024-01-09T11:00:00Z',
        } as Payment,
      ]

      const result = buildDailyRevenue(payments, mockNow)
      const day = result.find((d) => d.date === '2024-01-09')

      expect(day?.totals.XLM).toBeDefined()
      expect(day?.totals.cNGN).toBeDefined()
      expect(day?.totals.XLM).not.toEqual(day?.totals.cNGN)
    })
  })

  describe('assetsInSeries', () => {
    it('should return unique assets in first-seen order', () => {
      const entries = [
        { date: '2024-01-08', label: 'Tue', totals: { XLM: 1.0, cNGN: 2.0 } },
        { date: '2024-01-09', label: 'Wed', totals: { cNGN: 3.0, USDC: 1.5 } },
      ]

      const assets = assetsInSeries(entries)

      expect(assets).toEqual(['XLM', 'cNGN', 'USDC'])
    })
  })
})
