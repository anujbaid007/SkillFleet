'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Users, TrendingUp, Mail, Phone, Clock, UserPlus, ArrowLeftRight } from 'lucide-react'
import { decideFamilyMemberAction } from '@/app/actions/family'
import { switchAccountAction } from '@/app/actions/switch'
import type { FamilyFormState } from '@/app/actions/family'

export interface FamilyMember {
  student_id: string
  full_name: string | null
  email: string
  date_of_birth: string | null
  is_self: boolean
}

export interface PendingMember {
  student_id: string
  full_name: string | null
  email: string
  date_of_birth: string | null
}

export interface FamilySummary {
  family_id: string
  parent_full_name: string
  parent_email: string
  parent_phone: string | null
  my_status: string
  member_count: number
}

function initial(name: string | null) {
  return name?.trim()?.charAt(0)?.toUpperCase() ?? '?'
}

function age(dob: string | null) {
  if (!dob) return null
  const [y, m, d] = dob.split('-').map(Number)
  const today = new Date()
  let a = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) a -= 1
  return a >= 0 && a < 120 ? a : null
}

export function FamilyManager({
  currentUserId,
  members,
  pending,
  family,
}: {
  currentUserId: string
  members: FamilyMember[]
  pending: PendingMember[]
  family: FamilySummary | null
}) {
  const awaitingApproval = family?.my_status === 'pending'

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
          <Users className="w-3.5 h-3.5" /> Family
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">My Family</h1>
        <p className="text-muted mt-1 text-sm">
          Everyone who signed up with the same parent email shares one wallet, one cart, and one bill.
        </p>
      </div>

      {/* This account is still waiting to be let in */}
      {awaitingApproval && (
        <div className="clay-card p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent-yellow/15 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-accent-yellow" />
          </div>
          <div className="text-sm">
            <p className="font-display font-bold text-foreground">Waiting to join the family</p>
            <p className="text-muted mt-0.5">
              Someone already signed up with {family?.parent_email}. Ask them to open{' '}
              <span className="font-semibold text-foreground">My Family</span> and approve you. Until then
              you can use SkillFleet on your own.
            </p>
          </div>
        </div>
      )}

      {/* Parent on record */}
      {family && (
        <section className="clay-card p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/[0.07] to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-display font-bold text-foreground">Parent on record</h2>
            <p className="text-sm text-foreground mt-2 font-semibold">{family.parent_full_name}</p>
            <div className="mt-1.5 space-y-1 text-xs text-muted">
              <p className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {family.parent_email}
              </p>
              {family.parent_phone && (
                <p className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {family.parent_phone}
                </p>
              )}
            </div>
            <p className="text-xs text-muted mt-3">
              A sibling joins by entering this same parent email when they sign up. You can edit the
              parent&apos;s name and phone from{' '}
              <Link href="/account" className="text-primary font-semibold hover:underline">
                My Account
              </Link>
              .
            </p>
          </div>
        </section>
      )}

      {/* Pending join requests */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Waiting for your approval</h2>
            <p className="text-sm text-muted">
              These accounts used your parent&apos;s email. Approve only the ones you recognise —
              approving shares the family wallet and bookings with them.
            </p>
          </div>
          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.student_id} className="clay-card p-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-yellow to-accent-pink flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-white">{initial(p.full_name)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-foreground truncate">
                      {p.full_name ?? 'Student'}
                      {age(p.date_of_birth) !== null && (
                        <span className="text-muted font-normal text-sm"> · {age(p.date_of_birth)} yrs</span>
                      )}
                    </p>
                    <p className="text-xs text-muted truncate">{p.email}</p>
                  </div>
                  <DecideButtons studentId={p.student_id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Family members */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          {members.length > 1 ? `${members.length} accounts in this family` : 'This family'}
        </h2>

        {members.length <= 1 && (
          <div className="clay-card p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-display font-bold text-foreground">Adding a brother or sister?</p>
              <p className="text-muted mt-0.5">
                Have them sign up with their own email and enter{' '}
                <span className="font-semibold text-foreground">
                  {family?.parent_email ?? 'the same parent email'}
                </span>{' '}
                as the parent. You&apos;ll get an approval request here.
              </p>
            </div>
          </div>
        )}

        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.student_id} className="clay-card p-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-white">{initial(m.full_name)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-foreground truncate">
                      {m.full_name ?? 'Student'}
                      {m.student_id === currentUserId && (
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary align-middle">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted truncate">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.student_id !== currentUserId && (
                    <form action={switchAccountAction}>
                      <input type="hidden" name="target_id" value={m.student_id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-black/[0.04] text-foreground text-sm font-semibold px-3 py-2 hover:bg-black/[0.07] transition-colors"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        <span className="hidden sm:inline">Switch</span>
                      </button>
                    </form>
                  )}
                  <Link
                    href={m.student_id === currentUserId ? '/profile' : `/family/${m.student_id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold px-3 py-2 hover:bg-primary/15 transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Progress</span>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function DecideButtons({ studentId }: { studentId: string }) {
  const [state, action, pending] = useActionState<FamilyFormState, FormData>(
    decideFamilyMemberAction,
    undefined
  )

  if (state?.success) {
    return <span className="text-xs font-semibold text-green-600">{state.success}</span>
  }

  return (
    <form action={action} className="flex items-center gap-2 shrink-0">
      <input type="hidden" name="student_id" value={studentId} />
      <button
        type="submit"
        name="approve"
        value="true"
        disabled={pending}
        className="clay-button bg-cta text-white text-sm font-semibold px-4 h-9 disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Approve'}
      </button>
      <button
        type="submit"
        name="approve"
        value="false"
        disabled={pending}
        className="text-sm font-semibold text-muted hover:text-red-600 px-2 disabled:opacity-60"
      >
        Decline
      </button>
      {state?.error && <span className="text-xs text-red-500">{state.error}</span>}
    </form>
  )
}
