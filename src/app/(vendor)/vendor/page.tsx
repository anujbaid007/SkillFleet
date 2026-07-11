import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, CheckCircle2, XCircle, Plus, ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'

interface Row {
  id: string
  title: string
  review_status: string
}

export default async function VendorDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: vendor }, { data: offerings }] = await Promise.all([
    supabase.from('vendors').select('org_name').eq('id', user.id).single(),
    supabase.from('offerings').select('id, title, review_status').eq('vendor_id', user.id) as unknown as Promise<{
      data: Row[] | null
    }>,
  ])

  const rows = offerings ?? []
  const pending = rows.filter((o) => o.review_status === 'pending').length
  const approved = rows.filter((o) => o.review_status === 'approved').length
  const rejected = rows.filter((o) => o.review_status === 'rejected').length

  const stats = [
    { label: 'Pending review', value: pending, icon: Clock, tint: 'from-accent-yellow/[0.12]', text: 'text-accent-yellow' },
    { label: 'Approved & live', value: approved, icon: CheckCircle2, tint: 'from-green-500/[0.1]', text: 'text-green-600' },
    { label: 'Needs changes', value: rejected, icon: XCircle, tint: 'from-red-500/[0.1]', text: 'text-red-500' },
  ]

  return (
    <div className="space-y-7">
      <Reveal>
        <GradientCard className="p-6 sm:p-8">
          <p className="text-white/70 text-sm font-medium">Vendor console</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
            {vendor?.org_name ?? 'Welcome'}
          </h1>
          <p className="text-white/80 text-sm mt-2 max-w-md">
            List your activities on SkillFleet. Every listing is reviewed by our team before it goes live to families.
          </p>
          <Link
            href="/vendor/offerings/new"
            className="mt-4 inline-flex items-center gap-1.5 clay-button bg-white/15 text-white px-5 py-2.5 text-sm font-semibold hover:bg-white/25 transition-colors"
          >
            <Plus className="w-4 h-4" /> List a new activity
          </Link>
        </GradientCard>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={Math.min(i * 0.05, 0.2)}>
            <div className="clay-card p-5 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.tint} to-transparent pointer-events-none`} />
              <div className="relative z-10 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl bg-white flex items-center justify-center ${s.text}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted">{s.label}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <Link href="/vendor/offerings" className="clay-card p-5 flex items-center gap-4 group hover:-translate-y-0.5 transition-transform">
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-foreground">Manage your listings</p>
            <p className="text-sm text-muted">{rows.length} total · review status, edits and resubmissions.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>
      </Reveal>
    </div>
  )
}
