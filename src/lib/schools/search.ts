// As-you-type matching for the school picker. Kept out of the component so it
// can be tested directly — the matching rule is the part most likely to be
// wrong, and it is invisible in a rendered dropdown.

export interface SearchableSchool {
  name: string
  address: string | null
}

/**
 * Every whitespace-separated term must appear somewhere in the name or the
 * address, case-insensitively and in any order — so "sec school", "govt boys"
 * and "govt jangpura" all find the right row.
 *
 * The address is searched as well as the name because 1,310 school names are
 * duplicated within their own district; the address is often the only thing
 * that tells two entries apart.
 */
export function filterSchools<T extends SearchableSchool>(
  schools: T[],
  query: string,
  limit = 50
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return schools.slice(0, limit)

  const terms = q.split(/\s+/)
  return schools
    .filter((s) => {
      const hay = `${s.name} ${s.address ?? ''}`.toLowerCase()
      return terms.every((t) => hay.includes(t))
    })
    .slice(0, limit)
}
