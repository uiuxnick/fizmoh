import AdminPage from "./page-client"

/**
 * The staff sign-in screen. Publicly reachable by necessity, but there is
 * nothing here for a search result — and an indexed login page invites
 * credential-stuffing traffic.
 */
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminPage />
}
