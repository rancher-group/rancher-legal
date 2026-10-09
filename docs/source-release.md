# Corresponding source and release inputs

Owner approved PUBLIC `rancher-group/rancher-legal` on 2026-10-08. Portal remains
private. This phase publishes nothing. AWS work is deferred to owner setup.

Provenance: exported Mike revision d69c259784002abe4d855e44ed7d629927e447ec;
root package and retained LICENSE declare AGPL-3.0-only. Copyright/notices remain.
The visible app source/build link targets the Rancher repository, NOT upstream.
For release, set `NEXT_PUBLIC_GIT_SHA` to the exact published Rancher commit
(Vercel build environment); Docker uses `--build-arg GIT_SHA=<same commit>`.
An unset revision gives the repository link for local inspection only, not
release-matched acceptance. Verify the visible link resolves to the deployed
commit and corresponding README/build scripts/locks, packages/contracts,
Dockerfiles, schema/migrations and required shared sources before release.
Provide the same full tree as a downloadable archive at that revision.

Synthetic PDF provenance: `e2e/fixtures/test.pdf` was regenerated without any
external input. SHA-256 is
`c1e1fdd47713a837c1db9cf2e4f4399e9bf2a5b8c7c50e2f623cfa8ca28e0be9`
(606 bytes). Its sole text is `Synthetic Rancher test document`. Reproduce with
PDF-1.4, LF delimiters, five numbered objects: Catalog referencing Pages2;
Pages with Kids[3 0 R]/Count1; Page referencing Parent2, MediaBox[0 0 612 792],
Resources Font F1 referencing4, Contents5; Type1 Helvetica Font; stream object
with computed Length containing exactly
`BT /F1 12 Tf 72 720 Td (Synthetic Rancher test document) Tj ET` plus LF.
Each object is serialized as `<number> 0 obj\n<body>\nendobj\n`; the stream body
is `<< /Length 63 >>\nstream\n<stream>endstream`. The xref has six entries,
free entry `0000000000 65535 f ` and ten-digit computed offsets followed by
` 00000 n ` (each LF terminated). Trailer is `<< /Size 6 /Root 1 0 R >>`,
startxref is its computed byte offset, and EOF is LF terminated. No metadata,
attachments, compressed streams, personal information or external links exist. Keep
notices and disclose modifications. Never publish secrets, auth snapshots,
local-access files, logs, customer fixtures or source history from originals.

Deploy frontend from frontend/ using Node22, npm ci, npm run build and Next
framework on Vercel; retain packages/contracts build input via repository root.
Server-only API_BASE_URL must point at Rancher HTTPS API ingress, not localhost
or GrowthCast. API and worker use backend/Dockerfile built at repository root;
deployment/rancher/compose.yml requires reviewed digest and managed secret file.
Fresh dedicated DB initializes backend/schema.sql once, not historical replay.
Exact environment names: docs/environment-names.txt and docs/rancher-configuration.md.
No provider keys means no model integration; missing-key UI is not a live model
success. Disable optional live integrations unless separately approved.

Local bootstrap is documented in docs/local-run.md. For second synthetic user,
pass LOCAL_TEST_EMAIL=rancher-denial@mike.local to the guarded script and redirect
to ignored mode600 validation/local-denial-access.json. No password is printed
in evidence. Production bootstrap needs approved administrator identity and
Rancher-owned auth credentials; do not run the development bootstrap remotely.
