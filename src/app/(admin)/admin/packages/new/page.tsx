import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PackageTierForm } from '@/components/admin/package-tier-form'
import { createTierAction } from '../actions'

export default function NewPackageTierPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link
        href="/admin/packages"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Packages
      </Link>
      <h1 className="font-display text-2xl font-bold text-foreground">New Package Tier</h1>
      <PackageTierForm action={createTierAction} />
    </div>
  )
}
