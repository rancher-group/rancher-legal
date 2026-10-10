# Rancher Legal production runbook (GrowthCast parity)

Same topology as GrowthCast Legal (`deployment/growthcast/` in the mike-legal
fork): Vercel serves the Next.js frontend, one EC2 host runs the backend
container plus Caddy (TLS), Supabase hosts auth and Postgres, and Amazon S3
holds documents. No other infrastructure.

| Piece | Value |
|---|---|
| Frontend | `https://legal.gorancher.com` (Vercel, team `team_4NSjoEQTjKjZAJXMvzv0uOkT`, project root `frontend/`) |
| Backend API | `https://legal-api.gorancher.com` (EC2 + Caddy, `deployment/rancher/`) |
| AWS | account `433673700794`, profile `rancher-org-admin`, region `us-east-1` |
| Supabase | dedicated project `rancher-legal-production`, ref `mqefsytfajogiiaqffkj`, org `cxypzfgtzdmdzfckikio` (Rancher Group). Never touch the homepage project `bpagmaqvzgwbqkmdgjeg` or GrowthCast projects |
| Source (AGPL) | `https://github.com/rancher-group/rancher-legal` (public) |

Placeholders are in `<ANGLE_BRACKETS>`. Never paste secret values into
tickets, commits or shell history; use `read -s` or a password manager.

```bash
export AWS_PROFILE=rancher-org-admin AWS_REGION=us-east-1
aws sts get-caller-identity --query Account --output text   # must print 433673700794
```

## 0. Publish the source first

The footer link "Source & build instructions" points at
`github.com/rancher-group/rancher-legal/tree/<commit>`. Push the commit you
deploy to `main` before deploying, so the link resolves:

```bash
cd rancher-legal
git push origin deploy/parity:main
export RELEASE_SHA=$(git rev-parse HEAD)
```

## 1. Supabase (auth and Postgres)

Created 2026-10-10 through the Management API (`POST /v1/projects`,
`organization_slug=cxypzfgtzdmdzfckikio`, `region=us-east-1`,
`desired_instance_size=micro`). The DB password was generated locally and
written to Secrets Manager before the create call, so it never reached the
terminal:

| Item | Value |
|---|---|
| Project | `rancher-legal-production`, ref `mqefsytfajogiiaqffkj` (Postgres 17) |
| URL | `https://mqefsytfajogiiaqffkj.supabase.co` |
| Secret | `rancher/legal/production/supabase`: `SUPABASE_URL`, `SUPABASE_PROJECT_REF`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_PASSWORD` |

The keys are the new-style `sb_publishable_...` and `sb_secret_...` keys
(`GET /v1/projects/<ref>/api-keys?reveal=true`), not the legacy anon and
service-role JWTs. The backend only passes them to supabase-js and never
verifies JWTs with them, so both work; the boot check below confirms it.

### Schema

This is a fresh database, so apply `backend/schema.sql` only. It already
contains every file in `backend/migrations/`, including the last one,
`20260929_01_harden_browser_roles.sql`. (`supabase/` holds only local-stack
config, `config.toml` and `gateway.conf`; it has no migrations.)

`db.<ref>.supabase.co` resolves to IPv6 only. Without IPv6, use the session
pooler (`aws-0-us-east-1.pooler.supabase.com:5432`, user
`postgres.<ref>`) or the Management API query endpoint. Production was
applied through the API in a single transaction:

```bash
{ echo 'begin;'; cat backend/schema.sql; echo 'commit;'; } | jq -Rs '{query:.}' \
  | curl -sS -X POST "https://api.supabase.com/v1/projects/<PROJECT_REF>/database/query" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" --data-binary @-
```

The psql equivalent:

```bash
export SUPABASE_DB_URL='postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres'
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f backend/schema.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "grant usage on schema public to service_role;
  grant all privileges on all tables in schema public to service_role;
  grant all privileges on all sequences in schema public to service_role;
  notify pgrst, 'reload schema';"
