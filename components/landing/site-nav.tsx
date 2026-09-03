'use client'

import Link from 'next/link'
import { LayoutGrid, Sun, Wallet } from 'lucide-react'

import { AframpMark } from '@/components/brand/aframp-mark'
import { useSession } from '@/components/session-provider'
import { nav } from '@/lib/landing-data'

export function SiteNav() {
  const { session, ready } = useSession()
  // Signed-in visitors get a way straight back into the app — the job the
  // old redirect-at-/ did, without making the landing page unreachable.
  const signedIn = ready && Boolean(session)

  return (
    <div className="sticky top-4 z-50 flex justify-center px-4">
      <nav className="bg-band/90 border-edge flex w-full max-w-4xl items-center gap-6 rounded-full border py-2.5 pr-2.5 pl-4 backdrop-blur-md">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <AframpMark className="size-8" />
          <span className="text-lg font-bold tracking-tight text-white">Aframp</span>
        </Link>

        <ul className="text-dim hidden items-center gap-6 text-sm md:flex">
          {nav.map(({ label, href }) => (
            <li key={label}>
              <a href={href} className="hover:text-white">
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          <button
            type="button"
            aria-label="Toggle theme"
            className="text-dim hidden hover:text-white sm:block"
          >
            <Sun className="size-[18px]" />
          </button>
          {signedIn && (
            <Link href="/home" className="text-dim hidden text-sm hover:text-white sm:block">
              Explore
            </Link>
          )}
          <Link
            href={signedIn ? '/charge' : '/login'}
            className="bg-brand flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            {signedIn ? <LayoutGrid className="size-4" /> : <Wallet className="size-4" />}
            {signedIn ? 'Dashboard' : 'Connect'}
          </Link>
        </div>
      </nav>
    </div>
  )
}
