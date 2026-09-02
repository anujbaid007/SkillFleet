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
  /**
   * Whether a purple PageBanner sits behind the bar on this page.
   *
   * Passed down by the layout rather than derived from the pathname. The
   * pathname is only knowable at request time, and this decision has to be
   * right during static prerendering too — when usePathname() returned
   * something other than '/', the home page was prerendered with the white
   * logo baked in, and React does not repair a className mismatch during
   * hydration, so it stayed invisible on a white background.
   */
  hasBanner: boolean
  isScrolled: boolean
  isMenuOpen: boolean
}

/*
  The light look is only safe when something dark is genuinely behind the bar.
  That is true in exactly one case: a page with the purple PageBanner, still at
  the top, so the banner fills the space behind it. A page without a banner
  shows white body content, a scrolled page has moved past it, and an open
  mobile menu turns the bar into the top edge of a white sheet — the logo must
  stay dark for all three.

  Note the default: anything that does not positively declare a banner gets the
  dark logo. Dark-on-purple is merely less pretty; white-on-white cannot be
  seen at all, so that is the direction to fail in.
*/
export function shouldUseLightNav({
  hasBanner,
  isScrolled,
  isMenuOpen,
}: NavAppearanceInput): boolean {
  return hasBanner && !isScrolled && !isMenuOpen
}