psql "$SUPABASE_DB_URL" -tAc "select to_regclass('public.user_profiles')"   # user_profiles
psql "$SUPABASE_DB_URL" -tAc "select public.document_lifecycle_version()"     # must be >= 2
```

The backend refuses to boot unless `document_lifecycle_version()` returns at
least `REQUIRED_LIFECYCLE_VERSION` (2, `backend/src/lib/dbq/lifecycleGuard.ts`).
Production (2026-10-10): schema and grants applied, 62 public tables,
lifecycle version 2, also reachable through PostgREST with the secret key.

Note `20260929_01_harden_browser_roles.sql` as the last applied migration. Later
upgrades apply newer `backend/migrations/*.sql` files in filename order
(see `docs/deployment.md`).

### Auth settings (private, owner-only registration)

The app already refuses signup (`POST /auth/signup` returns 403 and `/signup`
redirects to `/login`). Close the same door in Supabase so nobody can register
through GoTrue directly or through Google:

```bash
curl -sS -X PATCH "https://api.supabase.com/v1/projects/<PROJECT_REF>/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://legal.gorancher.com",
    "uri_allow_list": "https://legal.gorancher.com/**",
    "disable_signup": true,
    "external_email_enabled": true,
    "external_google_enabled": false,
    "external_anonymous_users_enabled": false,
    "mailer_autoconfirm": false,
    "mailer_secure_email_change_enabled": true,
    "password_min_length": 10,
    "smtp_host": "smtp.gmail.com",
    "smtp_port": "587",
    "smtp_user": "ewhite@gorancher.com",
    "smtp_pass": "<GOOGLE_SMTP_APP_PASSWORD>",
    "smtp_admin_email": "legal@gorancher.com",
    "smtp_sender_name": "Rancher Legal"
  }'
```

Applied 2026-10-10 without any `smtp_*` field. The owner enters the Google app
password after launch, and the Management API refuses host, user, admin email or
sender name without `smtp_pass` ("Custom SMTP required ... Missing SMTP_PASS
fields"), so all SMTP fields go in together. `uri_allow_list`
uses `/**`, the same pattern as GrowthCast. A direct GoTrue `POST /auth/v1/signup` returns 422
`signup_disabled`. Until SMTP is set, Supabase's built-in mailer is
rate-limited and only for testing, so set SMTP before inviting users:

```bash
SMTP_PASS=$(security find-generic-password -s rancher -a GOOGLE_SMTP_APP_PASSWORD -w)
jq -n --arg p "$SMTP_PASS" '{smtp_host:"smtp.gmail.com",smtp_port:"587",smtp_user:"ewhite@gorancher.com",
  smtp_pass:$p,smtp_admin_email:"legal@gorancher.com",smtp_sender_name:"Rancher Legal"}' \
 | curl -sS -X PATCH "https://api.supabase.com/v1/projects/mqefsytfajogiiaqffkj/config/auth" \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d @- >/dev/null
```

Email: the backend sends no mail of its own. Supabase Auth sends password-reset
and email-change mail through the SMTP settings above
(`docs/deployment.md`, "Authentication email"). GrowthCast Legal uses Gmail SMTP
(`smtp.gmail.com:587`, a Workspace user with an app password); Rancher does the
same with `ewhite@gorancher.com`, sending as `legal@gorancher.com` (which must
be a verified "send mail as" alias or group address on that account). Add
that provider's SPF/DKIM records in Cloudflare (step 4) before sending.

### Owner/admin bootstrap

Signup is closed, so create the owner account with the service-role key:

```bash
curl -sS -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"<OWNER_EMAIL>","password":"<TEMP_PASSWORD>","email_confirm":true,
       "user_metadata":{"display_name":"<OWNER_NAME>","organisation":"Rancher"}}'
psql "$SUPABASE_DB_URL" -tAc "select user_id,email from public.user_profiles"   # trigger made the profile
```

Done 2026-10-10: owner `ewhite@gorancher.com` (user
`ec453b38-0f70-4c0b-b816-d2aa54c99635`), created with `email_confirm: true`
and `user_metadata.organisation = "Rancher"` (no display name; set it in
Settings). No email was sent. The temporary password is in the laptop Keychain
under `rancher`/`LEGAL_OWNER_TEMP_PASSWORD`. Change it at first sign-in, then
delete that Keychain item. The `on_auth_user_created` trigger created the profile.

### Models (OpenRouter)

Every AI call goes through OpenRouter with the deployment key
`OPENROUTER_API_KEY` (`backend.env`). Mike has **no deployment-wide default
model**: `DEFAULT_*_MODEL` in `backend/src/lib/llm/models.ts` is unused. Each
user's chat model comes from the request, the chat, or
`user_profiles.last_selected_chat_model`. Title and tabular models come from
`user_profiles.title_model` and `tabular_model` (a router chat model is reused
for titles when unset), and the memory curator uses the chat model. An
`openrouter/<vendor>/<model>` id runs only if that user saved it in
`user_router_models` (Settings > Bring Your Own Keys > Routers). This gate stops
users from running arbitrary models on the operator key.
`MIKE_MODEL_CONFIG_JSON` is left unset. It only declares generic
`openai-compatible` endpoints (no reasoning support, no default field), and the
native `openrouter/` adapter is the better path.

| Tier (old Gemini default) | OpenRouter id used |
|---|---|
| Main chat (`gemini-3-flash-preview`) | `openrouter/google/gemini-3.7-flash` |
| Tabular (`gemini-3-flash-preview`) | `openrouter/google/gemini-3.7-flash` |
| Title (`gemini-3.5-flash-lite`) | `openrouter/google/gemini-3.5-flash-lite` |

Both ids were in OpenRouter's live catalog with tool calling on 2026-10-10.
`gemini-3.7-flash` is the newest flash model in Mike's own catalog. The owner was
seeded on 2026-10-10. Seed each later user the same way, or let them pick the
models in Settings:

```sql
insert into public.user_router_models (user_id, router, model_id, sort_order) values
  ('<USER_ID>','openrouter','google/gemini-3.7-flash',0),
  ('<USER_ID>','openrouter','google/gemini-3.5-flash-lite',1) on conflict do nothing;
update public.user_profiles set last_selected_chat_model='openrouter/google/gemini-3.7-flash',
  tabular_model='openrouter/google/gemini-3.7-flash',
  title_model='openrouter/google/gemini-3.5-flash-lite' where user_id='<USER_ID>';
```

The owner then signs in at `https://legal.gorancher.com/login`, changes the
password in Settings, and creates the Rancher organization in the app (the
creator becomes its admin). Add each later user the same way (admin-API user,
then "Forgot password" to set their own password, which also tests SMTP), then
invite them to the organization from the app.

## 2. Object storage (Amazon S3, same as GrowthCast)

GrowthCast stores documents in Amazon S3 through the S3-compatible `R2_*`
settings, with `R2_REGION` set to the bucket region (commit 670632c8). The
backend authenticates with a static access key pair (`R2_ACCESS_KEY_ID` /
`R2_SECRET_ACCESS_KEY`), not an instance role.

```bash
BUCKET=rancher-legal-documents-433673700794
aws s3api create-bucket --bucket $BUCKET
aws s3api put-public-access-block --bucket $BUCKET --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-ownership-controls --bucket $BUCKET \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
aws s3api put-bucket-encryption --bucket $BUCKET --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
# Browsers upload straight to presigned URLs, so allow the frontend origin.
aws s3api put-bucket-cors --bucket $BUCKET --cors-configuration '{"CORSRules":[{
  "AllowedOrigins":["https://legal.gorancher.com"],"AllowedMethods":["PUT","HEAD"],
  "AllowedHeaders":["Content-Type","x-amz-*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]}'

aws iam create-user --user-name rancher-legal-storage
aws iam put-user-policy --user-name rancher-legal-storage --policy-name bucket-access \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[
    {\"Effect\":\"Allow\",\"Action\":[\"s3:ListBucket\"],\"Resource\":\"arn:aws:s3:::$BUCKET\"},
    {\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\",\"s3:DeleteObject\",\"s3:AbortMultipartUpload\"],
     \"Resource\":\"arn:aws:s3:::$BUCKET/*\"}]}"
# Send the key straight to Secrets Manager so it never reaches the terminal.
aws iam create-access-key --user-name rancher-legal-storage --output json \
  | jq -c '{R2_ACCESS_KEY_ID:.AccessKey.AccessKeyId,R2_SECRET_ACCESS_KEY:.AccessKey.SecretAccessKey}' \
  | aws secretsmanager create-secret --name rancher/legal/production/storage --secret-string file:///dev/stdin
```

The bucket has no versioning, the same as GrowthCast. Generate the five
`generated` secrets in "Backend environment" once and keep them in
`rancher/legal/production/backend` (JSON, one key per name).

## 3. EC2 backend host

GrowthCast runs one EC2 host in us-east-1 with an Elastic IP; its hostname was
`mike-legal-api.<EIP>.nip.io`. The repository does not record the instance
type, AMI or security group. With the GrowthCast AWS profile signed in, copy
them read-only:
`aws ec2 describe-instances --filters Name=ip-address,Values=18.210.39.226 --query 'Reservations[].Instances[].[InstanceType,ImageId,SecurityGroups,IamInstanceProfile,BlockDeviceMappings]'`.
Until then, use the defaults below. The image runs LibreOffice and the
in-process worker, and the host builds the image itself.

```bash
VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
SG=$(aws ec2 create-security-group --group-name rancher-legal-api \
  --description "Rancher Legal API (Caddy 80/443)" --vpc-id $VPC --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $SG --ip-permissions \
  'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]' \
  'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}]' \
  'IpProtocol=udp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}]'
# Shell access goes through SSM Session Manager, so port 22 stays closed.
aws iam create-role --role-name rancher-legal-host --assume-role-policy-document \
  '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name rancher-legal-host \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam create-instance-profile --instance-profile-name rancher-legal-host
aws iam add-role-to-instance-profile --instance-profile-name rancher-legal-host --role-name rancher-legal-host
sleep 15   # the new instance profile takes a few seconds to become usable by EC2

AMI=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text)
cat > /tmp/rancher-legal-user-data.sh <<'EOF'
#!/bin/bash
set -eux
dnf install -y docker git
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL https://github.com/docker/compose/releases/download/v2.39.4/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
# AL2023 ships buildx 0.12; compose 2.39 needs buildx 0.17 or later to build.
curl -fsSL https://github.com/docker/buildx/releases/download/v0.28.0/buildx-v0.28.0.linux-amd64 \
  -o /usr/local/lib/docker/cli-plugins/docker-buildx
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/lib/docker/cli-plugins/docker-buildx
systemctl enable --now docker
install -d -m 700 -o root -g root /opt/rancher-legal
git clone https://github.com/rancher-group/rancher-legal.git /opt/rancher-legal/src
EOF
INSTANCE=$(aws ec2 run-instances --image-id $AMI --instance-type t3.large \
  --security-group-ids $SG --iam-instance-profile Name=rancher-legal-host \
  --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=40,VolumeType=gp3,Encrypted=true}' \
  --metadata-options HttpTokens=required \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=rancher-legal-api},{Key=Project,Value=rancher-legal},{Key=Environment,Value=production}]' \
  --user-data file:///tmp/rancher-legal-user-data.sh --query 'Instances[0].InstanceId' --output text)
aws ec2 wait instance-running --instance-ids $INSTANCE
ALLOC=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
aws ec2 associate-address --instance-id $INSTANCE --allocation-id $ALLOC
EIP=$(aws ec2 describe-addresses --allocation-ids $ALLOC --query 'Addresses[0].PublicIp' --output text)
```

Provisioned 2026-10-10: instance `i-06dc7a2ddecb6caaf`, EIP `3.232.188.50`
(`eipalloc-0c4e4fd703fece274`), security group `sg-0ab611a6dc983fd48`, role and
instance profile `rancher-legal-host`. The backend image for `44849da` is
already built on the host.

## 4. Cloudflare DNS

Create the API record before starting Caddy, so the ACME HTTP challenge
reaches the host. Leave it DNS-only (grey cloud), as Caddy terminates TLS:

```bash
curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/<GORANCHER_ZONE_ID>/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  -d "{\"type\":\"A\",\"name\":\"legal-api\",\"content\":\"$EIP\",\"ttl\":300,\"proxied\":false}"
```

`legal.gorancher.com` gets the CNAME Vercel asks for in step 6
(normally `cname.vercel-dns.com`, DNS-only). Add the SMTP provider's
SPF/DKIM/DMARC records for the sender domain as well.

## 5. Start the backend

```bash
aws ssm start-session --target $INSTANCE
sudo -i
cd /opt/rancher-legal/src && git fetch && git checkout <RELEASE_SHA>
# backend.env: see "Composing backend.env" below
cd deployment/rancher
GIT_SHA=$(git rev-parse HEAD) docker compose up -d --build
docker compose ps                          # backend healthy, caddy up
GIT_SHA=$(git rev-parse HEAD) docker compose run --rm backend npm run sync:workflows
curl -fsS https://legal-api.gorancher.com/health
```

Before DNS exists, start only the backend and check it from inside the host:
`docker compose up -d --no-deps --no-build backend`, then
`docker compose exec -T backend node -e "fetch('http://127.0.0.1:3001/health').then(r=>console.log(r.status))"`.
Done 2026-10-10 with image `rancher/legal-backend:44849daa...`: healthy,
`/health` 200, lifecycle gate passed. DNS `legal-api.gorancher.com` A
`3.232.188.50` (DNS-only) exists. Caddy is not started yet, and
`npm run sync:workflows` has not run. Both are next:
`docker compose up -d --no-build`, then the `sync:workflows` and `/health`
lines above.

### Composing backend.env

The host composes `/opt/rancher-legal/backend.env` itself from the three
secrets, so no secret value appears in SSM command parameters, SSM history or
command output:

1. Attach a temporary inline policy `temp-read-legal-secrets` to role
   `rancher-legal-host` that allows `secretsmanager:GetSecretValue` on exactly
   the ARNs of `rancher/legal/production/{supabase,storage,backend}`.
2. Use `AWS-RunShellScript` to run a script that fetches the three secrets with
   the instance role, writes the static rows from the table below plus the
   secret keys to a mode-600 root temp file with Python, and renames it to
   `backend.env`. It prints only key names.
3. Delete the inline policy (`aws iam delete-role-policy --role-name
   rancher-legal-host --policy-name temp-read-legal-secrets`). The host keeps
   no standing access to Secrets Manager.

Repeat the same steps after rotating a secret, then recreate the backend
container (`docker compose up -d --no-deps --no-build --force-recreate backend`).
`OPENROUTER_API_KEY` is stored in `rancher/legal/production/backend` with the
generated secrets. Done 2026-10-10: the file is complete (23 keys, including
`OPENROUTER_API_KEY`), and the recreated backend is healthy. A test call from
inside the container to `google/gemini-3.5-flash-lite` through OpenRouter
returned 200, and Mike's `providerForModel` maps both seeded ids to
`openrouter`.

To release a new version, check out the new commit and run the same
`docker compose up -d --build`. To roll back, check out the previous commit
and run it again.

## 6. Vercel frontend

```bash
cd rancher-legal/frontend
vercel link --scope team_4NSjoEQTjKjZAJXMvzv0uOkT --project rancher-legal --yes
printf '%s' 'https://legal-api.gorancher.com' | vercel env add API_BASE_URL production
printf '%s' 'true' | vercel env add NEXT_PUBLIC_SENTRY_DISABLED production
printf '%s' 'true' | vercel env add SENTRY_DISABLED production
vercel deploy --prod --build-env NEXT_PUBLIC_GIT_SHA=$RELEASE_SHA --env GIT_SHA=$RELEASE_SHA
vercel domains add legal.gorancher.com
```

In the project settings, set Root Directory to `frontend` and leave "Include
files outside the Root Directory" on, because the build reads
`../packages/contracts`. Use Node 22. If the project is connected to the
GitHub repo, `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` provides the source-link
commit automatically.

## 7. Smoke test

1. `curl -fsS https://legal-api.gorancher.com/health` returns 200.
2. `https://legal.gorancher.com/signup` redirects to `/login`, and
   `curl -X POST https://legal.gorancher.com/api/auth/signup` returns 403 `signup_disabled`.
3. The owner signs in, uploads a DOCX, sees the PDF rendition, and downloads it.
4. "Forgot password" for a second admin-created user delivers mail from the Rancher sender.
5. The footer "Source & build instructions" link opens `rancher-group/rancher-legal/tree/<RELEASE_SHA>`.
6. A chat reply streams, and a title is generated (OpenRouter key works).

## Backend environment (`/opt/rancher-legal/backend.env`)

S = secret. Only the names are listed here.

| Name | Source | Value / note |
|---|---|---|
| `NODE_ENV` | URL/config | `production` (also baked into the image) |
| `PORT` | config | `3001` |
| `FRONTEND_URL` | URL/origin | `https://legal.gorancher.com` |
| `API_PUBLIC_URL` | URL | `https://legal.gorancher.com/api` (the public gateway, not the API host) |
| `ALLOWED_ORIGINS` | CORS | `https://legal.gorancher.com` |
| `SUPABASE_URL` | Supabase | `https://<PROJECT_REF>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase | anon key (server-side only) |
| `SUPABASE_SECRET_KEY` | Supabase, S | service-role key |
| `R2_ENDPOINT_URL` | storage | `https://s3.us-east-1.amazonaws.com` |
| `R2_PUBLIC_ENDPOINT_URL` | storage | same as `R2_ENDPOINT_URL` |
| `R2_REGION` | storage | `us-east-1` |
| `R2_BUCKET_NAME` | storage | `rancher-legal-documents-433673700794` |
| `R2_ACCESS_KEY_ID` | storage, S | IAM user `rancher-legal-storage` |
| `R2_SECRET_ACCESS_KEY` | storage, S | IAM user `rancher-legal-storage` |
| `OPENROUTER_API_KEY` | LLM, S (`rancher/legal/production/backend`) | Rancher OpenRouter key ($50 limit). All model calls route through it (see "Models (OpenRouter)") |
| `DOWNLOAD_SIGNING_SECRET` | generated, S | `openssl rand -hex 32` (required) |
| `USER_API_KEYS_ENCRYPTION_SECRET` | generated, S | `openssl rand -hex 32` |
| `MCP_CONNECTORS_ENCRYPTION_SECRET` | generated, S | `openssl rand -hex 32` |
| `SPOTLIGHT_NONCE_SECRET` | generated, S | `openssl rand -hex 32` |
| `MANIFEST_SIGNING_KEY` | generated, S | `openssl rand -hex 32` (signs export manifests) |
| `SENTRY_DISABLED` | config | `true` (otherwise errors go to upstream Mike's Sentry) |
| `MIKE_WORKFLOWS_REPOSITORY` | config | `Open-Legal-Products/mike-workflows` |
| `MIKE_WORKFLOWS_REF` | config | `main`, or pin a 40-character commit SHA |

Leave unset unless the feature is enabled: `GEMINI_API_KEY`/`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`
(direct providers; Rancher uses OpenRouter only), `MIKE_MODEL_CONFIG_JSON`, `WORD_ADDIN_URL` plus `AUTH_HANDOFF_ENCRYPTION_SECRET`
(Word add-in), `GOOGLE_*_OAUTH_*`, `SLACK_MCP_OAUTH_*`, `SSO_ENABLED`,
`COURTLISTENER_API_TOKEN`, `REDIS_URL` (the Postgres queue is used without it).
Never enable `LOG_RAW_LLM_STREAM` or `RAW_LLM_STREAM_LOG_DIR` in production.

## Vercel environment (production)

| Name | Kind | Value |
|---|---|---|
| `API_BASE_URL` | URL (server-side) | `https://legal-api.gorancher.com` |
| `NEXT_PUBLIC_GIT_SHA` | build | release commit (or rely on `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`) |
| `GIT_SHA` | build/runtime | release commit |
| `NEXT_PUBLIC_SENTRY_DISABLED` | build | `true` |
| `SENTRY_DISABLED` | runtime | `true` |

The frontend holds no Supabase, storage or LLM secrets. Browsers call only the
same-origin `/api` gateway.
