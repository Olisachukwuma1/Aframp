import { Download, Repeat, Rocket, WalletCards } from 'lucide-react'

import { steps } from '@/lib/landing-data'

const icons = [Download, WalletCards, Repeat, Rocket]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-edge bg-band border-y py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Get started in minutes
        </h2>
        <p className="text-dim mt-3 text-center text-sm">
          No complex KYC. No hidden fees. Just simple, secure transactions.
        </p>

        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ title, blurb }, i) => {
            const Icon = icons[i]
            return (
              <li key={title} className="relative text-center">
                {/* Connector to the next step, desktop only. */}
                {i < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="bg-edge absolute top-7 left-[calc(50%+2.5rem)] hidden h-px w-[calc(100%-5rem)] lg:block"
                  />
                )}

                <span className="relative inline-flex">
                  <span className="border-edge bg-surface flex size-14 items-center justify-center rounded-2xl border">
                    <Icon className="text-brand size-6" />
                  </span>
                  <span className="bg-brand absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-black">
                    {i + 1}
                  </span>
                </span>

                <h3 className="mt-5 font-bold text-white">{title}</h3>
                <p className="text-dim mx-auto mt-2 max-w-[15rem] text-xs leading-relaxed">
                  {blurb}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
