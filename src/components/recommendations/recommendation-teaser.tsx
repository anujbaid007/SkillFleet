import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

/**
 * Compact cross-link into the recommender. Drop it on the growth profile
 * (student) or dashboard (parent) to route people to the full experience.
 */
export function RecommendationTeaser({ name, forChild }: { name: string; forChild?: boolean }) {
  return (
    <Link
      href="/recommendations"
      className="clay-card p-5 flex items-center gap-4 group hover:-translate-y-0.5 transition-transform relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] to-accent-teal/[0.05] pointer-events-none" />
      <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
        <Sparkles className="w-6 h-6" />
      </div>
      <div className="relative z-10 flex-1 min-w-0">
        <p className="font-display font-bold text-foreground">Personalised recommendations</p>
        <p className="text-sm text-muted">
          Activities picked to close {forChild ? `${name}’s` : 'your'} biggest growth gaps.
        </p>
      </div>
      <ArrowRight className="relative z-10 w-5 h-5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  )
}
