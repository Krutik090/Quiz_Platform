#!/usr/bin/env bash
# Run this ON THE VPS. Loads the pre-built images shipped by deploy-build.sh and starts
# everything — no compilation happens here. Each step runs one at a time to keep peak
# memory low on small instances.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f tribastion-images.tar ]; then
  echo "tribastion-images.tar not found in $(pwd) — transfer it from your local machine first."
  exit 1
fi

echo "==> Loading pre-built server + client images..."
docker load -i tribastion-images.tar

echo "==> Pulling mongo (1/3)..."
docker compose pull mongo

echo "==> Pulling redis (2/3)..."
docker compose pull redis

echo "==> Pulling caddy (3/3)..."
docker compose pull caddy

echo "==> Starting containers (no build)..."
docker compose up -d --no-build

echo
echo "==> Done. Check status with: docker compose ps"
echo "    Logs:                    docker compose logs -f"
