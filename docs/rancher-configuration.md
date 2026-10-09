# Rancher production configuration

No secret values belong in this repository. Populate managed secrets in the
verified Rancher provider organizations; maintain separate preview/test and
production credentials. Release rollout is separately owned.

Frontend server: `API_BASE_URL` (Rancher API HTTPS origin). No backend keys in
`NEXT_PUBLIC_*`. Optional Sentry must use Rancher-owned reporting and privacy
filters; disabled reporting is supported. No marketing tracking is imported.

Backend names (required according to enabled feature):

- `NODE_ENV`, `PORT`, `FRONTEND_URL`, `API_PUBLIC_URL`, `ALLOWED_ORIGINS`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `R2_ENDPOINT_URL`, `R2_REGION`, `R2_PUBLIC_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (S3-compatible private object store)
- `DOWNLOAD_SIGNING_SECRET`, `SPOTLIGHT_NONCE_SECRET`,
  `USER_API_KEYS_ENCRYPTION_SECRET`, `MCP_CONNECTORS_ENCRYPTION_SECRET`
- `WORKERS_MODE`, optional `REDIS_URL`, `ASYNC_DOCUMENT_CONVERSION`,
  `ASYNC_TABULAR_EXTRACTION`; API/worker must share isolated queue configuration.

Production frontend origin: `https://legal.gorancher.com`. Public API links:
`https://legal.gorancher.com/api`. `ALLOWED_ORIGINS` must contain only exact
approved origins; do not enable Word add-in or wildcard preview origins.
Supabase site/redirect URLs must match approved Rancher flows. Preserve
verification, MFA, secure HttpOnly host-prefixed cookies, RLS and explicit
ownership/project grants (service-role bypass does not authorize users).

Model providers and connectors are opt-in. Supported secret/config names are
inventoried in `docs/environment-names.txt`, extracted from code; this inventory
is not an instruction to enable every integration. Do not enable OAuth,
workflow contributions, SSO, email or outbound providers without scoped
approval. Keep `LOG_RAW_LLM_STREAM` off. Signing and encryption secrets must be
freshly generated and stored in approved secret management, never copied.

Deployment template does not provision or start infrastructure. Require
Rancher org identity, inventory, reviewed change plan and dated SKU/quantity
cost before provisioning. Include API/worker compute, database/auth, private
objects, egress, backups/logs and metered model usage. No price is claimed
without a current quote. Use smallest supported production sizing.

Release blocked until configuration, bootstrap identity, legal/source-access
policy and functional security/browser acceptance are reviewed. Rollback uses
compatible image/migration pins, never GrowthCast data or credentials.
