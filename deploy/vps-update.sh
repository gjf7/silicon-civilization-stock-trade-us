#!/usr/bin/env bash
# Pull the newest published images and restart the stack.
#
# Runs on the VPS (invoked by scs-update.timer). The host never builds
# anything: GitHub Actions builds and publishes the images, this script only
# pulls the tag for the current commit on main.
#
# Idempotent. A pull or health-check failure leaves the running version alone
# and does not advance the recorded commit, so the next tick retries.
set -euo pipefail

DIR="${SCS_DIR:-/opt/scs}"
REPO="${SCS_REPO:-https://github.com/gjf7/silicon-civilization-stock-trade-us.git}"
REGISTRY="${SCS_REGISTRY:-ghcr.io/gjf7/silicon-civilization-stock-trade-us}"
WEB_PORT="${SCS_WEB_PORT:-3000}"
PYSERVER_PORT="${SCS_PYSERVER_PORT:-8001}"
STATE="$DIR/deployed-sha"

log() { printf '[scs-update] %s\n' "$*"; }

cd "$DIR"

target="$(git ls-remote "$REPO" refs/heads/main | awk '{print $1}')"
[[ -n "$target" ]] || { log "could not read main from $REPO"; exit 1; }

current="$(cat "$STATE" 2>/dev/null || true)"
if [[ "$target" == "$current" ]]; then
  log "already on ${target:0:7}; nothing to do"
  exit 0
fi
log "new commit ${target:0:7} (running ${current:0:7})"

web_image="$REGISTRY-web:$target"
py_image="$REGISTRY-pyserver:$target"

if ! docker pull -q "$web_image" || ! docker pull -q "$py_image"; then
  log "images for ${target:0:7} are not published yet; will retry"
  exit 0
fi

# Remember the currently running pair so a bad release can be rolled back.
cur_web="$(docker inspect -f '{{.Config.Image}}' scs-web-1 2>/dev/null || true)"
cur_py="$(docker inspect -f '{{.Config.Image}}' scs-pyserver-1 2>/dev/null || true)"
if [[ -n "$cur_web" && -n "$cur_py" ]]; then
  printf 'SCS_WEB_IMAGE=%s SCS_PYSERVER_IMAGE=%s ' "$cur_web" "$cur_py" > "$DIR/.previous-images"
fi

export SCS_WEB_IMAGE="$web_image" SCS_PYSERVER_IMAGE="$py_image"
export SCS_WEB_PORT="$WEB_PORT" SCS_PYSERVER_PORT="$PYSERVER_PORT"
docker compose up -d

healthy=0
for _ in $(seq 1 40); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$WEB_PORT/" || true)"
  if [[ "$code" == "200" ]]; then healthy=1; break; fi
  sleep 3
done

if [[ "$healthy" != "1" ]]; then
  log "new version failed its health check; rolling back"
  if [[ -f "$DIR/.previous-images" ]]; then
    # shellcheck disable=SC1091
    source "$DIR/.previous-images"
    SCS_WEB_IMAGE="$SCS_WEB_IMAGE" SCS_PYSERVER_IMAGE="$SCS_PYSERVER_IMAGE" \
      SCS_WEB_PORT="$WEB_PORT" SCS_PYSERVER_PORT="$PYSERVER_PORT" docker compose up -d || true
  fi
  log "rollback attempted; leaving $STATE at ${current:0:7}"
  exit 1
fi

printf '%s\n' "$target" > "$STATE"
log "now running ${target:0:7}"
