import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  accent?: 'primary' | 'yellow' | 'teal' | 'pink'
  icon?: LucideIcon
}

const ACCENT: Record<string, { text: string; badge: string; glow: string }> = {
  primary: { text: 'text-primary', badge: 'bg-primary/10 text-primary', glow: 'from-primary/15' },
  yellow: { text: 'text-accent-yellow', badge: 'bg-accent-yellow/10 text-accent-yellow', glow: 'from-accent-yellow/15' },
  teal: { text: 'text-accent-teal', badge: 'bg-accent-teal/10 text-accent-teal', glow: 'from-accent-teal/15' },
  pink: { text: 'text-accent-pink', badge: 'bg-accent-pink/10 text-accent-pink', glow: 'from-accent-pink/15' },
}

export function StatCard({ label, value, sub, accent = 'primary', icon: Icon }: StatCardProps) {
  const a = ACCENT[accent] ?? ACCENT.primary
  return (
    <div className="clay-card p-5 relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${a.glow} to-transparent blur-xl`} />
      <div className="relative z-10 space-y-1">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${a.badge} flex items-center justify-center mb-2`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <p className="text-xs font-medium text-muted uppercase tracking-wider">{label}</p>
        <p className={`font-display text-3xl font-bold ${a.text}`}>{value}</p>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
    </div>
  )
}
