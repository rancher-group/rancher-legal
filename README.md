## Latest release authority (2026-10-08)
Owner approved public Rancher Legal corresponding-source repository; portal
remains private. This implementation phase makes no remote writes. AWS setup
is deferred to owner; no SCP retries/bypass. See docs/source-release.md for
release-matched source/build link and complete deploy inputs. Earlier local-only
and private-repository statements below are historical, superseded handoffs.

# Rancher Legal

**Latest owner authority: LOCAL ONLY.** Run the supported isolated stack via
[docs/local-run.md](docs/local-run.md). No remote publication/provisioning/
deployment/source disclosure or automatic release without new go-ahead.

Standalone invitation-only legal application adapted from Mike revision
`d69c259784002abe4d855e44ed7d629927e447ec`. Intended frontend:
https://legal.gorancher.com. This repository must remain **private**.
No production users, documents, credentials, Git history or backend resources
were copied. This is source implementation, not a deployed service.

## Runtime boundary

- `frontend/`: Next.js 16, same-origin `/api` gateway; server-only `API_BASE_URL`.
- `backend/`: Express API, conversion (LibreOffice), authentication,
  organization/project authorization, private storage and persistent jobs.
- `packages/`: shared contracts and supporting source.
- `word-addin/`: retained source/test dependencies only; not a Rancher deployment.
- Supabase auth/Postgres and S3-compatible private storage must be dedicated
  Rancher-owned resources. Never use GrowthCast or homepage production services.
- Separate workers can run `node dist/worker.js` with `WORKERS_MODE=none` on
  the API; otherwise the supported worker-thread mode handles background jobs.

## Container-only development and checks

Requires Docker/Compose, no host npm installation. Read AGENTS.md and
`docs/safe-local-testing.md` first. Install into the destination tree only:

```sh
docker run --rm -v "$PWD:/workspace" -w /workspace/frontend node:22-slim npm ci
docker run --rm -v "$PWD:/workspace" -w /workspace/backend node:22-slim npm ci
docker run --rm --network none -v "$PWD:/workspace" -w /workspace/frontend node:22-slim sh -c 'npm test && npm run lint && npm run typecheck'
docker run --rm --network none -v "$PWD:/workspace" -w /workspace/backend node:22-slim sh -c 'npm test && npm run build && npm run typecheck:test'
docker build -f frontend/Dockerfile -t rancher-legal-frontend:local .
docker build -f backend/Dockerfile -t rancher-legal-backend:local .
```

`docker-compose.yml` is **localhost only**, not a production template. Its
public demo JWTs, autoconfirm and wildcard redirects must never be exposed.
Mail goes to local Mailpit; Google OAuth defaults off. Never configure real
SMTP/model/payment/webhook credentials for tests. Unit tests run without
external networking. Local integration/browser tests require disposable data
and provider stubs; do not invoke real contracts or deliveries.

## Production configuration and release

See `docs/rancher-configuration.md` and `deployment/rancher/compose.yml`.
Backend containers, auth/database, private storage and workers are necessary;
Vercel alone does not run the full application. Missing production auth URLs
or gateway configuration fail closed. Start a fresh database using
`backend/schema.sql`; historical migrations are for existing compatible
installs, not blind replay on fresh/foreign databases.

Provider identity, isolated-resource plans, current pricing, domain/auth
redirects, exact trusted origins and non-destructive dry-run must be reviewed
before rollout. Bootstrap administrator, optional OAuth/email sender policy,
legal/privacy terms and any signing trust remain owner approval gates.
No new legal terms are supplied. AI outputs are not approved legal advice.

## License and source access

The inherited code is AGPL-3.0-only; LICENSE and copyright notices are retained.
A private repository does not by itself provide corresponding source access
for hosted users. The owner must approve an appropriate app-user source
access mechanism or establish separate rights before release; no public repo,
source archive distribution or new license acceptance is authorized here.
The exact deployed modified source and build materials must be covered.
No source-serving subsystem is added while that decision is unresolved.
