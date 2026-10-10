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
| Supabase | new dedicated project `rancher-legal` (do not reuse homepage or GrowthCast projects) |
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

```bash
supabase login
supabase projects create rancher-legal --org-id <SUPABASE_ORG_ID> \
  --region us-east-1 --db-password "$(openssl rand -base64 32)"   # store the password
supabase projects api-keys --project-ref <PROJECT_REF>
```

Record `SUPABASE_URL=https://<PROJECT_REF>.supabase.co`, the anon/publishable
key (`SUPABASE_PUBLISHABLE_KEY`) and the service-role key
(`SUPABASE_SECRET_KEY`).

### Schema

This is a fresh database, so apply `backend/schema.sql` only. It already
contains every file in `backend/migrations/`, including the last one,
`20260929_01_harden_browser_roles.sql`. (`supabase/` holds only local-stack
config, `config.toml` and `gateway.conf`; it has no migrations.)

```bash
export SUPABASE_DB_URL='postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres'
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f backend/schema.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "grant usage on schema public to service_role;
  grant all privileges on all tables in schema public to service_role;
  grant all privileges on all sequences in schema public to service_role;
  notify pgrst, 'reload schema';"
psql "$SUPABASE_DB_URL" -tAc "select to_regclass('public.user_profiles')"   # user_profiles
```

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
    "uri_allow_list": "https://legal.gorancher.com/auth/callback",
    "disable_signup": true,
    "external_email_enabled": true,
    "external_google_enabled": false,
    "mailer_autoconfirm": false,
    "mailer_secure_email_change_enabled": true,
    "password_min_length": 10,
    "smtp_host": "<SMTP_HOST>",
    "smtp_port": "<SMTP_PORT>",
    "smtp_user": "<SMTP_USER>",
    "smtp_pass": "<SMTP_PASS>",
    "smtp_admin_email": "legal@gorancher.com",
    "smtp_sender_name": "Rancher Legal"
  }'
```

Email: the backend sends no mail of its own. Supabase Auth sends password-reset
and email-change mail through the SMTP settings above
(`docs/deployment.md`, "Authentication email"). Use the same SMTP provider as
GrowthCast Legal, with a new Rancher sender identity on `gorancher.com`. Add
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
aws iam create-access-key --user-name rancher-legal-storage   # -> R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
```

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

AMI=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text)
cat > /tmp/rancher-legal-user-data.sh <<'EOF'
#!/bin/bash
set -eux
dnf install -y docker git
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL https://github.com/docker/compose/releases/download/v2.39.4/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
systemctl enable --now docker
git clone https://github.com/rancher-group/rancher-legal.git /opt/rancher-legal/src
install -d -m 700 /opt/rancher-legal
EOF
INSTANCE=$(aws ec2 run-instances --image-id $AMI --instance-type t3.large \
  --security-group-ids $SG --iam-instance-profile Name=rancher-legal-host \
  --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=40,VolumeType=gp3,Encrypted=true}' \
  --metadata-options HttpTokens=required \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=rancher-legal-api}]' \
  --user-data file:///tmp/rancher-legal-user-data.sh --query 'Instances[0].InstanceId' --output text)
aws ec2 wait instance-running --instance-ids $INSTANCE
ALLOC=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
aws ec2 associate-address --instance-id $INSTANCE --allocation-id $ALLOC
EIP=$(aws ec2 describe-addresses --allocation-ids $ALLOC --query 'Addresses[0].PublicIp' --output text)
```

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
install -m 600 /dev/null /opt/rancher-legal/backend.env
vi /opt/rancher-legal/backend.env          # names in "Backend environment" below
cd deployment/rancher
GIT_SHA=$(git rev-parse HEAD) docker compose up -d --build
docker compose ps                          # backend healthy, caddy up
GIT_SHA=$(git rev-parse HEAD) docker compose run --rm backend npm run sync:workflows
curl -fsS https://legal-api.gorancher.com/health
```

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
6. A chat reply streams, and a title is generated (Gemini key works).

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
| `GEMINI_API_KEY` | LLM, S | new Rancher key. The default main, title and tabular models are Gemini (`backend/src/lib/llm/models.ts`) |
| `DOWNLOAD_SIGNING_SECRET` | generated, S | `openssl rand -hex 32` (required) |
| `USER_API_KEYS_ENCRYPTION_SECRET` | generated, S | `openssl rand -hex 32` |
| `MCP_CONNECTORS_ENCRYPTION_SECRET` | generated, S | `openssl rand -hex 32` |
| `SPOTLIGHT_NONCE_SECRET` | generated, S | `openssl rand -hex 32` |
| `MANIFEST_SIGNING_KEY` | generated, S | `openssl rand -hex 32` (signs export manifests) |
| `SENTRY_DISABLED` | config | `true` (otherwise errors go to upstream Mike's Sentry) |
| `MIKE_WORKFLOWS_REPOSITORY` | config | `Open-Legal-Products/mike-workflows` |
| `MIKE_WORKFLOWS_REF` | config | `main`, or pin a 40-character commit SHA |

Leave unset unless the feature is enabled: `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`
(other providers), `WORD_ADDIN_URL` plus `AUTH_HANDOFF_ENCRYPTION_SECRET`
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
