import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Service role client — bypasses RLS. NEVER import in client components.
// Only used in Server Actions and Route Handlers for admin operations.
export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
