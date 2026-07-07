import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileCheck, Users, GraduationCap, Package, CheckSquare } from 'lucide-react'
import { StatCard } from '@/components/admin/stat-card'
import { Reveal } from '@/components/ui/reveal'

interface RecentPending {
  id: string
  file_name: string | null
  description: string | null
  created_at: string
  growth_parameters: { name: string } | null
}

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const [
    { count: pendingCerts },
    { count: totalStudents },
    { count: onboarded },
    { count: liveOfferings },
    { count: needsCompletion },
  ] = await Promise.all([
    supabase.from('certificate_uploads').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('onboarding_completed', true),
    supabase.from('offerings').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed').eq('score_applied', false),
  ])

  const { data: recentPending } = (await supabase
    .from('certificate_uploads')
    .select('id, file_name, description, created_at, growth_parameters(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)) as unknown as { data: RecentPending[] | null }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted mt-1 text-sm">Platform-wide snapshot.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Pending Certs" value={pendingCerts ?? 0} accent="pink" sub="Awaiting review" icon={FileCheck} />
        <StatCard label="Total Students" value={totalStudents ?? 0} accent="primary" icon={Users} />
        <StatCard label="Onboarded" value={onboarded ?? 0} accent="teal" sub={`of ${totalStudents ?? 0}`} icon={GraduationCap} />
        <StatCard label="Live Offerings" value={liveOfferings ?? 0} accent="yellow" icon={Package} />
        <StatCard label="Needs Completion" value={needsCompletion ?? 0} accent="pink" sub="Confirmed bookings" icon={CheckSquare} />
      </div>

      {(recentPending ?? []).length > 0 && (
        <div className="clay-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent Pending Certificates</h2>
            <Link href="/admin/certificates" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-black/[0.06]">
            {(recentPending ?? []).map((cert) => (
              <div key={cert.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {cert.file_name ?? 'Untitled'}
                  </p>
                  <p className="text-xs text-muted">
                    {cert.description ?? '—'} · {cert.growth_parameters?.name ?? 'No skill tagged'}
                  </p>
                </div>
                <Link
                  href={`/admin/certificates/${cert.id}`}
                  className="ml-4 shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
