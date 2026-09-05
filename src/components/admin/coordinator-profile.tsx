import Link from 'next/link'
import { ExternalLink, GraduationCap, MessageCircle, Rocket, Send, Users } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { ClaimChip } from '@/components/admin/coordinator-claim-chip'
import { trackName } from '@/lib/isc/tracks'
import { formatIstDay, istDay } from '@/lib/isc/dates'
import type { CoordinatorDetail } from '@/lib/admin/coordinators'

function n(value: number): string {
  return value.toLocaleString('en-IN')
}

function pct(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
}

/** What the detail page knows without the migration: plain table rows. */
export interface CoordinatorClaimRowData {
  id: string
  name: string
  state: string
  district: string
  review_status: string
  claim_status: string
  notes: string | null
  board: string | null
}

export interface CoordinatorProfileData {
  id: string
  full_name: string | null
  /** Null when there is no auth.users row — rendered as "No account". */
  email: string | null
  phone: string | null
  joined_at: string
  onboarding_completed: boolean
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

/**
 * Who this person is, and which school they hold.
 *
 * Every word here comes from plain tables — user_profiles, schools, and the
 * one RPC that reads an email — so this card renders in full before
 * docs/admin-scale-migration.sql has been pasted, when the four numbers below
 * it cannot. That is deliberate: an admin opening a coordinator from the
 * global search needs the phone number and the claim whether or not the
 * analytics are ready.
 */
export function CoordinatorProfileCard({
  profile,
  claim,
  claimsHeld,
}: {
  profile: CoordinatorProfileData
  /** The strongest claim, or null when they have claimed nothing. */
  claim: CoordinatorClaimRowData | null
  claimsHeld: number
}) {
  return (
    <div className="clay-card space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name" value={profile.full_name ?? 'Unnamed coordinator'} />
        <Field label="Email" value={profile.email ?? 'No account'} />
        <Field label="Phone" value={profile.phone ?? 'Not given'} />
        <Field label="Joined" value={formatIstDay(istDay(profile.joined_at))} />
      </div>

      <div className="border-t border-black/[0.06] pt-5">
        {claim ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-foreground">{claim.name}</p>
              <ClaimChip status={claim.claim_status} />
              {claim.review_status !== 'approved' && (
                <span className="rounded-full bg-accent-yellow/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  The school itself is still {claim.review_status}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              {claim.district}, {claim.state}
              {claim.board && ` · ${claim.board}`}
              {claimsHeld > 1 && ` · this person holds ${n(claimsHeld)} claims in all`}
            </p>
            {claim.notes && (
              <p className="rounded-xl bg-black/[0.02] px-3 py-2 text-xs text-muted">
                Review note: {claim.notes}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link
                href={`/admin/isc/state/${encodeURIComponent(claim.state)}/district/${encodeURIComponent(
                  claim.district
                )}/school/${claim.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-xs font-semibold text-muted hover:border-primary/30 hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                The school in ISC
              </Link>
              <Link
                href={`/admin/coordinators/support/${profile.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-xs font-semibold text-muted hover:border-primary/30 hover:text-primary"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Support thread
              </Link>
              {claim.claim_status === 'pending' && (
                <Link
                  href="/admin/coordinators/claims"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-xs font-semibold text-muted hover:border-primary/30 hover:text-primary"
                >
                  Review this claim
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">No school claimed</p>
            <p className="text-xs text-muted">
              This teacher has an account and has not applied to coordinate a school, so they have
              no state and appear in no state breakdown. Their console stays closed until a claim
              is approved.
            </p>
            <Link
              href={`/admin/coordinators/support/${profile.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-xs font-semibold text-muted hover:border-primary/30 hover:text-primary"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Support thread
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The four numbers, and what has been entered.
 *
 * REACH again: `students` is everyone on the register of every school this
 * person claims, and `students_entered` is the part of that same group on at
 * least one entry — a subset of its own superset, so the percentage beside it
 * is a real percentage.
 *
 * `entries` and `submitted` count ENTRIES at those schools, which is not the
 * same population: an entry belongs to its leader's school, and a team-mate
 * from elsewhere does not move it. by_track counts entries too and sums to
 * `entries` exactly — unlike the ISC pages' by_track, which counts students.
 */
export function CoordinatorNumbers({ detail }: { detail: CoordinatorDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <StatCard
          label="Students reached"
          value={n(detail.students)}
          icon={Users}
          tone="primary"
          sub={
            detail.schools_claimed > 1
              ? `Everyone on the register across all ${n(detail.schools_claimed)} schools claimed`
              : 'Everyone on the school register, not only Classes 5 to 12'
          }
        />
      </div>
      <div className="lg:col-span-3">
        <StatCard
          label="Of those, entered"
          value={n(detail.students_entered)}
          icon={Rocket}
          tone="positive"
          progress={detail.entered_pct}
          sub={`${pct(detail.entered_pct)} of the ${n(detail.students)} students reached`}
        />
      </div>
      <div className="lg:col-span-3">
        <StatCard
          label="Entries"
          value={n(detail.entries)}
          icon={GraduationCap}
          tone="neutral"
          sub="Teams entered from this school — counted in entries, not students"
        />
      </div>
      <div className="lg:col-span-3">
        <StatCard
          label="Submitted"
          value={n(detail.submitted)}
          icon={Send}
          tone="teal"
          sub={`of ${n(detail.entries)} ${detail.entries === 1 ? 'entry' : 'entries'} sent in`}
        />
      </div>

      <div className="lg:col-span-12">
        <Panel
          title="Entries by championship"
          subtitle="Counted in entries, one championship per entry, so these add up to the entries figure above"
        >
          {detail.by_track.length === 0 ? (
            <PanelEmpty>Nothing has been entered from this school yet.</PanelEmpty>
          ) : (
            <ul className="space-y-2.5">
              {detail.by_track.map((t) => (
                <li key={t.key} className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    {trackName(t.key)}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {n(t.count)}
                    </span>{' '}
                    {t.count === 1 ? 'entry' : 'entries'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
