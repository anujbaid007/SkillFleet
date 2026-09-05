import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchAll } from '@/lib/admin/users'

/*
  The admin command-bar lookup: students, schools and coordinators in one
  JSON round trip, for the search box in the admin header.

  WHY THIS ROUTE CHECKS THE ADMIN ITSELF, when the (admin) layout already
  does: searchAll caches successes for fifteen seconds and that cache is NOT
  scoped to a user, so a cached answer would be served without the SQL's own
  is_admin() gate ever running again. Same order as
  src/app/(admin)/admin/isc/export/route.ts -- getUser(), then the role from
  user_profiles, and only then the data.
*/

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Nothing is read until this passes.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ hits: [] }, 401)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') return json({ hits: [] }, 403)

  // searchAll itself returns [] under two characters, without a round trip --
  // this route does not special-case it, so both callers agree on the answer.
  const q = request.nextUrl.searchParams.get('q') ?? ''
  const result = await searchAll(supabase, q)
  if (!result.ok) {
    return json({ hits: [] }, result.kind === 'migration-missing' ? 503 : 500)
  }
  return json({ hits: result.data }, 200)
}
