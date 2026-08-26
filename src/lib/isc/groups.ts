export type IscGroup = 'group1' | 'group2'

export interface IscGroupMeta {
  label: string
  classes: string[]
}

/**
 * The two ISC groups. A team can only ever contain classmates from the same
 * group — Classes 5-8 do not compete against, or team up with, Classes 9-12.
 */
export const ISC_GROUPS: Record<IscGroup, IscGroupMeta> = {
  group1: { label: 'Group 1', classes: ['Class 5', 'Class 6', 'Class 7', 'Class 8'] },
  group2: { label: 'Group 2', classes: ['Class 9', 'Class 10', 'Class 11', 'Class 12'] },
}

/**
 * Which group a class belongs to, or null for anything outside Classes 5-12
 * (Kindergarten-4, unset, or unrecognised) — exactly the set isEligibleClass()
 * already excludes from ISC entirely, so "no group" only ever describes a
 * student who could not enter in the first place.
 */
export function iscGroupForClass(schoolClass: string | null | undefined): IscGroup | null {
  if (!schoolClass) return null
  if (ISC_GROUPS.group1.classes.includes(schoolClass)) return 'group1'
  if (ISC_GROUPS.group2.classes.includes(schoolClass)) return 'group2'
  return null
}

/** "Group 1 (Classes 5–8)" */
export function iscGroupLabel(group: IscGroup): string {
  const meta = ISC_GROUPS[group]
  const first = meta.classes[0].replace('Class ', '')
  const last = meta.classes[meta.classes.length - 1].replace('Class ', '')
  return `${meta.label} (Classes ${first}–${last})`
}
