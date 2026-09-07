"use client"

/**
 * Alert sounds for the admin panel.
 *
 * Synthesised with the Web Audio API rather than shipped as audio files: no
 * asset to load, nothing to 404, and the ring can keep going for as long as it
 * needs to without a download.
 *
 * A single short chime is easy to miss when an agent is looking elsewhere, so
 * an unanswered customer message rings repeatedly until someone acknowledges
 * it. Browsers refuse to play audio before the user has interacted with the
 * page, which is expected and handled quietly.
 */

export type AlertSound = "message" | "call" | "notification"

const STORAGE_KEY = "wptour.sound"

export interface SoundPreference {
  enabled: boolean
  volume: number
  /** Keep ringing until the agent acknowledges, rather than a single chime. */
  repeat: boolean
}

export const DEFAULT_SOUND: SoundPreference = { enabled: true, volume: 0.5, repeat: true }

export function readSoundPreference(): SoundPreference {
  if (typeof window === "undefined") return DEFAULT_SOUND
  try {
    return { ...DEFAULT_SOUND, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }
  } catch {
    return DEFAULT_SOUND
  }
}

export function writeSoundPreference(preference: SoundPreference) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference))
  } catch {
    /* private browsing */
  }
}

let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext }
    const Ctor = window.AudioContext || (window as WindowWithAudio).webkitAudioContext
    if (!Ctor) return null
    context ??= new Ctor()
    if (context.state === "suspended") void context.resume()
    return context
  } catch {
    return null
  }
}

/** Two-note chime for a new message; a longer warble for a call. */
const TONES: Record<AlertSound, { freq: number; at: number; length: number }[]> = {
  message: [
    { freq: 880, at: 0, length: 0.18 },
    { freq: 1174, at: 0.11, length: 0.22 },
  ],
  notification: [
    { freq: 660, at: 0, length: 0.16 },
    { freq: 990, at: 0.1, length: 0.2 },
  ],
  call: [
    { freq: 620, at: 0, length: 0.3 },
    { freq: 780, at: 0.32, length: 0.3 },
    { freq: 620, at: 0.64, length: 0.3 },
  ],
}

export function playAlert(sound: AlertSound, volume = 0.5) {
  const ctx = audioContext()
  if (!ctx) return

  for (const tone of TONES[sound]) {
    const gain = ctx.createGain()
    const start = ctx.currentTime + tone.at
    // Ramped rather than switched on, which would click.
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.3), start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.length)
    gain.connect(ctx.destination)

    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = tone.freq
    osc.connect(gain)
    osc.start(start)
    osc.stop(start + tone.length + 0.05)
  }
}

let ringTimer: ReturnType<typeof setInterval> | null = null

/**
 * Rings until stopped.
 *
 * Capped so a message that arrives overnight does not ring into an empty
 * office indefinitely.
 */
export function startRinging(sound: AlertSound, volume: number, everyMs = 3000, maxRings = 20) {
  stopRinging()
  let rings = 0
  playAlert(sound, volume)
  ringTimer = setInterval(() => {
    rings += 1
    if (rings >= maxRings) { stopRinging(); return }
    playAlert(sound, volume)
  }, everyMs)
}

export function stopRinging() {
  if (ringTimer) {
    clearInterval(ringTimer)
    ringTimer = null
  }
}

export function isRinging(): boolean {
  return ringTimer !== null
}
