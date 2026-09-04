'use client'

import { createContext, useContext } from 'react'

/**
 * Radix portals (Select, Dialog, Popover, …) mount to `document.body` by
 * default — outside the dashboard's `dark` wrapper in `app/(app)/layout.tsx`,
 * since that class is scoped locally rather than set on `<html>`. Portal-based
 * primitives read this to render inside the wrapper instead, so they pick up
 * the dark theme; it's `null` anywhere else, which falls back to the default.
 */
export const DarkScopeContext = createContext<HTMLElement | null>(null)

export function useDarkScope() {
  return useContext(DarkScopeContext)
}
