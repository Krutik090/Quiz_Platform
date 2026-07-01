# VPS Deployment (Docker + Caddy, automatic HTTPS)

This deploys five containers — MongoDB, Redis, the API server, the client (Nginx static + internal reverse proxy), and Caddy (public TLS termination) — via `docker-compose.yml`. Caddy automatically obtains and renews a Let's Encrypt certificate for your domain; no manual certbot steps required.

## Low-memory VPS (≤1GB RAM): build locally, ship images, never build on the VPS

`docker compose up --build` runs `npm install`, `tsc`, and a Vite/Rollup production bundle for two separate images — on a 1GB box that alone can exhaust RAM and trigger the kernel OOM killer, which doesn't discriminate between your build process and, say, `sshd`. If your VPS has ≤1-2GB RAM, **do not build on it**. Instead:

1. Build the two app images **locally** (one at a time, never in parallel) with `scripts/deploy-build.sh`.
2. Ship the resulting tar to the VPS.
3. **Load** (not build) them there with `scripts/deploy-load.sh`, which also pulls the small official `mongo`/`redis`/`caddy` images one at a time.

No `npm install`, `tsc`, or bundling ever runs on the VPS with this flow.

### Add swap first, regardless

Even at *runtime* (not building), Mongo + Redis + Node + Nginx + Caddy + the OS on a bare 1GB box with **no swap** is fragile — the OOM killer will keep silently killing containers under any memory pressure spike. Add a 2GB swap file before anything else; it costs nothing but disk and turns hard crashes into graceful slowdowns:

```bash
ssh youruser@your-vps-ip
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # confirm swap shows up
```

The compose file also caps each container's memory (`mem_limit`) and Mongo's internal cache (`--wiredTigerCacheSizeGB 0.25`), so one runaway container can't starve the others out.

## Prerequisites

- A VPS (Ubuntu/Debian assumed) with a public IP
- A domain or subdomain with an **A record pointing at that IP** — DNS must already be propagated before Caddy requests a cert, or it will fail to issue one
- Ports `80` and `443` open and not in use by anything else on the VPS
- Docker installed on **both** your local machine and the VPS, and both on the same CPU architecture (`uname -m` — almost always `x86_64` on budget VPS providers; check before transferring images, since an image built for `amd64` won't load/run on an `arm64` VPS)

## 1. Install Docker on the VPS

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version && docker compose version
```

## 2. Open the firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 3. Get the code onto the VPS

From your **local machine**:

```bash
rsync -avz --exclude node_modules --exclude dist --exclude .git \
  /home/krutik/Desktop/Quiz_Platform/ youruser@your-vps-ip:~/tribastion/
```

## 4. Set the production domain in the Caddyfile and secrets in `.env`

Both files travel with the rsync above, so edit them either locally before transferring or directly on the VPS — `Caddyfile` should already have your real domain, and `apps/server/.env` should already have `NODE_ENV=production`, real `JWT_*`/`COOKIE_SECRET` values, and `CORS_ORIGIN`/`CLIENT_URL` set to your `https://` domain. (If you're re-reading this later: `apps/server/.env.example` is the template if you need to regenerate it.)

## 5. Build locally and transfer the images

On your **local machine**:

```bash
cd /home/krutik/Desktop/Quiz_Platform
./scripts/deploy-build.sh
```

This builds `server` then `client` sequentially and writes `tribastion-images.tar`. Then transfer it:

```bash
rsync -avz --progress tribastion-images.tar youruser@your-vps-ip:~/tribastion/
```

## 6. Load and start on the VPS

```bash
ssh youruser@your-vps-ip
cd ~/tribastion
./scripts/deploy-load.sh
docker compose ps        # all five services should show "running"/"healthy"
docker compose logs -f   # watch startup; Ctrl+C to stop tailing (containers keep running)
```

This only loads pre-built images and pulls the three small upstream images (one at a time) — no compilation happens here.

## 7. Seed the admin account

**Change the seed script's hardcoded demo password first** — `apps/server/src/scripts/seed.ts`'s `TribastionAdmin!23` is documented in this project's chat history, so treat it as public. Edit `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` locally and re-run `./scripts/deploy-build.sh` + transfer + `deploy-load.sh` before seeding, or seed once and immediately change the password after first login (Admin Portal → change password) and enable MFA.

```bash
docker compose exec server node dist/scripts/seed.js
```

Re-running it is safe — it skips anything that already exists.

## 8. Verify

```bash
curl -I https://quiz.example.com/health   # expect HTTP/2 200
```

Then visit `https://quiz.example.com/login` in a browser and sign in.

## Updating after code changes

Always from your **local machine** — never `--build` on the VPS:

```bash
./scripts/deploy-build.sh
rsync -avz --progress tribastion-images.tar youruser@your-vps-ip:~/tribastion/
ssh youruser@your-vps-ip 'cd ~/tribastion && ./scripts/deploy-load.sh'
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| VPS becomes unresponsive/SSH drops during deploy | You ran `docker compose up --build` directly on the VPS, or skipped the swap file step — use the local-build-then-load flow above instead |
| Caddy logs show cert issuance errors | DNS A record isn't pointing at this VPS yet, or port 80/443 is blocked/in use by another process |
| Login succeeds but a refresh shows you logged out | `CLIENT_URL`/`CORS_ORIGIN` don't exactly match the HTTPS domain you're visiting |
| `docker compose ps` shows `server` unhealthy/restarting | `docker compose logs server` — check `apps/server/.env`, or that `mem_limit: 300m` isn't too tight for your workload (raise it in `docker-compose.yml` if you have headroom) |
| `docker load` fails / containers won't start after loading | Architecture mismatch between local machine and VPS (`uname -m` on both) — image must be rebuilt on a matching-architecture machine |
| Uploaded media 404s after a redeploy | The `server-uploads` named volume persists across reloads, but not across `docker compose down -v` (which deletes volumes) — never use `-v` in production |
