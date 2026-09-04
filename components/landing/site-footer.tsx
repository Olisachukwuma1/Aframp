import { AframpMark } from '@/components/brand/aframp-mark'
import { footerColumns, socials } from '@/lib/landing-data'

export function SiteFooter() {
  return (
    <footer className="border-edge bg-surface border-t px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <span className="flex items-center gap-2.5">
              <AframpMark className="size-8" />
              <span className="text-lg font-bold tracking-tight text-white">Aframp</span>
            </span>
            <p className="text-dim mt-4 max-w-[16rem] text-xs leading-relaxed">
              Africa&apos;s premier cNGN payment platform. Buy crypto, pay bills, grow your
              business.
            </p>
            <span className="border-edge text-dim mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]">
              <span className="bg-brand size-1.5 rounded-full" />
              CBN Licensed
            </span>
          </div>

          {footerColumns.map(({ title, links }) => (
            <div key={title}>
              <p className="text-sm font-bold text-white">{title}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map((l) => (
                  <li key={l}>
                    <button type="button" className="text-dim text-xs hover:text-white">
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-edge mt-12 flex flex-wrap items-center gap-4 border-t pt-6">
          <p className="text-dim text-xs">© 2026 Aframp Technologies Ltd. All rights reserved.</p>
          <ul className="ml-auto flex gap-5">
            {socials.map((s) => (
              <li key={s}>
                <button type="button" className="text-dim text-xs hover:text-white">
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
