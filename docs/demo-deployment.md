# Public demo deployment checklist

## Current status

The app has a production Compose stack and a repeatable demo seed. The laptop-hosted showcase uses Stripe test mode and an account-authenticated localhost.run HTTPS URL. It is a best-effort demo, not an uptime-guaranteed production service; the laptop and tunnel provider must remain available, and the provider may rotate free hostnames. Never work around the production guard by setting `NODE_ENV=test` or weakening environment validation.

The tunnel overlay publishes the app's TLS listener only on `127.0.0.1:18443` and adds a loopback-only HTTP proxy at `127.0.0.1:18480` for localhost.run's TLS-terminating tunnel. The proxy forwards to the app's TLS listener inside the isolated Compose network. Existing laptop services on ports 80/443 are untouched.

The tunnel is public: anyone with the URL can access the booking UI. Keep admin credentials private, use Stripe test credentials only, and do not enter real customer data.

## Laptop demo with a temporary HTTPS tunnel

Run commands from the repository root on the laptop. Install Docker Engine/Compose first. Generate a local origin certificate if one does not already exist:

```bash
mkdir -p nginx/certs
umask 077
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -days 30 -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

Create a localhost.run account and add a dedicated SSH public key to it. Keep the matching private key on the laptop; do not use the anonymous `nokey` account if you want the hostname reused between reconnects. Start the Compose services with the commands below, then start the SSH tunnel in a separate terminal and leave it running:

```bash
ssh -i ~/.ssh/barberbook-localhostrun \
  -o IdentitiesOnly=yes \
  -o ServerAliveInterval=60 \
  -o ServerAliveCountMax=3 \
  -R 80:127.0.0.1:18480 localhost.run
```

Copy the printed `https://<name>.lhr.life` URL. Create `.env.production` with restrictive permissions (`chmod 600`) and set both `FRONTEND_URL` and `BACKEND_PUBLIC_URL` to that exact URL. Use Stripe **test-mode** `sk_test_`, `pk_test_`, and webhook signing secret values only. In the Stripe Dashboard with Test mode enabled, add a webhook endpoint at `<URL>/api/v1/payments/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, and `payment_intent.canceled`; put its `whsec_` secret in `.env.production`. When editing a deployed endpoint URL, keep the same Stripe endpoint so its signing secret remains valid. Do not put payment keys in shell history, source control, README, or this document.

Apply the existing migration and demo seed, then start the isolated production project. The override binds both tunnel endpoints to loopback and does not replace or reconfigure another service:

```bash
docker compose -p barberbook-demo --env-file .env.production \
  -f docker-compose.prod.yml -f docker-compose.demo-tunnel.yml build
docker compose -p barberbook-demo --env-file .env.production \
  -f docker-compose.prod.yml -f docker-compose.demo-tunnel.yml \
  --profile ops run --rm migrations
docker compose -p barberbook-demo --env-file .env.production \
  -f docker-compose.prod.yml -f docker-compose.demo-tunnel.yml \
  run --rm backend node dist/database/seed-demo.js
docker compose -p barberbook-demo --env-file .env.production \
  -f docker-compose.prod.yml -f docker-compose.demo-tunnel.yml \
  run --rm backend node dist/database/seed-admin.js
docker compose -p barberbook-demo --env-file .env.production \
  -f docker-compose.prod.yml -f docker-compose.demo-tunnel.yml \
  up -d --wait postgres redis backend frontend nginx tunnel-proxy
curl -fsS https://<name>.lhr.life/health/ready
```

The admin account is private and should use a randomly generated password. Do not share it publicly. The tunnel process must remain running; stopping it takes the public URL offline. If its URL changes, update Stripe's test webhook endpoint and `FRONTEND_URL`/`BACKEND_PUBLIC_URL`, restart the app, and verify the new URL before updating GitHub Homepage/README.

## Environment variables

Create a secret `.env.production` on the deployment host and provide it only through that host's private shell/editor. It is gitignored.

Required by production Compose/backend:

```env
DB_NAME=<dedicated demo database name>
DB_USER=<dedicated demo database user>
DB_PASSWORD=<unique strong password, at least 12 characters>
JWT_SECRET=<unique random secret, at least 32 characters>
ADMIN_EMAIL=<private admin email>
ADMIN_PASSWORD=<unique strong password, at least 12 characters>
FRONTEND_URL=https://demo.example.com
BACKEND_PUBLIC_URL=https://demo.example.com
PAYMENT_PROVIDER=stripe
```

