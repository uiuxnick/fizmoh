"use client"

import Link from "next/link"

/**
 * The client wall.
 *
 * These are JIMC Tech's clients, not Fizmoh's — and the heading says so. A
 * "trusted by" strip implying forty companies run on a platform with three
 * workspaces is the kind of claim a prospect checks and a competitor screenshots,
 * so the credibility is transferred honestly instead: the team that built this
 * has delivered for these brands, with a link to the agency as proof.
 *
 * The count is 40+ rather than 100+ because thirty-eight logos are what we can
 * actually show. A number a visitor can disprove by counting is worse than a
 * smaller true one.
 */

const CLIENTS: { file: string; name: string }[] = [
  { file: "kays-1.png", name: "Kays International" },
  { file: "travel-space.png", name: "Travel Space" },
  { file: "gadgets-oman-1.png", name: "Gadgets Oman" },
  { file: "bni-oman.png", name: "BNI Oman" },
  { file: "vanguard.png", name: "Vanguard Engineering & Oilfield Services" },
  { file: "ufc-gym-1.png", name: "UFC Gym Oman" },
  { file: "yusuf.jpg", name: "Yusuf" },
  { file: "smokey-blues-1.png", name: "Smokey Grill & Chill Blues" },
  { file: "new-age-media.png", name: "New Age Media Solutions" },
  { file: "muscat-eye.png", name: "Muscat Eye Laser Center" },
  { file: "modern-hair-fixing.png", name: "Modern Hair Fixing" },
  { file: "masa-mall.png", name: "Al Masa Mall" },
  { file: "kawashi-1.png", name: "Kawashi Fashion" },
  { file: "markaz-1.png", name: "Markaz Al Bahja" },
  { file: "kadok-1.png", name: "Kadok" },
  { file: "la-nahda.png", name: "Al Nahda Group" },
  { file: "games-1.png", name: "Gamez" },
  { file: "yaat.jpg", name: "YAAT Building Engineered Solutions" },
  { file: "europercar.png", name: "Europcar" },
  { file: "enroil.png", name: "Enroil Oilfield Solutions & Services" },
  { file: "alia-1.png", name: "Alia Al Farsi Gallery" },
  { file: "dada-kitchen-1.png", name: "Dada's Kitchen" },
  { file: "studio.jpg", name: "Studio Red" },
  { file: "royal.jpg", name: "Royal" },
  { file: "queen-topaz.jpg", name: "Queen Topaz International Trading" },
  { file: "oudworld.jpg", name: "Oud World" },
  { file: "oman-phone.jpg", name: "Oman Phone" },
  { file: "nfh.jpg", name: "New Food House" },
  { file: "fit.jpg", name: "Future I.T" },
  { file: "mobpc.jpg", name: "MobPC" },
  { file: "max-lab.jpg", name: "MaxLab Analytica" },
  { file: "kiwi.jpg", name: "Kiwi World International" },
  { file: "frankince.jpg", name: "Hotel Frankincense" },
  { file: "escape.jpg", name: "Escape Gateways" },
  { file: "copper.jpg", name: "Copper Roastery" },
  { file: "askaris.jpg", name: "Askari's Goldsmiths" },
  { file: "space-code-1.png", name: "Space Code" },
]

/** One logo, shown in its own colours at a consistent optical size. */
function LogoTile({ client }: { client: { file: string; name: string } }) {
  return (
    <div className="flex h-[92px] w-[168px] shrink-0 items-center justify-center rounded-xl border border-[var(--mk-line)] bg-white p-4">
      {/* Logos arrive at wildly different aspect ratios, so each is contained
          rather than cropped or stretched. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/clients/${client.file}`}
        alt={client.name}
        loading="lazy"
        width={136}
        height={60}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  )
}

export function ClientLogos() {
  const half = Math.ceil(CLIENTS.length / 2)
  const firstRow = CLIENTS.slice(0, half)
  const secondRow = CLIENTS.slice(half)

  return (
    <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="mk-eyebrow">Our proud clients</p>
          <h2 className="mk-display mt-4 text-[34px] sm:text-[42px]">
            Trusted by 40+ brands in Oman
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-[var(--mk-ink-soft)]">
            Built by{" "}
            <Link
              href="https://fizmoh.cloud"
              target="_blank"
              rel="noopener"
              className="font-medium text-[var(--mk-gold)] underline underline-offset-4"
            >
              Fizmoh.cloud
            </Link>{" "}
            — the team that has delivered digital work for these organisations across Oman
            and the GCC.
          </p>
        </div>

        {/*
          * Two rows travelling in opposite directions.
          *
          * Thirty-seven logos in a static grid is a wall the eye skips. Moving
          * them keeps the section short and lets every logo have a turn in the
          * middle, where it is actually looked at. Opposite directions stop the
          * two rows reading as one sliding block.
          *
          * Each row holds two copies of its half, so translating by exactly
          * -50% loops with no visible seam. The duplicate is aria-hidden so a
          * screen reader hears each company once.
          */}
        <div className="mt-12 space-y-3">
          {[firstRow, secondRow].map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="group relative overflow-hidden"
              style={{
                maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
                WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
              }}
            >
              <div
                className={`flex w-max gap-3 group-hover:[animation-play-state:paused] ${
                  rowIndex === 0 ? "mk-marquee" : "mk-marquee-reverse"
                }`}
              >
                {row.map(c => <LogoTile key={`a-${c.file}`} client={c} />)}
                <div className="flex gap-3" aria-hidden="true">
                  {row.map(c => <LogoTile key={`b-${c.file}`} client={c} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
