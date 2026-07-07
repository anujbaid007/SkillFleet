import { redirect } from 'next/navigation'
import { Award, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CertificateUploader } from '@/components/certificates/certificate-uploader'
import { ResubmitControl } from '@/components/certificates/resubmit-control'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'

interface RawCert {
  id: string
  file_name: string | null
  file_url: string
  description: string | null
  status: string
  points_approved: number
  admin_notes: string | null
  created_at: string
  growth_parameters: { name: string } | null
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_ICON = {
  pending: { Icon: Clock, badge: 'bg-accent-yellow/15 text-accent-yellow' },
  approved: { Icon: CheckCircle2, badge: 'bg-green-100 text-green-600' },
  rejected: { Icon: XCircle, badge: 'bg-red-100 text-red-500' },
} as const

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function StudentCertificatesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  // Certificates are a student-owned artifact.
  if (profile?.role !== 'student') redirect('/dashboard')

  const [{ data: certs }, { data: parameters }] = await Promise.all([
    supabase
      .from('certificate_uploads')
      .select('id, file_name, file_url, description, status, points_approved, admin_notes, created_at, growth_parameters(name)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: RawCert[] | null }>,
    supabase.from('growth_parameters').select('id, name').eq('is_active', true).order('display_order'),
  ])

  const rows = certs ?? []

  // Signed URLs so a student can re-open the files they uploaded.
  const signedByPath = new Map<string, string>()
  if (rows.length) {
    const { data: signed } = await supabase.storage
      .from('certificates')
      .createSignedUrls(rows.map((c) => c.file_url), 300)
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedByPath.set(s.path, s.signedUrl)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Achievements"
        icon={Award}
        title="Certificates"
        subtitle="Upload achievements for review. Track their status and points here."
      />

      <Reveal delay={0.05}>
        <CertificateUploader studentId={user.id} parameters={parameters ?? []} />
      </Reveal>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">Your certificates</h2>
        {rows.length === 0 ? (
          <Reveal delay={0.1}>
            <div className="clay-card p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-pink to-accent-purple flex items-center justify-center mx-auto">
                <Award className="w-7 h-7 text-white" />
              </div>
              <p className="font-display font-bold text-foreground">No certificates yet</p>
              <p className="text-muted text-sm max-w-xs mx-auto">
                Upload your first achievement above — an admin reviews it and awards points to your
                Growth Profile.
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="space-y-3">
            {rows.map((cert, i) => {
              const signedUrl = signedByPath.get(cert.file_url)
              const si = STATUS_ICON[cert.status as keyof typeof STATUS_ICON]
              const SIcon = si?.Icon ?? Clock
              return (
                <Reveal key={cert.id} delay={Math.min(i * 0.05, 0.3)}>
                  <div className="clay-card p-5 space-y-3">
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${si?.badge ?? 'bg-black/[0.06] text-muted'}`}>
                        <SIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[cert.status] ?? 'bg-black/[0.06] text-muted'}`}>
                            {STATUS_LABEL[cert.status] ?? cert.status}
                          </span>
                          {cert.growth_parameters && (
                            <span className="text-xs text-muted font-medium">{cert.growth_parameters.name}</span>
                          )}
                          {cert.status === 'approved' && cert.points_approved > 0 && (
                            <span className="text-xs font-bold text-green-600">+{cert.points_approved} pts</span>
                          )}
                        </div>
                        <p className="font-semibold text-foreground text-sm truncate">{cert.file_name ?? 'Certificate'}</p>
                        {cert.description && <p className="text-xs text-muted">{cert.description}</p>}
                        <p className="text-xs text-muted mt-0.5">Uploaded {fmtDate(cert.created_at)}</p>
                      </div>
                      {signedUrl && (
                        <a
                          href={signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-xs font-bold text-primary hover:underline"
                        >
                          View
                        </a>
                      )}
                    </div>

                    {cert.admin_notes && (
                      <div className="rounded-xl bg-black/[0.02] px-4 py-2.5">
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-0.5">Admin feedback</p>
                        <p className="text-sm text-foreground">{cert.admin_notes}</p>
                      </div>
                    )}

                    {cert.status === 'rejected' && (
                      <div className="pt-3 border-t border-black/[0.06]">
                        <ResubmitControl certId={cert.id} studentId={user.id} />
                      </div>
                    )}
                  </div>
                </Reveal>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
