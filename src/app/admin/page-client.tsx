"use client"

import AppShell from "@/components/app-shell"

/**
 * /admin — staff entry point.
 *
 * The product is a single client-rendered app whose mode lives in the store,
 * so this renders the same root component with admin mode forced on. Giving
 * staff a real URL beats the previous ?admin=1 query parameter, which was
 * undiscoverable and lost on any navigation that rewrote the query string.
 */
export default function AdminPage() {
  return <AppShell adminEntry />
}
