/*
  How the marketing navbar decides between its two looks.

  Kept as plain functions, apart from the component, so the rule is testable:
  the "light" look inverts the logo to solid white, and getting that wrong
  makes the logo vanish rather than merely look off.
*/

/** Below this the subpage banner is still behind the bar. */
export const NAV_SCROLL_THRESHOLD = 20

export function isNavScrolled(scrollY: number): boolean {
  return scrollY > NAV_SCROLL_THRESHOLD
}

interface NavAppearanceInput {
  isHome: boolean
  isScrolled: boolean
  isMenuOpen: boolean
}

/*
  The light look is only safe when something dark is genuinely behind the bar.
  That is true in exactly one case: a subpage, still at the top, with the
  purple PageBanner filling the space behind it. The home page has no banner,
  a scrolled page shows white body content, and an open mobile menu turns the
  bar into the top edge of a white sheet — the logo must stay dark for all three.
*/
export function shouldUseLightNav({ isHome, isScrolled, isMenuOpen }: NavAppearanceInput): boolean {
  return !isHome && !isScrolled && !isMenuOpen
}
