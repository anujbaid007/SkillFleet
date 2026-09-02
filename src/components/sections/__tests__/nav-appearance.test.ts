import { describe, expect, it } from 'vitest'
import { isNavScrolled, shouldUseLightNav } from '../nav-appearance'

describe('isNavScrolled', () => {
  it('is false at the very top', () => {
    expect(isNavScrolled(0)).toBe(false)
  })

  it('stays false inside the threshold, where the banner is still behind the bar', () => {
    expect(isNavScrolled(20)).toBe(false)
  })

  it('is true once the page has moved past the threshold', () => {
    expect(isNavScrolled(21)).toBe(true)
    expect(isNavScrolled(900)).toBe(true)
  })

  it('treats a negative offset (iOS rubber-banding above the top) as not scrolled', () => {
    expect(isNavScrolled(-60)).toBe(false)
  })
})

describe('shouldUseLightNav', () => {
  it('is light on a page with a banner, at the top', () => {
    expect(shouldUseLightNav({ hasBanner: true, isScrolled: false, isMenuOpen: false })).toBe(true)
  })

  it('is never light once scrolled past the banner', () => {
    // The regression this guards: a navbar mounted at a restored scroll offset
    // (pull-to-refresh mid-page, back-navigation, deep link to an anchor) used
    // to keep the white logo over the white page body, leaving it invisible.
    expect(shouldUseLightNav({ hasBanner: true, isScrolled: true, isMenuOpen: false })).toBe(false)
  })

  it('is never light while the mobile menu is open, because the sheet is white', () => {
    expect(shouldUseLightNav({ hasBanner: true, isScrolled: false, isMenuOpen: true })).toBe(false)
    expect(shouldUseLightNav({ hasBanner: true, isScrolled: true, isMenuOpen: true })).toBe(false)
  })

  /*
    The bug this replaced: the rule used to ask whether the pathname was '/'.
    During static prerendering usePathname() did not report '/', so the home
    page was built with the white logo baked into its HTML — and React does not
    repair a className mismatch while hydrating, so it stayed white on white for
    every visitor. Whether a banner exists is now declared by the layout, which
    is knowable at build time.
  */
  it('is never light without a banner, whatever else is true', () => {
    for (const isScrolled of [false, true]) {
      for (const isMenuOpen of [false, true]) {
        expect(shouldUseLightNav({ hasBanner: false, isScrolled, isMenuOpen })).toBe(false)
      }
    }
  })
})
