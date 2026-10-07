#!/usr/bin/env bash
# One-time install of the auto-update timer on the VPS. Idempotent.
#
# After this, `git push` to main is the whole deploy: GitHub Actions publishes
# images, and the timer pulls and restarts within ~5 minutes.
#
# Run as root on the VPS, from a checkout of this repo:
#   ssh root@us 'bash -s' < deploy/install-vps-timer.sh
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="${SCS_DIR:-/opt/scs}"
REPO="${SCS_REPO:-https://github.com/gjf7/silicon-civilization-stock-trade-us.git}"

log() { printf '[install] %s\n' "$*"; }

mkdir -p "$DIR"
install -m 755 "$SRC_DIR/vps-update.sh" /usr/local/bin/scs-update.sh
install -m 644 "$SRC_DIR/scs-update.service" /etc/systemd/system/scs-update.service
install -m 644 "$SRC_DIR/scs-update.timer" /etc/systemd/system/scs-update.timer

# The compose file and env file stay in $DIR. Refresh compose from the repo if
# this script was run from a checkout that has it.
if [[ -f "$SRC_DIR/docker-compose.yml" ]]; then
  install -m 644 "$SRC_DIR/docker-compose.yml" "$DIR/docker-compose.yml"
fi

if [[ ! -f "$DIR/web.env" ]]; then
  log "WARNING: $DIR/web.env is missing; copy deploy/web.env.example and set DEEPSEEK_API_KEY"
fi

systemctl daemon-reload
systemctl enable --now scs-update.timer
log "timer enabled"
systemctl list-timers scs-update.timer --no-pager || true
