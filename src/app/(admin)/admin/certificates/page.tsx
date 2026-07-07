import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

interface RawCert {
  id: string
  file_name: string | null
  description: string | null
  status: string
  created_at: string
  student_id: string
  points_approved: number
  growth_parameters: { name: string } | null
}

export default async function CertificatesPage() {
  const supabase = await createClient()

  const { data: certs } = (await supabase
    .from('certificate_uploads')
    .select('id, file_name, description, status, created_at, student_id, points_approved, growth_parameters(name)')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })) as unknown as { data: RawCert[] | null }

  const studentIds = [...new Set((certs ?? []).map((c) => c.student_id))]
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', studentIds.length ? studentIds : ['00000000-0000-0000-0000-000000000000'])

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review queue"
        icon={FileCheck}
        title="Certificates"
        subtitle="Review student achievement uploads."
      />

      {(certs ?? []).length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No certificates uploaded yet.</div>
      ) : (
        <Reveal delay={0.05}>
        <div className="clay-card divide-y divide-black/[0.06]">
          {(certs ?? []).map((cert) => (
            <div key={cert.id} className="flex items-center justify-between px-5 py-4 gap-4 hover:bg-black/[0.02] transition-colors">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[cert.status] ?? 'bg-black/[0.06] text-muted'}`}>
                    {cert.status}
                  </span>
                  {cert.growth_parameters && (
                    <span className="text-xs text-muted">{cert.growth_parameters.name}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {cert.file_name ?? 'Untitled'}
                  {cert.description ? ` — ${cert.description}` : ''}
                </p>
                <p className="text-xs text-muted">
                  {nameById.get(cert.student_id) ?? 'Unknown student'} ·{' '}
                  {new Date(cert.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {cert.status === 'approved' && cert.points_approved > 0 && ` · +${cert.points_approved} pts`}
                </p>
              </div>
              <Link
                href={`/admin/certificates/${cert.id}`}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  cert.status === 'pending'
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border border-black/10 text-muted hover:text-foreground'
                }`}
              >
                {cert.status === 'pending' ? 'Review' : 'Re-review'}
              </Link>
            </div>
          ))}
        </div>
        </Reveal>
      )}
    </div>
  )
}
