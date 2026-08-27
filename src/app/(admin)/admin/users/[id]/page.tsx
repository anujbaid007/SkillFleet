import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { scoreLevelFor, internalToDisplay } from '@/lib/scoring'
import type { ScoreLevel } from '@/lib/scoring/types'
import { ParameterCard } from '@/components/dashboard/parameter-card'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'

interface RawProfile {
  id: string
  role: string
  full_name: string | null
  date_of_birth: string | null
  phone: string | null
  onboarding_completed: boolean
  school_class: string | null
  school_name: string | null
  city: string | null
  parent_mobile: string | null
  created_at: string
}

interface RawContribution {
  id: string
  source_type: string
  points: number
  description: string | null
  created_at: string
  growth_parameters: { name: string } | null
}

const SOURCE_LABEL: Record<string, string> = {
  baseline_test: 'Starter assessment',
  baseline_cert: 'Certificate approved',
  baseline_cert_approval: 'Certificate approved',
  baseline_questionnaire: 'Onboarding questionnaire',
  offering_completion: 'Offering completed',
  cert_rejection: 'Certificate rejected',
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-foreground">{value ?? '—'}</p>
    </div>
  )
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: email }] = (await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, role, full_name, date_of_birth, phone, onboarding_completed, school_class, school_name, city, parent_mobile, created_at')
      .eq('id', id)
      .single(),
    supabase.rpc('admin_get_user_email', { p_user_id: id }),
  ])) as [{ data: RawProfile | null }, { data: string | null }]

  if (!profile) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      {/* Profile hero */}
      <Reveal>
        <GradientCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-white">
                {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white truncate">
                  {profile.full_name ?? 'Unnamed user'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize bg-white/20 text-white">
                  {profile.role}
                </span>
              </div>
              <p className="text-sm text-white/75 truncate">{email ?? '—'}</p>
            </div>
          </div>
        </GradientCard>
      </Reveal>

      <div className="clay-card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <DetailRow label="Joined" value={fmtDate(profile.created_at)} />
          <DetailRow label="Phone" value={profile.phone} />
          {profile.role === 'student' && (
            <>
              <DetailRow label="Date of birth" value={fmtDate(profile.date_of_birth)} />
              <DetailRow label="Class" value={profile.school_class} />
              <DetailRow label="School" value={profile.school_name} />
              <DetailRow label="City" value={profile.city} />
              <DetailRow label="Parent mobile" value={profile.parent_mobile} />
              <DetailRow label="Onboarding" value={profile.onboarding_completed ? 'Complete' : 'Pending'} />
            </>
          )}
        </div>
      </div>

      {profile.role === 'student' && <StudentSections studentId={id} />}
    </div>
  )
}

async function StudentSections({ studentId }: { studentId: string }) {
  const supabase = await createClient()

  const [
    { data: rawScores },
    { data: rawParameters },
    { data: rawLevels },
    { data: rawContributions },
    { data: familyRow },
  ] = await Promise.all([
    supabase
      .from('student_parameter_scores')
      .select('parameter_id, baseline_score, accrued_score')
      .eq('student_id', studentId),
    supabase.from('growth_parameters').select('id, name, display_order').eq('is_active', true).order('display_order'),
    supabase.from('score_levels').select('id, name, min_score, max_score, color_class, display_order').order('display_order'),
    supabase
      .from('score_contributions')
      .select('id, source_type, points, description, created_at, growth_parameters(name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase.from('user_profiles').select('family_id').eq('id', studentId).single(),
  ])

  const levels = (rawLevels ?? []) as ScoreLevel[]
  const contributions = (rawContributions ?? []) as unknown as RawContribution[]

  const parameterScores = (rawParameters ?? []).map((gp) => {
    const row = (rawScores ?? []).find((s) => s.parameter_id === gp.id)
    const total = (row?.baseline_score ?? 0) + (row?.accrued_score ?? 0)
    const level = scoreLevelFor(internalToDisplay(total), levels)
    return {
      parameterId: gp.id,
      name: gp.name,
      total,
      levelName: level?.name ?? 'Seed',
      levelColorClass: level?.color_class ?? 'text-accent-yellow',
    }
  })

  // The family this student belongs to: the parent on record, plus siblings.
  const familyId = familyRow?.family_id ?? null
  let parent: { parent_full_name: string | null; parent_email: string; parent_phone: string | null } | null = null
  const siblings: { id: string; full_name: string | null; family_status: string }[] = []
  if (familyId) {
    const [{ data: fam }, { data: members }] = await Promise.all([
      supabase
        .from('families')
        .select('parent_full_name, parent_email, parent_phone')
        .eq('id', familyId)
        .single(),
      supabase
        .from('user_profiles')
        .select('id, full_name, family_status')
        .eq('family_id', familyId)
        .neq('id', studentId),
    ])
    parent = fam ?? null
    siblings.push(...(members ?? []))
  }

  return (
    <>
      {/* Growth profile */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Growth Profile</h2>
        {parameterScores.length === 0 ? (
          <div className="clay-card p-6 text-center text-muted text-sm">
            No scores yet — this student hasn&apos;t completed onboarding.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parameterScores.map((p) => (
              <ParameterCard
                key={p.parameterId}
                name={p.name}
                total={p.total}
                levelName={p.levelName}
                levelColorClass={p.levelColorClass}
              />
            ))}
          </div>
        )}
      </div>

      {/* Family */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Family</h2>
        {!parent ? (
          <div className="clay-card p-5 text-sm text-muted">Not part of a family.</div>
        ) : (
          <div className="clay-card p-5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailRow label="Parent" value={parent.parent_full_name} />
              <DetailRow label="Parent email" value={parent.parent_email} />
              <DetailRow label="Parent phone" value={parent.parent_phone} />
            </div>
            {siblings.length > 0 && (
              <div className="pt-3 border-t border-black/[0.06] space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Siblings</p>
                {siblings.map((sib) => (
                  <Link
                    key={sib.id}
                    href={`/admin/users/${sib.id}`}
                    className="flex items-center justify-between py-1.5 hover:bg-black/[0.02] transition-colors rounded"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {sib.full_name ?? 'Student'}
                      {sib.family_status === 'pending' && (
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-yellow/15 text-accent-yellow">
                          Awaiting approval
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-primary">View →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Score audit trail */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Recent Score Activity</h2>
        {contributions.length === 0 ? (
          <div className="clay-card p-5 text-sm text-muted">No score contributions yet.</div>
        ) : (
          <div className="clay-card divide-y divide-black/[0.06]">
            {contributions.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {c.growth_parameters?.name ?? 'Unknown parameter'}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {SOURCE_LABEL[c.source_type] ?? c.source_type}
                    {c.description ? ` · ${c.description}` : ''}
                  </p>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${c.points < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {c.points > 0 ? `+${c.points}` : c.points}
                </span>
                <span className="text-xs text-muted shrink-0 hidden sm:inline">{fmtDate(c.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
