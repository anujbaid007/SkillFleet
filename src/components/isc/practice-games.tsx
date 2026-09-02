'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
  Brain,
  Eye,
  Loader2,
  Play,
  Shuffle,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react'
import { GameHost } from '@/components/brain-games/app/screens/GameHost'
import {
  CATALOGUE,
  type CatalogueEntry,
  type GameEntry,
} from '@/components/brain-games/games/registry'
import {
  getSettings,
  saveSettings,
  type Settings,
} from '@/components/brain-games/core/progress/Storage'
import { setMuted } from '@/components/brain-games/core/audio/Sfx'
import type { Category } from '@/components/brain-games/core/types'
import '@/components/brain-games/styles/games.css'

/**
 * Practice — the Puzzle Master warm-up.
 *
 * One game from each of three categories, ported unchanged from BrainWeave
 * under `components/brain-games/`. Everything inside `.bw-games-root` is
 * styled by that folder's `games.css`, which is scoped to that class precisely
 * so the ported CSS and SkillFleet's Tailwind cannot reach into each other.
 */

/**
 * Defaults matching Storage's own, so the server render and the first client
 * render agree. What is actually stored is read when a round starts.
 */
const DEFAULT_SETTINGS: Settings = { muted: false, colorblind: false }

const CATEGORY_ICON: Partial<Record<Category, LucideIcon>> = {
  memory: Brain,
  flexibility: Shuffle,
  attention: Eye,
}

/** How the level range reads on a card, using the game's own label if it has one. */
function levelNote({ meta }: CatalogueEntry): string {
  const { minLevel, maxLevel, levelLabel } = meta
  if (!maxLevel) return 'Adapts as you play'
  const floor = minLevel ?? 1
  return levelLabel
    ? `${levelLabel(floor)} up to ${levelLabel(maxLevel)}`
    : `${maxLevel - floor + 1} levels`
}

export function PracticeGames() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [active, setActive] = useState<GameEntry | null>(null)
  /** Id of the game whose engine is downloading, and of one that failed to. */
  const [pending, setPending] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  /*
    Engines are fetched here rather than imported at the top of the module —
    see the note on CATALOGUE. Stored settings are read here too, not in an
    effect or a state initialiser: Storage falls back to defaults without a
    browser, so seeding state from it would render one thing on the server and
    another on the client. Reading at launch also means a round always opens
    with whatever is on the device now.
  */
  const launch = useCallback(async (item: CatalogueEntry) => {
    setPending(item.meta.id)
    setFailed(null)
    try {
      const stored = getSettings()
      setMuted(stored.muted)
      setSettings(stored)
      setActive(await item.load())
    } catch {
      // A chunk that will not download is worth saying out loud; the button
      // stays live so it can simply be tried again.
      setFailed(item.meta.id)
    } finally {
      setPending(null)
    }
  }, [])

  /*
    Hold the page still behind a round. The board is a fixed overlay, so the
    document underneath keeps its scroll height; without this a gesture the
    game does not consume scrolls the page around behind it, and leaving the
    game drops the player at whatever offset that left.
  */
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])

  const toggleMute = useCallback(() => {
    setSettings((current) => {
      const next = saveSettings({ muted: !current.muted })
      setMuted(next.muted)
      return next
    })
  }, [])

  const exit = useCallback(() => setActive(null), [])

  /*
    A round is rendered into <body> rather than in place. `position: fixed`
    resolves against the nearest transformed ancestor, and this section sits
    inside a Reveal — a motion.div that holds a transform while it animates —
    and inside the platform shell's own scroll container. Portalling out means
    the board answers to the viewport and nothing else, and it puts the
    overlay's z-60 in the same stacking context as the assistant's z-50.
  */
  const round = active
    ? createPortal(
        <div className="bw-games-root bw-games-fullscreen">
          <div className="bw-games-topbar">
            <button className="bw-games-exit" onClick={exit}>
              &lsaquo; Leave game
            </button>
            <button
              className="bw-games-exit"
              onClick={toggleMute}
              style={{ marginLeft: 'auto' }}
              aria-label={settings.muted ? 'Unmute' : 'Mute'}
            >
              {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
          <GameHost game={active} settings={settings} onExit={exit} />
        </div>,
        document.body
      )
    : null

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Practice</h2>
        <span className="text-xs text-muted">
          {CATALOGUE.length} games &middot; free to play, nothing here is scored
        </span>
      </div>

      <p className="-mt-1 text-sm text-muted">
        Warm up for the live rounds. Each game trains a different skill and gets harder as you get
        better. Your progress is kept on this device.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOGUE.map((item) => {
          const { meta } = item
          const Icon = CATEGORY_ICON[meta.category]
          const loading = pending === meta.id
          return (
            <div key={meta.id} className="clay-card relative flex flex-col overflow-hidden p-0">
              {/*
                A real frame from the game, captured from the running build by
                BrainWeave's `scripts/games/shoot-thumbs.mjs`. The captures are
                840x630, so the 4:3 box shows the whole frame rather than
                cropping the part the shot was framed around.
              */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/[0.04]">
                <Image
                  src={`/game-shots/${meta.id}.webp`}
                  alt={`${meta.title} in play`}
                  fill
                  sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 92vw"
                  className="object-cover"
                />
                {/* The game's own accent, read as a rule on the card's top
                    edge — the same device the championship cards use. */}
                <span
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ background: meta.accent }}
                />

                {/*
                  The category, sitting on the artwork the way the game's own
                  badges do. `top-3` clears the accent rule above it, and the
                  ring keeps the pill legible wherever a shot happens to be
                  the same colour as the accent behind it.
                */}
                <span
                  data-category={meta.category}
                  className={`category-${meta.category} absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-md ring-1 ring-white/25`}
                  style={{ background: meta.accent }}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  category-{meta.category}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-black/[0.05] px-2 py-1 text-[10px] font-bold text-muted">
                    {meta.controls === 'swipe' ? 'Swipe or arrow keys' : 'Tap'}
                  </span>
                </div>

                <h3 className="font-display mt-3 text-lg font-bold leading-snug text-foreground">
                  {meta.title}
                </h3>
                <p className="mt-1.5 text-sm text-foreground/65">{meta.tagline}</p>

                <dl className="mt-4 space-y-1.5 text-xs text-muted">
                  <div className="flex gap-2">
                    <dt className="font-semibold text-foreground/70">Trains</dt>
                    <dd>{meta.skill}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-semibold text-foreground/70">Levels</dt>
                    <dd>{levelNote(item)}</dd>
                  </div>
                </dl>

                <button
                  onClick={() => launch(item)}
                  disabled={loading}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:cursor-wait disabled:hover:scale-100"
                  style={{ background: meta.accent }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {loading ? 'Loading…' : `Play ${meta.title}`}
                </button>

                {failed === meta.id && (
                  <p className="mt-2 text-xs text-red-600">
                    That did not load. Check your connection and try again.
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {round}
    </section>
  )
}
