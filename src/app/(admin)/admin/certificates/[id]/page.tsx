import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CertReviewForm } from '@/components/admin/cert-review-form'

interface RawCert {
  id: string
  file_name: string | null
  file_url: string
  description: string | null
  status: string
  created_at: string
  student_id: string
  parameter_id: string | null
  points_approved: number
  admin_notes: string | null
  growth_parameters: { name: string } | null
}

export default async function CertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cert } = (await supabase
    .from('certificate_uploads')
    .select('id, file_name, file_url, description, status, created_at, student_id, parameter_id, points_approved, admin_notes, growth_parameters(name)')
    .eq('id', id)
    .single()) as unknown as { data: RawCert | null }

  if (!cert) notFound()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', cert.student_id)
    .single()

  const { data: signedData } = await supabase.storage
    .from('certificates')
    .createSignedUrl(cert.file_url, 300)

  const signedUrl = signedData?.signedUrl ?? null

  const { data: parameters } = await supabase
    .from('growth_parameters')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order')

  const isPDF = cert.file_name?.toLowerCase().endsWith('.pdf')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/admin/certificates"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Certificates
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="clay-card p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Certificate Details</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted">Student</dt>
                <dd className="font-medium text-foreground">{profile?.full_name ?? 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-muted">File</dt>
                <dd className="font-medium text-foreground truncate">{cert.file_name ?? '—'}</dd>
              </div>
              {cert.description && (
                <div>
                  <dt className="text-muted">Description</dt>
                  <dd className="text-foreground">{cert.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Tagged skill</dt>
                <dd className="text-foreground">{cert.growth_parameters?.name ?? '— none —'}</dd>
              </div>
              <div>
                <dt className="text-muted">Uploaded</dt>
                <dd className="text-foreground">
                  {new Date(cert.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="capitalize font-medium text-foreground">{cert.status}</dd>
              </div>
            </dl>
          </div>

          {signedUrl ? (
            <div className="clay-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">File Preview</h3>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {isPDF ? (
                <iframe src={signedUrl} className="w-full h-64 rounded-xl border border-black/[0.06]" title="Certificate" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signedUrl} alt="Certificate" className="w-full rounded-xl object-contain max-h-64" />
              )}
            </div>
          ) : (
            <div className="clay-card p-4 text-center text-sm text-muted">Preview not available.</div>
          )}
        </div>

        <div className="space-y-4">
          {cert.status !== 'pending' && (
            <div
              className={`clay-card p-4 space-y-1 ${
                cert.status === 'approved' ? 'bg-green-50/50' : 'bg-red-50/40'
              }`}
            >
              <p className="text-sm font-semibold text-foreground capitalize">
                Currently {cert.status}
              </p>
              {cert.status === 'approved' && (
                <p className="text-sm text-muted">Points awarded: {cert.points_approved}</p>
              )}
              {cert.admin_notes && <p className="text-sm text-muted">Notes: {cert.admin_notes}</p>}
              <p className="text-xs text-muted pt-1">
                You can change this decision below — scores are adjusted automatically.
              </p>
            </div>
          )}
          <CertReviewForm
            certId={cert.id}
            currentParameterId={cert.parameter_id}
            currentStatus={cert.status}
            currentPoints={cert.points_approved}
            parameters={parameters ?? []}
          />
        </div>
      </div>
    </div>
  )
}
