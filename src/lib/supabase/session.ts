import { cache } from 'react'
import { createClient } from './server'
import type { Database } from '../types/database'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

/*
  Per-request memoisation of the two lookups every signed-in page repeats.

  Rendering one platform page runs the layout and the page itself, and each was
  independently calling auth.getUser() and then selecting the same
  user_profiles row. Both are network round trips to Supabase, and on
  /isc/[track] they were four of roughly ten calls made one after another —
  which is what a reader feels as a slow tap.

  React's cache() scopes a result to a single request, so the layout warms
  these and every component below it reads the same answer. It does not cache
  anything across requests or between users: a new request re-runs them.
*/

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
  return data ?? null
})
