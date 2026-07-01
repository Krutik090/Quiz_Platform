#!/usr/bin/env bash
# Run this LOCALLY (not on the VPS). Builds the two app images one at a time —
# never in parallel — and exports them to a single tar for transfer, so the
# VPS never has to run npm install / tsc / vite build itself.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building server image (1/2)..."
docker compose build server

echo "==> Building client image (2/2)..."
docker compose build client

echo "==> Saving images to tribastion-images.tar..."
docker save tribastion-server:latest tribastion-client:latest -o tribastion-images.tar

echo
echo "==> Done: $(du -h tribastion-images.tar | cut -f1) tribastion-images.tar"
echo "Transfer it (and the rest of the repo, if you haven't already) to the VPS:"
echo
echo "    rsync -avz --progress tribastion-images.tar docker-compose.yml Caddyfile nginx apps/server/.env \\"
echo "      youruser@your-vps-ip:~/tribastion/"
echo
echo "Then on the VPS: ./scripts/deploy-load.sh"
