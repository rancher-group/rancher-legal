# Current implementation authority (2026-10-08)
Owner now authorizes private Rancher repositories and remote deployment by the
release worker after identity verification and non-destructive dry-run/preflight.
This implementation phase makes NO remote writes; preserve localhost3002/3003.
Earlier LOCAL ONLY handoffs below are historical and superseded. Source-access
or separate-rights policy remains an owner decision; do not publish source.

# Running locally (latest owner scope)

No remote rollout is authorized. Repo stays private; source access remains
undecided. Current local stack is Docker-managed project `rancher-legal-local`.

- App: http://localhost:3002/login
- Same-origin API health: http://localhost:3002/api/health
- Backend health via local ingress: http://localhost:3003/health
- Captured mail: http://localhost:18025 (no external SMTP)
- Supabase local auth gateway: http://localhost:55421

All published ports bind 127.0.0.1. API, workers, DB/auth and private storage
are on the internal network, without internet egress. Only credential-free
frontend/NGINX ingress and the mail UI join an inspection bridge: Docker cannot
publish ports on an internal-only bridge. Storage browser uploads use credential-free gateway ingress localhost:19000;
SigV4 Host is preserved. Storage stays on the internal network. Database
debugging bindings remain inaccessible from host; inspect via exec.
The local NGINX ingress forwards to the internal backend on port 3003.
No provider integration is mocked as a functioning LLM: model features are
unconfigured and cannot make external calls. Workflow catalog is intentionally
unseeded (external workflow download disabled). Non-LLM legal app flows use real
isolated local auth/Postgres/private object storage.

```sh
# Validate first; preserve other projects and occupied ports.
docker compose -p rancher-legal-local -f docker-compose.yml -f docker-compose.local.yml config --quiet
# Images must already be built using README commands.
docker compose -p rancher-legal-local -f docker-compose.yml -f docker-compose.local.yml up -d --no-build
# Stop only this project, retain disposable local volumes.
docker compose -p rancher-legal-local -f docker-compose.yml -f docker-compose.local.yml stop
```

Services: `rancher-legal-local-{frontend,backend,gateway,db,auth,rest,storage,
redis,mailpit}-1`. Init/bucket/workflow-sync containers exit successfully.
Fresh isolated volumes use schema.sql only; no production migrations are run.

## Synthetic local test access

Invitation-only UI/API is preserved: `/signup` redirects and API signup denies.
A documented E2E synthetic identity (`e2e@mike.local`) was created using local
Supabase admin bootstrap only. It is not a Rancher production administrator.
Its fresh random password is in ignored `validation/local-access.json` with
mode 600: open that file privately, then log in at the URL above. Do not paste
its contents into chats, commits or evidence. HTTP login succeeded locally;
onboarding/browser flow acceptance remains separate.

For a new empty local stack, create that same fixture once:

```sh
umask 077
docker exec -i rancher-legal-local-backend-1 node --input-type=module < scripts/local-bootstrap.mjs > validation/local-access.json
```

The script refuses non-development/non-local targets and refuses replacing an
existing identity. Use synthetic fixture documents only. No customer records,
contracts, real deliveries or provider keys are authorized for local tests.

## Real browser regression
Bootstrap the second local account once using LOCAL_TEST_EMAIL as documented
in docs/source-release.md. Keep both credential files mode600. Run in container:

```sh
docker run --rm --network host -v "$PWD:/workspace" -w /workspace \
  -e PLAYWRIGHT_BASE_URL=http://localhost:3002 \
  mcr.microsoft.com/playwright:v1.63.0-noble \
  npx playwright test --config playwright.rancher.config.ts
```
Docker Desktop host networking must be enabled; host.docker.internal is NOT a
trusted browser origin. Do not widen allowed origins to make testing pass.
The test uses browser UI for login/upload/download, browser-authenticated fetch
for invitations and independent account checks. Screenshots/traces/video are
disabled; remove failed test-results before sharing because snapshots may contain
entered local credentials. All records are synthetic and mail is captured locally.
