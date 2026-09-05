import { requireAdmin } from '@/lib/admin/guard'
import { NewAssessmentForm } from './form'

/**
 * The form itself is a client component and lives in ./form.tsx, because a
 * page has to be a server component to await the gate: the (admin) layout's
 * redirect does not stop this segment from rendering for a non-admin. See
 * src/lib/admin/guard.ts.
 */
export default async function NewAssessmentPage() {
  await requireAdmin()
  return <NewAssessmentForm />
}
