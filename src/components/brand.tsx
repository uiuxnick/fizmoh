import Link from "next/link"

/**
 * The mark, in one place.
 *
 * Every screen had been drawing its own idea of the logo — a chat bubble icon
 * in a green square, invented because there was no real asset to hand. There
 * is one now, and one component so that replacing it is one edit rather than
 * fourteen.
 */
export function Brand({
  href = "/",
  size = "md",
  wordmark = true,
  className = "",
}: {
  href?: string | null
  size?: "sm" | "md" | "lg"
  /** The full wordmark, or just the mark for tight spaces. */
  wordmark?: boolean
  className?: string
}) {
  const heights = {
    sm: "h-9 sm:h-10",
    md: "h-11 sm:h-12 md:h-13",
    lg: "h-14 sm:h-16",
    xl: "h-20 sm:h-24",
  }

  const inner = (
    <span className="inline-flex items-center">
      <img
        src="/brand/fizmoh-mascot-logo.png"
        alt="Fizmoh — Automate, Connect, Grow"
        className={`${heights[size]} w-auto max-h-full object-contain shrink-0 ${className}`}
      />
    </span>
  )

  if (!href) return inner
  return <Link href={href} className="inline-flex items-center shrink-0 hover:opacity-95 transition-opacity">{inner}</Link>
}
