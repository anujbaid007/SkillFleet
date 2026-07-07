import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { Users } from 'lucide-react'

interface AdminUser {
  id: string
  full_name: string | null
  email: string
  role: string
  onboarding_completed: boolean
  city: string | null
  created_at: string
}

const ROLE_BADGE: Record<string, string> = {
  student: 'bg-primary/10 text-primary',
  parent: 'bg-accent-teal/10 text-accent-teal',
  admin: 'bg-accent-pink/10 text-accent-pink',
  vendor: 'bg-accent-yellow/10 text-accent-yellow',
}

const ROLE_FILTERS = ['student', 'parent', 'admin', 'vendor']

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>
}) {
  const { role: roleFilter, q } = await searchParams
  const supabase = await createClient()

  const { data: users } = await supabase.rpc('admin_list_users')
  let rows = (users ?? []) as AdminUser[]

  if (roleFilter) rows = rows.filter((u) => u.role === roleFilter)
  if (q) {
    const needle = q.toLowerCase()
    rows = rows.filter(
      (u) =>
        (u.full_name ?? '').toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle) ||
        (u.city ?? '').toLowerCase().includes(needle)
    )
  }

  const total = (users ?? []).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        icon={Users}
        title="Users"
        subtitle={`${total} accounts across all roles.`}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!roleFilter ? 'bg-primary text-white' : 'bg-black/5 text-muted hover:text-foreground'}`}
          >
            All
          </Link>
          {ROLE_FILTERS.map((r) => (
            <Link
              key={r}
              href={`/admin/users?role=${r}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${roleFilter === r ? 'bg-primary text-white' : 'bg-black/5 text-muted hover:text-foreground'}`}
            >
              {r}
            </Link>
          ))}
        </div>

        <form className="ml-auto">
          {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search name, email, city…"
            className="h-9 w-64 px-3 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">No users match these filters.</div>
      ) : (
        <div className="clay-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-left">
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.full_name ?? '—'}</p>
                    {u.role === 'student' && (
                      <p className="text-xs text-muted">
                        {u.onboarding_completed ? 'Onboarded' : 'Onboarding pending'}
                        {u.city ? ` · ${u.city}` : ''}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[u.role] ?? ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/users/${u.id}`} className="text-xs font-medium text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
