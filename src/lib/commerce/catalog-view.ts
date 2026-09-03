/*
  Which slice of the catalogue the Explore page shows.

  The default is the whole catalogue. Narrowing to what a family can book
  right now is a deliberate choice from the dropdown, not the starting point:
  a parent whose only learner is outside every age range, or a staff member
  browsing with a test account, would otherwise open Explore to an empty page
  and conclude there is nothing on offer.
*/
export type CatalogView = 'everything' | 'bookable' | 'planned' | 'completed'

export function catalogViewFor(status: string | undefined): CatalogView {
  switch (status) {
    case 'bookable':
    case 'planned':
    case 'completed':
      return status
    default:
      // Covers no choice, the old "all" links, and anything unrecognised.
      return 'everything'
  }
}
