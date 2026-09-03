import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

/*
  Service role client — bypasses RLS. NEVER import in client components.
  Only used in Server Actions and Route Handlers for admin operations.

  Built on first use rather than at import. `next build` evaluates these
  modules while collecting page data, and the build machine has no reason to
  hold the service-role key: a deploy pipeline that did would be one leaked
  log away from a credential that bypasses every row-level policy. Requests
  on the worker have the key, so the first real call constructs the client.
*/
let client: SupabaseClient<Database> | null = null

function getAdminClient(): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return client
}

export const adminClient: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_target, prop) {
      const real = getAdminClient()
      const value = Reflect.get(real, prop, real)
      return typeof value === 'function' ? value.bind(real) : value
    },
  }
)
