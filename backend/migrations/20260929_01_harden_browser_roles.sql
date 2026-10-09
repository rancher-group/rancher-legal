-- Migration date: 2026-09-29
-- Keep backend-managed workflow defaults private from PostgREST browser roles.

alter table public.default_workflow_installations enable row level security;
alter table public.quick_actions enable row level security;

revoke all on public.default_workflow_installations from anon, authenticated;
revoke all on public.quick_actions from anon, authenticated;

-- These functions are trigger entry points, not public RPCs.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_email_updated() from public, anon, authenticated;
revoke all on function public.org_members_protect_last_admin() from public, anon, authenticated;
revoke all on function public.touch_chat_from_message() from public, anon, authenticated;
