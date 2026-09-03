import Link from 'next/link'
import { ArrowDownToLine, Banknote, Receipt, Wallet } from 'lucide-react'

const actions = [
  { label: 'Charge', icon: Banknote, tint: '#166534', href: '/charge' },
  { label: 'Payments', icon: Receipt, tint: '#1e40af', href: '/transactions' },
  { label: 'Cash out', icon: ArrowDownToLine, tint: '#10b981', href: '/withdraw' },
  { label: 'Wallet', icon: Wallet, tint: '#b1cd00', href: '/wallet' },
]

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map(({ label, icon: Icon, tint, href }) => (
        <Link
          key={label}
          href={href}
          title={label}
          aria-label={label}
          style={{ backgroundColor: tint }}
          className="flex size-11 items-center justify-center rounded-full text-white transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </Link>
      ))}
    </div>
  )
}
