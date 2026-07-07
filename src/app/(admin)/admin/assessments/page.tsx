import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { toggleAssessmentActiveAction } from './actions'
import { PageHeader } from '@/components/ui/page-header'
import { ClipboardList } from 'lucide-react'

interface RawAssessment {
  id: string
  title: string
  description: string | null
  is_active: boolean
  assessment_questions: { id: string }[]
}

export default async function AssessmentsPage() {
  const supabase = await createClient()

  const { data: assessments } = (await supabase
    .from('assessments')
    .select('id, title, description, is_active, assessment_questions(id)')
    .order('created_at')) as unknown as { data: RawAssessment[] | null }

  const rows = assessments ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        eyebrow="Onboarding"
        icon={ClipboardList}
        title="Assessments"
        subtitle="Diagnostic quizzes taken during onboarding. Correct answers award parameter points."
        action={
          <Link
            href="/admin/assessments/new"
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            + New Assessment
          </Link>
        }
      />

      {rows.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No assessments yet. Create the first one.</div>
      ) : (
        <div className="clay-card divide-y divide-black/[0.06]">
          {rows.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${a.is_active ? 'text-foreground' : 'line-through text-muted'}`}>
                  {a.title}
                </p>
                <p className="text-xs text-muted truncate">
                  {(a.assessment_questions ?? []).length} question
                  {(a.assessment_questions ?? []).length === 1 ? '' : 's'}
                  {a.description ? ` · ${a.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href={`/admin/assessments/${a.id}/edit`} className="text-xs text-primary hover:underline">
                  Edit
                </Link>
                <form action={toggleAssessmentActiveAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="is_active" value={String(a.is_active)} />
                  <button type="submit" className="text-xs text-muted hover:text-foreground transition-colors">
                    {a.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
