# VPS Deployment (Docker + Caddy, automatic HTTPS)

This deploys all five containers — MongoDB, Redis, the API server, the client (Nginx static + internal reverse proxy), and Caddy (public TLS termination) — via `docker-compose.yml`. Caddy automatically obtains and renews a Let's Encrypt certificate for your domain; no manual certbot steps required.

## Prerequisites

- A VPS (Ubuntu/Debian assumed) with a public IP
- A domain or subdomain with an **A record pointing at that IP** (e.g. `quiz.example.com → 203.0.113.10`) — DNS must already be propagated before Caddy requests a cert, or it will fail to issue one
- Ports `80` and `443` open and not in use by anything else on the VPS (no other web server bound to them)

## 1. Install Docker on the VPS

```bash
ssh youruser@your-vps-ip

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker   # or log out/in so the group change takes effect

docker --version
docker compose version
```

## 2. Open the firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 3. Get the code onto the VPS

From your **local machine** (not the VPS), since this project isn't pushed to a git remote yet:

```bash
rsync -avz --exclude node_modules --exclude dist --exclude .git \
  /home/krutik/Desktop/Quiz_Platform/ youruser@your-vps-ip:~/tribastion/
```

(If you'd rather use git: push this repo to GitHub/GitLab first, then `git clone` it on the VPS instead.)

## 4. Set the production domain in the Caddyfile

On the VPS:

```bash
cd ~/tribastion
nano Caddyfile
```

Replace `your-domain.com` with your real domain, e.g.:

```
quiz.example.com {
  reverse_proxy client:80
  encode gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
  }
}
```

## 5. Configure production secrets

```bash
cp apps/server/.env.example apps/server/.env
nano apps/server/.env
```

Set at minimum:

```bash
NODE_ENV=production
CORS_ORIGIN=https://quiz.example.com
CLIENT_URL=https://quiz.example.com
```

Generate four **distinct** secrets and paste one into each of `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SOCKET_JOIN_TOKEN_SECRET`, `COOKIE_SECRET`:

```bash
openssl rand -base64 48
```

`MONGO_URI` and `REDIS_URL` in this file are overridden by `docker-compose.yml` to point at the `mongo`/`redis` containers automatically — you don't need to edit them.

## 6. Build and start everything

```bash
docker compose up --build -d
docker compose ps        # all five services should show "running"/"healthy"
docker compose logs -f   # watch startup; Ctrl+C to stop tailing (containers keep running)
```

First boot needs to: build two multi-stage images (server, client), pull `mongo`, `redis`, `caddy` images, and have Caddy request a Let's Encrypt certificate — expect a minute or two.

## 7. Seed the admin account

**Edit the seed script first** — `apps/server/src/scripts/seed.ts` has a hardcoded demo password (`TribastionAdmin!23`) documented in this project's chat history, so treat it as compromised. Either change `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` before building, or seed once and immediately change the password after first login (Admin Portal → change password) and enable MFA.

```bash
docker compose exec server node dist/scripts/seed.js
```

This creates the Super Admin account and (optionally) dummy demo data — re-running it is safe, it skips anything that already exists.

## 8. Verify

```bash
curl -I https://quiz.example.com/health   # expect HTTP/2 200
```

Then visit `https://quiz.example.com/login` in a browser and sign in.

## Updating after code changes

```bash
cd ~/tribastion
# rsync new changes from local, or git pull
docker compose up --build -d
```

Compose only rebuilds images whose inputs changed, so this is safe to run repeatedly.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Caddy logs show cert issuance errors | DNS A record isn't pointing at this VPS yet, or port 80/443 is blocked/in use by another process |
| Login succeeds but a refresh shows you logged out | `CLIENT_URL`/`CORS_ORIGIN` don't exactly match the HTTPS domain you're visiting |
| `docker compose ps` shows `server` unhealthy/restarting | `docker compose logs server` — almost always a missing/invalid value in `apps/server/.env` |
| Uploaded media 404s after a redeploy | The `server-uploads` named volume persists across `up --build`, but not across `docker compose down -v` (which deletes volumes) — never use `-v` in production |
