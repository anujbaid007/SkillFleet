import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SwitchBootstrapForm } from '@/components/platform/switch-bootstrap-form'
import type { SwitchTarget } from '@/app/actions/switch'

/**
 * One-time-per-device sign-in that turns on frictionless family switching.
 * After this, moving between siblings is a single tap on this device.
 */
export default async function SwitchPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; expired?: string }>
}) {
  const { to, expired } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const targets = ((await supabase.rpc('get_switch_targets')).data ?? []) as SwitchTarget[]
  const target = targets.find((t) => t.user_id === to)
  if (!target) redirect('/dashboard')

  const name = target.full_name ?? 'your sibling'

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link
        href="/dashboard"
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <Link href="/dashboard" className="mb-8">
        <Image src="/logo.svg" alt="SkillFleet" width={160} height={44} className="h-10 w-auto" priority />
      </Link>

      <div className="w-full max-w-md">
        <SwitchBootstrapForm
          targetId={target.user_id}
          name={name}
          email={target.email}
          expired={expired === '1'}
        />
      </div>
    </div>
  )
}
