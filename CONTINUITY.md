# Current implementation authority (2026-10-08)
Owner now authorizes private Rancher repositories and remote deployment by the
release worker after identity verification and non-destructive dry-run/preflight.
This implementation phase makes NO remote writes; preserve localhost3002/3003.
Earlier LOCAL ONLY handoffs below are historical and superseded. Source-access
or separate-rights policy remains an owner decision; do not publish source.

# Rancher Legal continuity

## Authority
Latest owner direction: LOCAL ONLY, run locally and leave Docker services for
inspection. No remote repository/push/deployment/provisioning/source disclosure
or automatic rollout without new owner go-ahead. Repository must remain private.
Preserve AGPL and copyright; hosted user source-access or separate-rights policy
is unresolved. Bootstrap production admin and legal terms are not approved.

## Implementation
Clean source export from read-only mike-legal HEAD
 d69c259784002abe4d855e44ed7d629927e447ec.
Frontend/backend/shared source, local infrastructure, source tests and needed
Word-add-in dependency source retained; add-in deployment not enabled. No git
history, .env, auth state, customer documents, screenshots, source build output
or node_modules copied. Dependencies/artifacts generated in destination only
via containers, ignored by Git. LICENSE retained. Rebranded metadata/logo,
login/server invitation message and native Georgia/Arial semantic theme using
homepage Rancher assets/tokens. Auth/security/organization grants unchanged.

## Local runtime
See docs/local-run.md for start/stop/access. Docker project rancher-legal-local;
frontend localhost:3002, backend ingress localhost:3003, Mailpit localhost:18025.
Private isolated local auth/DB/storage; API egress blocked. Signup denied;
synthetic local E2E login HTTP 200, no production entitlement. Password file
ignored/mode600. Model providers unconfigured; workflows intentionally unseeded.
Never claim LLM integrations or full browser acceptance from HTTP smoke checks.

## Validation and gates
Container images built; standard offline unit suites, lint/typechecks/builds
recorded under ignored validation/. Initial failures included excluded .mts
Vitest configs, stale open-signup tests, unstubbed title calls, missing README,
unmounted browser-role hardening migration and a document-canvas token.
Destination corrections preserve invitation-only behavior; title generation
stubbed at provider boundary and success/failure reply behavior tested.
No source changes or remote writes. No commits or deployments.
Reviewer must verify full logs, security/browser scenarios, dependency audit
and exact export safety before any future rollout. Existing lint warnings and
npm audit vulnerabilities require triage; no automatic dependency upgrades.

## Resumed 2026-10-08 authority and work
Owner approved public legal corresponding-source repo; previous private/local-only
handoffs superseded. No remote writes here; AWS deferred to owner. Source link and
release inputs: docs/source-release.md. Targeted dependencies patched; exact
advisories/reachability: docs/dependency-triage.md. Real Chromium found unreachable
presigned local uploads (fixed via storage ingress while storage remains internal)
and cross-origin download ignoring filename (fixed with same-origin file stream).
New browser regression: e2e/rancher-local.spec.ts; credentials kept only in ignored
mode600 local fixture files, no traces/screenshots. Full acceptance result in bound
report; do not assume all checks passed from this continuity entry.
