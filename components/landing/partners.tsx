import { partners } from '@/lib/landing-data'

export function Partners() {
  // Duplicated once so the marquee can loop without a visible seam.
  const lane = [...partners, ...partners]

  return (
    <section className="border-edge bg-band border-y py-10">
      <p className="text-dim text-center text-[11px] tracking-[0.18em] uppercase">
        Integrated with Africa&apos;s leading platforms
      </p>

      <div className="mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        {/* Spacing lives on each item, not as a flex gap, so translating the
            lane by exactly -50% lands on the duplicate with no seam. */}
        <ul className="animate-marquee flex w-max items-center">
          {lane.map(({ name, badge }, i) => (
            <li key={`${name}-${i}`} className="mr-14 flex shrink-0 items-center gap-3">
              <span className="border-edge text-brand flex size-7 items-center justify-center rounded-full border text-[10px] font-bold">
                {badge}
              </span>
              <span className="text-dim text-sm whitespace-nowrap">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
