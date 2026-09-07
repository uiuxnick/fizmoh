import MarketingHome from "@/components/marketing-home"

/**
 * The public home page, always — signed in or not.
 *
 * `/` renders the admin panel for anyone with a session, so the marketing page
 * could only be seen by signing out. That made checking a design change
 * awkward enough that one shipped without anybody looking at it, which is
 * exactly how it went out broken. Same component, no session branch.
 */
export const metadata = { robots: { index: false, follow: false } }

export default function HomePreview() {
  return <MarketingHome />
}
