/*
  The admin gate, in the two places a gate has to be.

  WHY THE LAYOUT IS NOT ENOUGH. src/app/(admin)/layout.tsx redirects a
  non-admin, and it must keep doing so -- but in this version of Next a layout
  does NOT control whether the rest of the route renders. Route segments are
  rendered by the router, so a layout that redirects does not stop the page
  under it from running (node_modules/next/dist/docs/01-app/02-guides/
  authentication.md, "Layouts and auth checks": "A layout also does not control
  whether the rest of the route renders"). The middleware proxy only checks
  that SOMEBODY is signed in.

  So a signed-in student opening /admin used to run the page's readers with the
  student's own client. The RPC readers fail safe -- is_admin() raises inside
  the function and cachedOk() never stores a failure -- but the four plain-table
  readers do not: they succeed under the student's row-level security, see one
  profile and no queue rows, and store THAT under a cache key that is not scoped
  to a user (src/lib/admin/cache.ts). Every admin on the same isolate then read
  "Students 1" and empty queues for up to a minute, and the student could
  re-poison it every minute.

  TWO GUARDS, ON PURPOSE:

    * requireAdmin() is awaited as the first statement of every page under
      src/app/(admin)/admin/. It is the one that gives a non-admin the right
      answer -- a redirect -- rather than an error panel.
    * assertAdmin(db) is inside the four plain-table readers themselves, so a
      page added later that forgets the first guard still cannot put a
      non-admin's answer in the shared cache. It reads the role from the CLIENT
      IT WAS HANDED, which is the client whose rows would have been cached.

  Both are wrapped in React cache(), so the whole thing costs one auth call and
  one row per request however many readers a page calls. cache() outside a
  request (a unit test) simply calls through.
*/

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { ok, type AdminResult } from '@/lib/admin/errors'
import { getCurrentProfile, getCurrentUser } from '@/lib/supabase/session'
import type { createClient } from '@/lib/supabase/server'

type Db = Awaited<ReturnType<typeof createClient>>

/** Deliberately not 'migration-missing': this is a refusal, not a setup step. */
export const ADMIN_ONLY_MESSAGE = 'Admins only.'

/**
 * The first line of every admin page. Signed out goes to the login screen,
 * signed in but not an admin goes home -- the same two destinations the
 * (admin) layout sends them to, so the page and its shell agree.
 *
 * It reads through getCurrentUser/getCurrentProfile, which are the same
 * request-memoised helpers the layout uses, so running both costs one lookup.
 */
export const requireAdmin = cache(async (): Promise<void> => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const profile = await getCurrentProfile()
  if (profile?.role !== 'admin') redirect('/')
})

/**
 * Belt and braces for a reader: is the client it was handed an admin's?
 *
 * Returns a failed AdminResult rather than throwing or redirecting, because a
 * reader's caller is a section of a page and a section knows how to show a
 * failure. The caller must check it BEFORE it reads the cache, not inside the
 * cached function, or a non-admin would still be served whatever an admin had
 * already put there.
 */
export const assertAdmin = cache(async (db: Db): Promise<AdminResult<true>> => {
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return { ok: false, kind: 'failed', message: ADMIN_ONLY_MESSAGE }

  const { data: profile } = await db
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') return { ok: false, kind: 'failed', message: ADMIN_ONLY_MESSAGE }

  return ok(true)
})
