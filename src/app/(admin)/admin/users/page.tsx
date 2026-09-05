import Link from 'next/link'
import { Check, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { Pagination } from '@/components/admin/pagination'
import { getUsersPage, parseUsersQuery, usersQueryToString, type UsersSort } from '@/lib/admin/users'
import type { SearchParams } from '@/lib/admin/scope'
import { formatIstDay, istDay } from '@/lib/isc/dates'
import { requireAdmin } from '@/lib/admin/guard'

const BASE_PATH = '/admin/users'

const ROLE_OPTIONS = ['student', 'coordinator', 'vendor', 'admin']

const ROLE_BADGE: Record<string, string> = {
  student: 'bg-primary/10 text-primary',
  coordinator: 'bg-accent-teal/10 text-accent-teal',
  admin: 'bg-accent-pink/10 text-accent-pink',
  vendor: 'bg-accent-yellow/10 text-accent-yellow',
  parent: 'bg-slate-100 text-slate-600',
}

const SORT_OPTIONS: { value: UsersSort; label: string }[] = [
  { value: 'created_desc', label: 'Newest first' },
  { value: 'created_asc', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name, A to Z' },
]

/**
 * Every account, found and paged by the database.
 *
 * This used to load every profile in one RPC call and filter it with
 * JavaScript on the server -- fine at a few hundred users, a multi-megabyte
 * fetch on every page view at two hundred thousand, and the first thing on
 * this app that would fall over. admin_users_page does the search, the
 * filtering and the counting in Postgres; this page only renders a page of
 * it.
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // The gate. First statement, before any reader: a layout does not stop this
  // page from rendering for a non-admin. See src/lib/admin/guard.ts.
  await requireAdmin()
  const sp = await searchParams
  const query = parseUsersQuery(sp)
  const supabase = await createClient()
  const page = await getUsersPage(supabase, query)

  const header = (
    <PageHeader
      eyebrow="People"
      icon={Users}
      title="Users"
      subtitle="Find anyone by name, email, phone or school."
    />
  )

  // The founder has not pasted the migration yet. That is a setup step, not a
  // fault, so the page keeps its heading and navigation and says what to do.
  if (!page.ok && page.kind === 'migration-missing') {
    return (
      <div className="space-y-8">
        {header}
        <MigrationMissing message={page.message} />
      </div>
    )
  }

  const hrefFor = (p: number) => BASE_PATH + usersQueryToString(query, { page: p })
  const filtered = Boolean(query.q || query.role || query.onboarded !== undefined)

  return (
    <div className="space-y-6">
      {header}

      {/* A GET form: every filter lives in the URL, so a filtered view can be bookmarked or shared. */}
      <div className="clay-card p-5 sm:p-6">
        <form method="get" action={BASE_PATH} className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={query.q ?? ''}
            placeholder="Name, email, phone or school"
            aria-label="Search users"
            className="h-10 min-w-[14rem] flex-1 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm text-foreground placeholder:text-muted/60"
          />
          <select
            name="role"
            defaultValue={query.role ?? ''}
            aria-label="Role"
            className="h-10 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm capitalize text-foreground"
          >
            <option value="">Any role</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
          <select
            name="onboarded"
            defaultValue={query.onboarded === undefined ? '' : query.onboarded ? 'yes' : 'no'}
            aria-label="Onboarding"
            className="h-10 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm text-foreground"
          >
            <option value="">Onboarded: any</option>
            <option value="yes">Onboarded: yes</option>
            <option value="no">Onboarded: no</option>
          </select>
          <select
            name="sort"
            defaultValue={query.sort}
            aria-label="Sort"
            className="h-10 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm text-foreground"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="submit" className="clay-button h-10 bg-cta px-4 text-sm font-semibold text-white">
            Search
          </button>
          {filtered && (
            <Link
              href={BASE_PATH}
              className="inline-flex h-10 items-center px-3 text-sm text-muted hover:text-foreground"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      <Reveal delay={0.04}>
        {page.ok ? (
          <div className="clay-card overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
              <h2 className="font-display text-base font-bold text-foreground sm:text-lg">Accounts</h2>
              <span className="text-xs text-muted">
                {page.data.total.toLocaleString('en-IN')} {page.data.total === 1 ? 'account' : 'accounts'}{' '}
                match{filtered ? ' these filters' : ''}
              </span>
            </div>
            <table className="mt-3 w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">School</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">State</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Class</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                    Onboarded
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {page.data.rows.map((u) => (
                  <tr key={u.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-primary hover:underline">
                        {u.full_name ?? 'Unnamed'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{u.email ?? 'No account'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[u.role] ?? 'bg-black/[0.06] text-muted'}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{u.school_name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{u.school_state ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{u.school_class ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {u.onboarding_completed ? (
                        <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Onboarded" />
                      ) : (
                        <span aria-label="Not onboarded">{'—'}</span>
                      )}
                    </td>
                    {/*
                      formatIstDay(istDay(...)), never toLocaleDateString: this
                      renders on the server, whose zone is UTC on Workers, so a
                      just-after-midnight Indian signup would read as the
                      previous day here.
                    */}
                    <td className="px-4 py-3 text-muted">{formatIstDay(istDay(u.created_at))}</td>
                  </tr>
                ))}
                {page.data.rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted">
                      Nobody matches these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-5 pb-5">
              <Pagination page={page.data.page} total={page.data.total} size={page.data.size} hrefFor={hrefFor} />
            </div>
          </div>
        ) : (
          <SectionFailed title="Users" message={page.message} />
        )}
      </Reveal>
    </div>
  )
}
