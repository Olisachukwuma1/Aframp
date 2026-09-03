import { Sparkles, Wallet } from 'lucide-react'

export function FinalCta() {
  return (
    <section id="cta" className="bg-band border-edge border-t px-6 py-24 text-center">
      <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Ready to join Africa&apos;s financial revolution?
      </h2>
      <p className="text-dim mx-auto mt-5 max-w-lg text-sm leading-relaxed">
        Over 50,000 Africans are already using Aframp to buy crypto, pay bills, and grow their
        businesses. Start your journey today.
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <a
          href="/login"
          className="bg-brand flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          <Wallet className="size-4" />
          Connect Wallet
        </a>
        <button
          type="button"
          className="border-edge bg-surface flex items-center gap-2 rounded-full border px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/5"
        >
          <Sparkles className="size-4" />
          Mint NFT
        </button>
      </div>

      <p className="text-dim mt-7 text-xs">
        Free forever for personal use. No credit card required.
      </p>
    </section>
  )
}
