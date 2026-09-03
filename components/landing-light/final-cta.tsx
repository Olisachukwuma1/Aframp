import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function FinalCta() {
  return (
    <section className="bg-charcoal px-6 py-24 text-center">
      <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Ready to get started?
      </h2>
      <p className="mt-4 text-base text-white/80">
        Use Aframp today and experience instant Stellar USDC payments.
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-4">
        <Link
          href="/signup"
          className="bg-brand inline-flex items-center gap-2.5 rounded-full px-7 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Buy USDC
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2.5 rounded-full border border-white/60 px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Spend USDC
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  )
}
