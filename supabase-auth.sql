-- AI-EDU / hd-06: one-time profile permission hardening.
-- Metadata verified in the project's Supabase SQL Editor on 2026-11-04:
--   public.profiles: id, full_name, department, role, created_at, updated_at.
--   RLS is enabled. Authenticated users can SELECT; UPDATE is limited to
--   id = auth.uid() by the existing profiles_update_own policy.
--   on_auth_user_created calls the SECURITY DEFINER handle_new_user trigger,
--   which inserts id/full_name/department and uses the role default 'member'.
--   No client INSERT is required, and user metadata cannot set the role.
--
-- Run this file as the project owner in Supabase SQL Editor. It is safe to
-- rerun. Existing rows, SELECT access, policies, triggers, and other tables
-- are unchanged. Browser clients can edit only full_name and department.

begin;

revoke insert, update, delete, truncate, references, trigger
  on table public.profiles from authenticated;

-- A table-level revoke does not remove separate column-level grants.
revoke update (id, full_name, department, role, created_at, updated_at)
  on table public.profiles from authenticated;

grant update (full_name, department)
  on table public.profiles to authenticated;

-- Abort the transaction if effective permissions differ from the intended
-- result (for example, because another role supplies an inherited grant).
do $verify_profile_permissions$
begin
  if not has_table_privilege('authenticated', 'public.profiles', 'SELECT')
     or not has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.profiles', 'department', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'created_at', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'updated_at', 'UPDATE')
     or has_table_privilege('authenticated', 'public.profiles', 'INSERT')
     or has_table_privilege('authenticated', 'public.profiles', 'DELETE')
     or has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE')
     or has_table_privilege('authenticated', 'public.profiles', 'REFERENCES')
     or has_table_privilege('authenticated', 'public.profiles', 'TRIGGER')
  then
    raise exception 'Profile permission verification failed; transaction must be rolled back.';
  end if;
end;
$verify_profile_permissions$;

commit;

-- Expected: true, true, true, false, false.
select
  has_table_privilege('authenticated', 'public.profiles', 'SELECT') as select_preserved,
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE') as can_update_full_name,
  has_column_privilege('authenticated', 'public.profiles', 'department', 'UPDATE') as can_update_department,
  has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') as can_update_role,
  has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE') as can_truncate;
