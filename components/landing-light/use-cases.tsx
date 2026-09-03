import { ArrowRight, Building2, CreditCard, Globe, ShieldCheck, Wallet, Zap } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useCaseTiles, useCasesLead } from '@/lib/landing-light-data'

const tileIcons = [CreditCard, Building2, Zap, ShieldCheck, Globe]

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-black/10 dark:border-edge text-charcoal/70 dark:text-dim rounded border px-2 py-0.5 text-[11px]">
      {children}
    </span>
  )
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'border-black/5 dark:border-edge bg-white dark:bg-surface rounded-2xl border p-6',
        className
      )}
    >
      {children}
    </div>
  )
}

function IconBadge({ icon: Icon }: { icon: typeof Wallet }) {
  return (
    <span className="bg-brand/15 flex size-10 items-center justify-center rounded-full">
      <Icon className="text-brand size-5" />
    </span>
  )
}

export function UseCases() {
  return (
    <section id="use-cases" className="bg-white dark:bg-surface px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-brand-deep dark:text-brand text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Everything You Need to Transact
        </h2>
        <p className="text-charcoal/70 dark:text-white/70 mx-auto mt-3 max-w-xl text-center text-sm">
          From buying your first USDC to running a business on Aframp. Built for Africa, by
          Africans.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {/* Lead tile: copy on the left, a live-rate strip and recent
              activity on the right. */}
          <Card className="md:col-span-2">
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <IconBadge icon={Wallet} />
                <h3 className="text-charcoal dark:text-white mt-5 font-bold">
                  {useCasesLead.title}
                </h3>
                <p className="text-charcoal/70 dark:text-white/70 mt-2 text-sm leading-relaxed">
                  {useCasesLead.blurb}
                </p>

                <div className="border-black/5 dark:border-edge bg-mint dark:bg-band mt-5 flex items-center gap-3 rounded-xl border px-4 py-3">
                  <span className="text-charcoal dark:text-white text-sm font-bold">
                    {useCasesLead.rate.left}
                  </span>
                  <span className="text-charcoal/50 dark:text-white/50 text-sm">=</span>
                  <span className="text-brand-deep dark:text-brand text-sm font-bold">
                    {useCasesLead.rate.right}
                  </span>
                  <span className="bg-brand/15 text-brand-deep dark:text-brand ml-auto flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px]">
                    <span className="bg-brand size-1.5 rounded-full" />
                    Live
                  </span>
                </div>
              </div>

              <ul className="space-y-2 sm:pt-2">
                {useCasesLead.ticker.map(({ label, amount }) => (
                  <li
                    key={label}
                    className="border-black/5 dark:border-edge bg-mint dark:bg-band flex items-center gap-2 rounded-lg border px-3 py-2.5"
                  >
                    <span className="bg-brand size-1.5 shrink-0 rounded-full" />
                    <span className="text-charcoal dark:text-white text-sm">{label}</span>
                    <span className="text-charcoal/60 dark:text-white/60 ml-auto text-sm">
                      {amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {useCaseTiles.map(({ title, blurb, chips, metric }, i) => (
            <Card key={title}>
              <IconBadge icon={tileIcons[i]} />
              <h3 className="text-charcoal dark:text-white mt-5 font-bold">{title}</h3>
              <p className="text-charcoal/70 dark:text-white/70 mt-2 text-sm leading-relaxed">
                {blurb}
              </p>

              {metric && (
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-brand-deep dark:text-brand text-lg font-bold">
                    {metric.value}
                  </span>
                  <span className="text-charcoal/60 dark:text-dim text-xs">{metric.label}</span>
                </p>
              )}

              {chips && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a
            href="#how-it-works"
            className="bg-brand inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Explore Aframp
            <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
