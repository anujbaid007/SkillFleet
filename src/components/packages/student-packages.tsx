import Link from 'next/link'
import { Layers, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'

interface StudentPkg {
  id: string
  slot_count: number
  slots_used: number
  status: string
  payment_status: string
  valid_until: string | null
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function StudentPackages({ packages }: { packages: StudentPkg[] }) {
  return (
    <div className="space-y-7 max-w-4xl">
      <PageHeader
        eyebrow="Bought for you"
        icon={Layers}
        title="My Packages"
        subtitle="Packages a parent bought for you, and the offerings booked with them."
      />

      {packages.length === 0 ? (
        <Reveal>
          <div className="clay-card p-8 text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Layers className="w-7 h-7 text-primary" />
            </div>
            <p className="font-display font-bold text-foreground">No packages yet</p>
            <p className="text-muted text-sm max-w-xs mx-auto">
              When a parent buys a package for you, it will appear here along with everything booked from it.
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="space-y-3">
          {packages.map((p, i) => {
            const remaining = Math.max(0, p.slot_count - p.slots_used)
            const usedPct = p.slot_count > 0 ? Math.round((p.slots_used / p.slot_count) * 100) : 0
            return (
              <Reveal key={p.id} delay={Math.min(i * 0.05, 0.3)}>
                <Link href={`/packages/${p.id}`} className="clay-card p-5 space-y-4 block relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center text-white font-display font-bold text-lg shrink-0">
                        {p.slot_count}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-foreground group-hover:text-primary transition-colors inline-flex items-center gap-1">
                          {p.slot_count}-slot package
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <p className="text-xs text-muted">
                          {remaining} of {p.slot_count} slots left · expires {fmtDate(p.valid_until)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div className="h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent-teal" style={{ width: `${usedPct}%` }} />
                      </div>
                      <p className="text-xs text-muted mt-1">{p.slots_used} booked · {remaining} remaining</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}