Production currently requires one real provider. For Stripe, also set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PUBLISHABLE_KEY`. For LiqPay, set `LIQPAY_PUBLIC_KEY` and `LIQPAY_PRIVATE_KEY`, and use sandbox mode only when configured with the provider's sandbox credentials.

For a public demo without Telegram integration, set both `TELEGRAM_MODE=disabled` and `WORKER_TELEGRAM_MODE=disabled`. If notifications are deliberately enabled, use a demo-only bot and chat; never reuse a personal/production bot token.

Recommended operational settings:

```env
BACKUP_STATUS_FILE=/var/lib/barberbook/backup-state/last-success.json
BACKUP_MAX_AGE_HOURS=24
BACKUP_RETENTION_DAYS=7
BACKUP_INTERVAL_SECONDS=86400
```

Compose supplies internal PostgreSQL and Redis connection values. Do not add database or Redis host port mappings.

## Migrations and demo seed

Use a dedicated empty demo database, not production data. Build the production image, then apply migrations:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm migrations
```

The production image compiles the existing repeatable demo seed. It creates fictional barbers/services and weekday schedules, skips existing rows by name, and does not import customer records:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backend node dist/database/seed-demo.js
```

The demo seed uses stock photo URLs. Confirm their suitability for the intended deployment or replace them with approved assets before launch.

Create the private admin account as a separate one-off operation. Use the strong `ADMIN_EMAIL` and `ADMIN_PASSWORD` values supplied through the host's secret environment:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backend node dist/database/seed-admin.js
```

The seed does not reset an existing password. If an admin account already exists, rotate credentials through an approved procedure rather than assuming this command changed them.

## Docker startup and health checks

After migrations and seed data:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -fsS https://demo.example.com/health/live
curl -fsS https://demo.example.com/health/ready
```

Production Compose exposes only Nginx on host ports 80 and 443; PostgreSQL and Redis remain on the internal Compose network. The observability profile publishes Prometheus and Alertmanager ports, so firewall or restrict those ports before enabling that profile on an internet-facing host.

## Domain and HTTPS

- Point the demo domain to the host and configure DNS before startup.
- Install valid TLS files at `nginx/certs/fullchain.pem` and `nginx/certs/privkey.pem`.
- Set both public URL variables to the canonical HTTPS origin.
- Confirm HTTP redirects to HTTPS and that the readiness endpoints pass.
- `frontend/public/og-image.webp` is the configured social preview image; it is a branded illustration, not a screenshot of the live interface.

## Admin access strategy

Do not publish `ADMIN_EMAIL`, `ADMIN_PASSWORD`, or a shared demo login in the repository, README, screenshots, or public issue tracker. The app has an admin login, but the current Nginx configuration does not add a separate access gate for admin routes. Before a public demo, either:

- restrict `/admin` and admin API access with a host-level IP allow-list or an authenticated access proxy; or
- keep admin access private and do not distribute demo credentials.

Use a unique least-privilege demo account if supported by the application roles, rotate it regularly, and remove it when the demo is retired. Do not expose the demo admin account to the public booking flow.

## Launch safety review

- Keep the demo database separate and disposable; do not copy production customer records.
- Use `PAYMENT_PROVIDER=mock` only in the isolated E2E/test environment. The current production validator blocks mock payments; no live demo payment policy is enabled by this guide.
- Keep admin/API/database/payment secrets server-side. Never put them in `VITE_*` variables or frontend assets.
- Keep PostgreSQL and Redis unexposed; firewall the host to required public ports only.
- Use Nginx and Redis-backed rate limits; review the rate limits against expected public traffic.
- Disable Telegram for a public demo unless a dedicated demo bot/chat is configured.
- Confirm stock imagery and any other third-party assets are approved for the demo.
- Run a dependency/build check and verify health endpoints after every deployment.

## Remaining before a public URL can be announced

1. Select a safe payment policy for a publicly reachable demo. The current production configuration requires Stripe or LiqPay; mock is not permitted in production mode.
2. Provision a dedicated host/domain, TLS, and isolated database/Redis resources.
3. Add an external access restriction for admin routes or keep all admin credentials private.
4. Deploy, verify health, then capture actual desktop/mobile UI screenshots from the populated demo.
