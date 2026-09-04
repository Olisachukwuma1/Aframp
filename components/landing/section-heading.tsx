export function SectionHeading({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow?: string
  title: string
  blurb?: string
}) {
  return (
    <div className="text-center">
      {eyebrow && (
        <span className="bg-brand/15 text-brand inline-block rounded-full px-3 py-1 text-xs">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      {blurb && <p className="text-dim mx-auto mt-3 max-w-xl text-sm leading-relaxed">{blurb}</p>}
    </div>
  )
}
