'use client'

import { ArrowLeft, Crown, Clock, CheckCircle2, ExternalLink, Mail } from 'lucide-react'
import { TRACK_FIELDS } from '@/lib/isc/tracks'
import type { MemberAcceptance, StudentProfile } from '@/lib/isc/roster'

function isUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

/**
 * The three states a teammate row can be in, said in the same words the
 * student and the leader already see on their own screens — an admin
 * comparing the two should not have to translate between two vocabularies.
 */
const ACCEPTANCE: Record<MemberAcceptance, { label: string; icon: typeof Clock; tone: string }> = {
  accepted: { label: 'On the team', icon: CheckCircle2, tone: 'text-green-700' },
  awaiting_accept: { label: 'Invited — waiting for them to accept', icon: Clock, tone: 'text-accent-yellow' },
  unregistered_invite: { label: 'Not registered yet — invite sent', icon: Mail, tone: 'text-muted' },
}

/**
 * One student, every track they touch, and who is on each team.
 *
 * This is the answer to "is this student competing alone or not" — a question
 * the old entry list could not answer, because it only ever printed a team
 * size with no way to tell a finished solo entry from a team still waiting on
 * replies.
 */
export function IscStudentProfile({
  profile,
  onClose,
}: {
  profile: StudentProfile
  onClose: () => void
}) {
  return (
    <div className="clay-card p-6 space-y-5">
      <div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to all students
        </button>
        <h2 className="font-display font-bold text-foreground text-lg mt-3">{profile.name}</h2>
        <p className="text-sm text-muted mt-0.5">{profile.schoolClass ?? 'Class not set'}</p>
      </div>

      {profile.tracks.length === 0 ? (
        <p className="text-sm text-muted">
          This student has not started any ISC track, and has no invites waiting.
        </p>
      ) : (
        profile.tracks.map((block) => {
          const onTeam = block.team.filter((m) => m.acceptance === 'accepted').length
          const waiting = block.team.length - onTeam
          return (
            <div key={block.track} className="rounded-xl bg-black/[0.02] p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-foreground text-sm">
                    {block.trackName}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {onTeam} of up to {block.maxTeamSize} on the team
                    {waiting > 0 && ` · ${waiting} still to reply`}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                    block.entryStatus === 'submitted'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-black/[0.05] text-muted'
                  }`}
                >
                  {block.entryStatus === 'submitted' ? 'Submitted' : 'Draft'}
                </span>
              </div>

              <ul className="space-y-1.5">
                {block.team.map((m, i) => {
                  const meta = ACCEPTANCE[m.acceptance]
                  const Icon = meta.icon
                  return (
                    <li
                      key={`${m.name}-${i}`}
                      className="text-xs flex items-start gap-2 flex-wrap"
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${meta.tone}`} />
                      <span className="text-foreground font-medium break-all">{m.name}</span>
                      {m.isLeader && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                          <Crown className="w-3 h-3" />
                          Leader
                        </span>
                      )}
                      <span className="text-muted">{meta.label}</span>
                    </li>
                  )
                })}
              </ul>

              <dl className="space-y-3">
                {TRACK_FIELDS[block.track].map((spec) => {
                  const raw = block.submission?.[spec.key]
                  const value = typeof raw === 'string' ? raw : ''
                  return (
                    <div key={spec.key}>
                      <dt className="text-xs font-semibold text-muted uppercase tracking-wide">
                        {spec.label}
                      </dt>
                      <dd className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                        {!value ? (
                          <span className="text-muted">Not filled in</span>
                        ) : isUrl(value) ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 break-all"
                          >
                            {value}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          )
        })
      )}
    </div>
  )
}
