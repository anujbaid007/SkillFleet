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
  it('is light on a subpage at the top, where the purple banner sits behind the bar', () => {
    expect(shouldUseLightNav({ isHome: false, isScrolled: false, isMenuOpen: false })).toBe(true)
  })

  it('is never light on a subpage that is scrolled past the banner', () => {
    // The regression this guards: a navbar mounted at a restored scroll offset
    // (pull-to-refresh mid-page, back-navigation, deep link to an anchor) used
    // to keep the white logo over the white page body, leaving it invisible.
    expect(shouldUseLightNav({ isHome: false, isScrolled: true, isMenuOpen: false })).toBe(false)
  })

  it('is never light while the mobile menu is open, because the sheet is white', () => {
    expect(shouldUseLightNav({ isHome: false, isScrolled: false, isMenuOpen: true })).toBe(false)
    expect(shouldUseLightNav({ isHome: false, isScrolled: true, isMenuOpen: true })).toBe(false)
  })

  it('is never light on the home page, which has no banner behind the bar', () => {
    for (const isScrolled of [false, true]) {
      for (const isMenuOpen of [false, true]) {
        expect(shouldUseLightNav({ isHome: true, isScrolled, isMenuOpen })).toBe(false)
      }
    }
  })
})
