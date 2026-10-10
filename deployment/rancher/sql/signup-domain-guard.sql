-- Rancher Legal: @gorancher.com-only self-signup, plus default OpenRouter
-- models for every new account. Rancher deployment only; not part of the
-- upstream schema. Idempotent: apply after backend/schema.sql, then enable the
-- hook in Supabase Auth (RUNBOOK.md, "Auth settings"):
--   hook_before_user_created_enabled = true
--   hook_before_user_created_uri = pg-functions://postgres/public/hook_rancher_signup_email_domain

-- 1. Supabase "before user created" auth hook. GoTrue calls it before it
-- inserts any user; an error object rejects the signup with that status.
-- Only the exact domain gorancher.com passes (case-insensitive, trimmed;
-- plus-addressing allowed; subdomains and look-alikes rejected).
create or replace function public.hook_rancher_signup_email_domain(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  email text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if email ~ '^[^@\s]+@gorancher\.com$' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Signup is limited to Rancher team members. Use your @gorancher.com email address.'
    )
  );
end;
$$;

grant execute on function public.hook_rancher_signup_email_domain(jsonb)
  to supabase_auth_admin;
revoke execute on function public.hook_rancher_signup_email_domain(jsonb)
  from authenticated, anon, public;

-- 2. Default models for each new user, the same rows the runbook seeded for
-- the owner. Mike has no deployment-wide default model, and an
-- openrouter/<model> id only runs if the user saved it in user_router_models.
-- Postgres fires same-event triggers in name order, so this runs after
-- on_auth_user_created has made the profile. Existing choices are kept.
create or replace function public.rancher_seed_default_models()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_router_models (user_id, router, model_id, sort_order)
  values
    (new.id, 'openrouter', 'google/gemini-3.7-flash', 0),
    (new.id, 'openrouter', 'google/gemini-3.5-flash-lite', 1)
  on conflict do nothing;

  update public.user_profiles
  set last_selected_chat_model = coalesce(last_selected_chat_model, 'openrouter/google/gemini-3.7-flash'),
      tabular_model = coalesce(tabular_model, 'openrouter/google/gemini-3.7-flash'),
      title_model = coalesce(title_model, 'openrouter/google/gemini-3.5-flash-lite'),
      updated_at = now()
  where user_id = new.id;
  return new;
exception when others then
  -- Never block account creation over a missing default.
  return new;
end;
$$;

revoke all on function public.rancher_seed_default_models() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_seed_models on auth.users;
create trigger on_auth_user_created_seed_models
  after insert on auth.users
  for each row execute procedure public.rancher_seed_default_models();
