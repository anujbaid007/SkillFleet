import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { toggleQuestionActiveAction } from './actions'
import { PageHeader } from '@/components/ui/page-header'
import { HelpCircle } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/guard'

interface RawQuestion {
  id: string
  text: string
  display_order: number
  is_active: boolean
  questionnaire_options: { id: string }[]
}

export default async function QuestionnairePage() {
  // The gate. First statement, before any reader: a layout does not stop this
  // page from rendering for a non-admin. See src/lib/admin/guard.ts.
  await requireAdmin()
  const supabase = await createClient()

  const { data: questions } = (await supabase
    .from('questionnaire_questions')
    .select('id, text, display_order, is_active, questionnaire_options(id)')
    .order('display_order')) as unknown as { data: RawQuestion[] | null }

  const rows = questions ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Onboarding"
        icon={HelpCircle}
        title="Questionnaire"
        subtitle="Onboarding questions that shape every new student&apos;s baseline scores."
        action={
          <Link
            href="/admin/questionnaire/new"
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            + New Question
          </Link>
        }
      />

      {rows.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No questions yet. Create the first one.</div>
      ) : (
        <div className="clay-card divide-y divide-black/[0.06]">
          {rows.map((q) => (
            <div key={q.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${q.is_active ? 'text-foreground' : 'line-through text-muted'}`}>
                  {q.text}
                </p>
                <p className="text-xs text-muted">
                  #{q.display_order} · {(q.questionnaire_options ?? []).length} option
                  {(q.questionnaire_options ?? []).length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href={`/admin/questionnaire/${q.id}/edit`} className="text-xs text-primary hover:underline">
                  Edit
                </Link>
                <form action={toggleQuestionActiveAction}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="is_active" value={String(q.is_active)} />
                  <button type="submit" className="text-xs text-muted hover:text-foreground transition-colors">
                    {q.is_active ? 'Deactivate' : 'Activate'}
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
