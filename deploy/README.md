# One-time setup on the VPS (run as root). Idempotent: safe to re-run.

## What this does
# Installs Docker and adds a swap file, then leaves the app to `deploy.sh`,
# which is run from your machine. Nothing here exposes a public port.

## Why swap
# The host has ~1 GB RAM and an unrelated proxy already uses most of it. The
# compose file caps both containers, but swap keeps a brief startup spike from
# killing the proxy via the OOM killer.

## 1. Docker (skip if `docker compose version` already works)
# curl -fsSL https://get.docker.com | sh

## 2. Add swap if the host has less than 1 GB
#   fallocate -l 1G /swapfile2
#   chmod 600 /swapfile2
#   mkswap /swapfile2
#   swapon /swapfile2
#   grep -q '/swapfile2' /etc/fstab || echo '/swapfile2 none swap sw 0 0' >> /etc/fstab

## 3. Directory for the app's compose files
#   mkdir -p /opt/scs

## 4. Expose the app on the tailnet only (run after the first deploy)
#   tailscale serve --bg --https 443 http://127.0.0.1:3000
#   tailscale serve status
#
# This is Serve, not Funnel. Serve is reachable only by devices in your
# tailnet; Funnel would publish it to the public internet. Do not enable Funnel.

## Notes
# - The app is reached at https://<host>.<tailnet>.ts.net/ once Serve is set up.
# - DeepSeek requests leave the host through whatever egress it already uses.
#   On this VPS that path is a proxy; if model calls time out, check it.
