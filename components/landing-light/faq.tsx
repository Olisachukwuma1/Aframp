import { faqs } from '@/lib/landing-light-data'

export function Faq() {
  return (
    <section id="faq" className="bg-mint dark:bg-band px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-brand-deep dark:text-brand text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently Asked Questions
        </h2>

        <div className="mt-12">
          {faqs.map(({ q, a }, i) => (
            // <details> keeps the accordion working without shipping JS.
            <details
              key={q}
              open={i === 0}
              className="border-black/5 dark:border-edge group border-b py-4 last:border-0"
            >
              <summary className="text-brand-deep dark:text-brand flex cursor-pointer list-none items-start gap-4 text-sm font-medium marker:content-none">
                <span className="flex-1">{q}</span>
                <span
                  aria-hidden="true"
                  className="text-charcoal/60 dark:text-white/60 shrink-0 text-lg leading-none select-none"
                >
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <p className="text-charcoal/75 dark:text-white/70 mt-3 pr-10 text-xs leading-relaxed">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
