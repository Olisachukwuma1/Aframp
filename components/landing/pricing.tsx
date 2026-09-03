import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { tiers } from '@/lib/landing-data'

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Simple, transparent pricing
      </h2>
      <p className="text-dim mt-3 text-center text-sm">
        Start free, upgrade when you&apos;re ready. No hidden fees, ever.
      </p>

      <div className="mt-14 grid items-start gap-5 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              'relative rounded-2xl border p-7',
              tier.featured
                ? 'border-brand bg-brand/[0.06] md:-mt-4 md:pb-10'
                : 'border-edge bg-surface'
            )}
          >
            {tier.featured && (
              <span className="bg-brand absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold whitespace-nowrap text-black">
                Most Popular
              </span>
            )}

            <h3 className="font-bold text-white">{tier.name}</h3>
            <p className="text-dim mt-1 text-xs">{tier.audience}</p>

            <p className="mt-6 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white">{tier.price}</span>
              <span className="text-dim text-xs">{tier.priceNote}</span>
            </p>

            <ul className="mt-6 space-y-3">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="text-brand mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
                  <span className="text-bright">{f}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={cn(
                'mt-7 w-full rounded-full py-2.5 text-sm font-bold transition-opacity hover:opacity-90',
                tier.featured
                  ? 'bg-brand text-black'
                  : 'border-edge bg-raised text-bright border hover:bg-white/5'
              )}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
