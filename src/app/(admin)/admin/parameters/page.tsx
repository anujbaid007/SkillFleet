import { createClient } from '@/lib/supabase/server'
import { ParameterRow } from '@/components/admin/parameter-row'
import { AddParameterForm } from '@/components/admin/add-parameter-form'
import { ScoreLevelRow } from '@/components/admin/score-level-row'
import { PageHeader } from '@/components/ui/page-header'
import { Sliders } from 'lucide-react'

interface RawParameter {
  id: string
  name: string
  description: string | null
  weight: number
  display_order: number
  is_active: boolean
}

interface RawScoreLevel {
  id: string
  name: string
  min_score: number
  max_score: number
  color_class: string
  display_order: number
}

export default async function ParametersPage() {
  const supabase = await createClient()

  const [{ data: parameters }, { data: scoreLevels }] = (await Promise.all([
    supabase
      .from('growth_parameters')
      .select('id, name, description, weight, display_order, is_active')
      .order('display_order'),
    supabase
      .from('score_levels')
      .select('id, name, min_score, max_score, color_class, display_order')
      .order('display_order'),
  ])) as [{ data: RawParameter[] | null }, { data: RawScoreLevel[] | null }]

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="space-y-4">
        <PageHeader
          eyebrow="Scoring"
          icon={Sliders}
          title="Parameters"
          subtitle="Growth parameters drive all scoring. Never hardcode — always managed here."
        />

        <div className="clay-card divide-y divide-black/[0.06]">
          {(parameters ?? []).map((p) => (
            <ParameterRow key={p.id} param={p} />
          ))}
        </div>

        <AddParameterForm />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Score Levels</h2>
          <p className="text-muted mt-1 text-sm">Display-scale bands (0–100). Shown on student Growth Profile.</p>
        </div>

        <div className="clay-card divide-y divide-black/[0.06]">
          {(scoreLevels ?? []).map((level) => (
            <ScoreLevelRow key={level.id} level={level} />
          ))}
        </div>
      </div>
    </div>
  )
}
