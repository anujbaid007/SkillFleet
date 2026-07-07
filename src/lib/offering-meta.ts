import { Wrench, MapPin, CalendarDays, Trophy, Briefcase, type LucideIcon } from 'lucide-react'

// Per-type visual identity for offerings, shared by the catalog list, detail,
// and anywhere an offering type is shown — so each type reads consistently
// (matching the marketing site's programs section: trips→map, workshops→wrench…).
export interface OfferingTypeMeta {
  label: string
  icon: LucideIcon
  /** two-stop gradient for a solid icon badge, e.g. `from-primary to-primary-light` */
  gradient: string
  /** soft card wash, e.g. `from-primary/[0.08]` */
  tint: string
  /** solid text/accent color class */
  text: string
}

export const OFFERING_TYPE_META: Record<string, OfferingTypeMeta> = {
  workshop: { label: 'Workshop', icon: Wrench, gradient: 'from-primary to-primary-light', tint: 'from-primary/[0.08]', text: 'text-primary' },
  trip: { label: 'Trip', icon: MapPin, gradient: 'from-accent-teal to-primary', tint: 'from-accent-teal/[0.08]', text: 'text-accent-teal' },
  event: { label: 'Event', icon: CalendarDays, gradient: 'from-accent-pink to-accent-purple', tint: 'from-accent-pink/[0.08]', text: 'text-accent-pink' },
  competition: { label: 'Competition', icon: Trophy, gradient: 'from-accent-purple to-accent-pink', tint: 'from-accent-purple/[0.08]', text: 'text-accent-purple' },
  internship: { label: 'Internship', icon: Briefcase, gradient: 'from-accent-yellow to-accent-pink', tint: 'from-accent-yellow/[0.08]', text: 'text-accent-yellow' },
}

export const OFFERING_STATUS_META: Record<string, { label: string; badge: string }> = {
  live: { label: 'Live', badge: 'bg-green-50 text-green-700' },
  planned: { label: 'Planned', badge: 'bg-accent-yellow/15 text-accent-yellow' },
  completed: { label: 'Completed', badge: 'bg-blue-50 text-blue-700' },
  retired: { label: 'Archived', badge: 'bg-black/[0.06] text-muted' },
}

// Delivery mode. Which options apply depends on the offering type:
// workshops/events run online/offline/hybrid; internships run wfh/onsite/hybrid.
// trips/competitions have no mode.
export const MODE_LABEL: Record<string, string> = {
  online: 'Online',
  offline: 'Offline',
  hybrid: 'Hybrid',
  wfh: 'Work from home',
  onsite: 'On-site',
}

export function modeOptionsForType(type: string): { value: string; label: string }[] {
  if (type === 'workshop' || type === 'event') {
    return [
      { value: 'online', label: 'Online' },
      { value: 'offline', label: 'Offline' },
      { value: 'hybrid', label: 'Hybrid' },
    ]
  }
  if (type === 'internship') {
    return [
      { value: 'wfh', label: 'Work from home' },
      { value: 'onsite', label: 'On-site' },
      { value: 'hybrid', label: 'Hybrid' },
    ]
  }
  return []
}

export function typeHasMode(type: string): boolean {
  return type === 'workshop' || type === 'event' || type === 'internship'
}
