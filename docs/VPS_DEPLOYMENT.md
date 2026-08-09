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

1. Create an `A` record for `wiw.kineticapp.online` pointing to `62.171.131.33`. DNS must resolve before Certbot requests the HTTPS certificate.
2. In **Supabase Dashboard → Authentication → URL Configuration**, set the Site URL to `https://wiw.kineticapp.online` and add that same URL to Redirect URLs.
3. Before inviting real users, re-enable email confirmation and configure a custom SMTP provider in Supabase. The built-in email service is rate-limited and is suitable only for development.

## One-time VPS bootstrap

The VPS must have Docker Engine, the Docker Compose plugin, host-level Nginx, and Certbot installed. WIW deliberately does not bind ports 80 or 443: it listens only on `127.0.0.1:8014` and the existing Nginx service proxies the domain to it.

```sh
sudo mkdir -p /opt/wiw
sudo chown "$USER" /opt/wiw
```

Copy `deploy/docker-compose.yml` to `/opt/wiw`. Create `/opt/wiw/.env` from `deploy/.env.example` and set the initial image to `ghcr.io/lerrouxlopez/wiw:latest`. If the GHCR package is private, run `docker login ghcr.io` with a GitHub token that has `read:packages`.

```sh
cd /opt/wiw
docker compose pull
docker compose up -d
docker compose ps
```

## One-time Nginx and HTTPS setup

Copy `deploy/nginx/wiw.kineticapp.online.conf` to `/etc/nginx/sites-available/wiw`, then enable only this new site and validate Nginx before reloading it:

```sh
sudo ln -s /etc/nginx/sites-available/wiw /etc/nginx/sites-enabled/wiw
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d wiw.kineticapp.online
```

Certbot adds the TLS configuration to WIW's new site. It does not replace the existing Nginx sites or certificates.

## Routine deployment

Each push to `master` runs tests and lint, builds a versioned image, publishes it to GHCR, and tells the VPS to pull that exact image. Production deployment only runs after publishing succeeds.

## Rollback

Find the prior image tag in the GitHub Actions run history. On the VPS, replace `WIW_IMAGE` in `/opt/wiw/.env` with that tag, then run:

```sh
cd /opt/wiw
docker compose pull
docker compose up -d --remove-orphans
```

Verify the site, authentication, a read-only data view, and Nginx's HTTPS certificate after every deployment or rollback.
