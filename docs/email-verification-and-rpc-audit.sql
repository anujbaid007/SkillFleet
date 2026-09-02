-- ============================================================================
-- 1. FINDING 3 — turn real email verification back on.
--
-- auto_confirm_user() marks every new account's email as confirmed the instant
-- it is inserted, so Supabase's "Confirm email" setting has been doing nothing.
-- Dropping the trigger makes confirmation real: a person must click the link
-- Supabase emails before they can sign in. The app already handles that path
-- (signup shows "check your email" when no session comes back).
--
-- Do this in one go, and only when you are ready for new signups to need the
-- confirmation click. Existing accounts are unaffected: they are already
-- confirmed and stay that way.
-- ============================================================================

drop trigger if exists on_auth_user_created_confirm on auth.users;
drop function if exists public.auto_confirm_user();

-- If you would rather keep instant sign-in for now, skip the two lines above
-- and instead close the account-squat path from the dashboard:
--   Authentication → Providers → (settings) → "Automatic linking" → off.
-- That stops a Google sign-in being attached to an existing password account
-- with the same, unverified, email. The trigger drop is the better fix.


-- ============================================================================
-- 2. RPC OWNERSHIP AUDIT — read-only.
--
-- The app passes entry_id / member_id straight into these functions and
-- relies on each one checking auth.uid() itself. Prints their bodies so that
-- can be confirmed. Look for auth.uid() being compared against the entry's
-- created_by (or the member's user_id) before any write.
-- ============================================================================

select p.proname as function_name, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'isc_save_entry', 'isc_submit_entry', 'isc_get_entry',
    'isc_add_member', 'isc_remove_member', 'isc_leave_entry',
    'isc_respond_to_invite', 'isc_give_consent', 'isc_claim_invites'
  )
order by p.proname;
