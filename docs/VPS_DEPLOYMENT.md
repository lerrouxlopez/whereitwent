# WIW VPS deployment

## One-time GitHub setup

1. Push this repository to GitHub and make its GHCR package visible to the VPS: either public, or authenticate Docker on the VPS with a GitHub token that has `read:packages`.
2. In the repository **Settings → Secrets and variables → Actions**, create these repository variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Create these repository secrets:
   - `VPS_HOST` — server IP address or hostname
   - `VPS_USER` — non-root deployment user
   - `VPS_SSH_KEY` — that user's private SSH key
   - `VPS_PORT` — normally `22`
   - `VPS_DEPLOY_PATH` — for example `/opt/wiw`

The Supabase URL and publishable key are public client configuration. Do not add a Supabase secret or service-role key to GitHub or the VPS.

## One-time Supabase and DNS setup

1. Create an `A` record for `wiw.kineticapp.online` pointing to `62.171.131.33`. DNS must resolve before Caddy starts, so it can obtain the HTTPS certificate.
2. In **Supabase Dashboard → Authentication → URL Configuration**, set the Site URL to `https://wiw.kineticapp.online` and add that same URL to Redirect URLs.
3. Before inviting real users, re-enable email confirmation and configure a custom SMTP provider in Supabase. The built-in email service is rate-limited and is suitable only for development.

## One-time VPS bootstrap

The VPS must have Docker Engine and the Docker Compose plugin installed. Point the final DNS record for `WIW_DOMAIN` to the VPS before starting Caddy so it can issue HTTPS certificates.

```sh
sudo mkdir -p /opt/wiw
sudo chown "$USER" /opt/wiw
```

Copy `deploy/docker-compose.yml` and `deploy/Caddyfile` to `/opt/wiw`. Create `/opt/wiw/.env` from `deploy/.env.example`, set `WIW_DOMAIN=wiw.kineticapp.online`, and set the initial image to `ghcr.io/lerrouxlopez/wiw:latest`. If the GHCR package is private, run `docker login ghcr.io` with a GitHub token that has `read:packages`.

```sh
cd /opt/wiw
docker compose pull
docker compose up -d
docker compose ps
```

## Routine deployment

Each push to `master` runs tests and lint, builds a versioned image, publishes it to GHCR, and tells the VPS to pull that exact image. Production deployment only runs after publishing succeeds.

## Rollback

Find the prior image tag in the GitHub Actions run history. On the VPS, replace `WIW_IMAGE` in `/opt/wiw/.env` with that tag, then run:

```sh
cd /opt/wiw
docker compose pull
docker compose up -d --remove-orphans
```

Verify the site, authentication, a read-only data view, and Caddy's HTTPS certificate after every deployment or rollback.
