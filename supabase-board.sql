-- Add a dedicated board category without changing existing posts or RLS.
-- Applied to AI-EDU on 2026-11-04.
begin;
alter table public.posts drop constraint posts_category_check;
alter table public.posts add constraint posts_category_check
  check (category in ('notice', 'magazine', 'files', 'gallery', 'board'));
-- Normal CRUD remains controlled by the existing owner/admin policies.
revoke truncate, references, trigger on public.posts from authenticated;
commit;
select pg_get_constraintdef(oid) as category_rule
from pg_constraint where conrelid = 'public.posts'::regclass
and conname = 'posts_category_check';
