# Local implementation acceptance evidence

All npm operations ran in Node22 containers. No host install, remote writes,
commits or deployments. Full machine logs are ignored in validation/.

- Frontend: 216 suites / 1770 tests pass; lint 0 errors, 31 inherited warnings;
  typecheck passes (`validation/frontend-accepted.log`).
- Backend: 200 suites / 2556 tests pass; 7 suites / 47 tests skipped by inherited
  disposable-stack conditions; build and test typecheck pass
  (`validation/backend-accepted-final.log`).
- Images built from repo root: frontend and LibreOffice backend pass
  (`validation/frontend-image-final.log`, `validation/backend-image.log`).
- Architecture, auth/cookies/origins/gateway and organization/project denials
  included in passing unit/integration suites. No browser/real-provider flow
  completion claimed. Full disposable-stack/e2e acceptance not yet run.
- Local health: login page, same-origin health and backend health HTTP200.
  Anonymous session401; signup403/signup_disabled with trusted local Origin;
  missing Origin403/untrusted_origin; synthetic E2E login200. Mail stays local.
- `validation/export-audit.json`: no forbidden export paths, no staged files;
  credential-looking AWS strings occur only in two inherited synthetic
  observability redaction tests. Local Compose contains known public demo JWTs,
  never copied production credentials. No .env files exported.
- npm ci audit: frontend27 findings (2 critical/12 high), backend12 (1 critical/
  4 high). Triage before release; no automatic upgrades or license acceptance.

Exact deliverable paths: docs/changed-files.txt. Source allowlist paths:
docs/export-files.txt. Runtime access file is ignored/mode600 and deliberately
not acceptance evidence. Generated .repowise cache discovered during validation
is preserved, excluded from Git/Docker and not part of the source export.
