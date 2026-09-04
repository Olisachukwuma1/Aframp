import { Hexagon, Send, Zap } from 'lucide-react'

import { networks } from '@/lib/landing-data'
import { SectionHeading } from '@/components/landing/section-heading'

const icons = [Send, Hexagon, Zap]

export function Networks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        eyebrow="Multi-Chain Support"
        title="Built on the Best Networks"
        blurb="Aframp leverages multiple blockchain networks to provide you with the fastest, cheapest, and most secure transactions across Africa."
      />

      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {networks.map(({ name, ticker, blurb }, i) => {
          const Icon = icons[i]
          return (
            <li
              key={name}
              className="border-edge bg-surface rounded-2xl border p-7 text-center transition-colors hover:border-white/20"
            >
              <span className="bg-brand/15 mx-auto flex size-11 items-center justify-center rounded-full">
                <Icon className="text-brand size-5" />
              </span>
              <p className="mt-5 flex items-center justify-center gap-2">
                <span className="font-bold text-white">{name}</span>
                <span className="bg-brand/15 text-brand rounded px-1.5 py-0.5 text-[10px] font-bold">
                  {ticker}
                </span>
              </p>
              <p className="text-dim mt-2 text-sm">{blurb}</p>
            </li>
          )
        })}
      </ul>

      <p className="text-dim mt-10 text-center text-sm">
        More networks coming soon — Base, Solana, and Polygon
      </p>
    </section>
  )
}
