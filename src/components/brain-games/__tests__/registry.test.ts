import { describe, expect, it } from 'vitest'
import { CATALOGUE, CATEGORY_LABEL, getCatalogueEntry } from '../games/registry'
import { ladderOf } from '../core/score/norms'

/**
 * The Puzzle Master practice catalogue.
 *
 * This suite runs under vitest's `node` environment, with no DOM — which is
 * the point of the first test, and is why none of these may call `load()`.
 * A client component is still rendered on the server for the initial HTML, so
 * importing this module must never require a browser. Reaching for the engines
 * here would import `lost-in-migration/flock.ts`, which builds a `Path2D` at
 * module scope, and would fail exactly as the page's server render would.
 */
describe('practice catalogue', () => {
  it('can be imported without a DOM, as the server render needs', () => {
    // Reaching this line at all is the assertion: the import above ran under
    // Node. Guard the globals too, so a future import that quietly pulls an
    // engine in is caught here rather than in production.
    expect(typeof globalThis.document).toBe('undefined')
    expect(CATALOGUE.length).toBeGreaterThan(0)
  })

  it('offers three games', () => {
    expect(CATALOGUE).toHaveLength(3)
  })

  it('takes them from three different categories', () => {
    const categories = CATALOGUE.map((g) => g.meta.category)
    expect(new Set(categories).size).toBe(3)
  })

  it('labels every category it uses', () => {
    for (const { meta } of CATALOGUE) {
      expect(CATEGORY_LABEL[meta.category]).toBeTruthy()
    }
  })

  it('gives every game a loader and the copy the cards read', () => {
    for (const { meta, load } of CATALOGUE) {
      expect(typeof load).toBe('function')
      expect(meta.title.length).toBeGreaterThan(0)
      expect(meta.tagline.length).toBeGreaterThan(0)
      expect(meta.skill.length).toBeGreaterThan(0)
      // The card paints the top rule and the Play button with this.
      expect(meta.accent).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  /*
    Storage caps a round's opening level at the game's own ladder floor, and
    reads that floor from `norms`. A game in the catalogue with no ladder entry
    would silently fall back to level 1 — wrong for Tile Trace, whose bottom
    rung is three tiles.
  */
  it('has a scoring ladder for every game in the catalogue', () => {
    for (const { meta } of CATALOGUE) {
      const ladder = ladderOf(meta.id)
      expect(ladder, `no ladder for ${meta.id}`).toBeDefined()
      expect(ladder!.max).toBeGreaterThan(ladder!.min)
    }
  })

  it('looks a game up by id', () => {
    for (const { meta } of CATALOGUE) {
      expect(getCatalogueEntry(meta.id)?.meta.title).toBe(meta.title)
    }
    expect(getCatalogueEntry('not-a-game')).toBeUndefined()
  })

  /*
    The section component and the host are imported statically by the page, so
    the whole of that graph is evaluated during the server render too. Dynamic
    imports here rather than at the top of the file so a failure names which
    module reached for a browser.
  */
  it('loads the game host without a DOM', async () => {
    const { GameHost } = await import('../app/screens/GameHost')
    expect(typeof GameHost).toBe('function')
  })

  it('loads the Practice section without a DOM', async () => {
    const { PracticeGames } = await import('@/components/isc/practice-games')
    expect(typeof PracticeGames).toBe('function')
  })
})
