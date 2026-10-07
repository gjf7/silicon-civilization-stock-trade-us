#!/usr/bin/env bash
# Build the app from the current git commit and deploy it to the VPS.
#
# Runs from your machine. The VPS only pulls the finished image and starts it,
# because that host has ~1 GB RAM and an unrelated proxy already using most of
# it. The app is published through Tailscale Serve, never to the public web.
#
# Usage:
#   deploy/deploy.sh                 # deploy current HEAD
#   HOST=root@us deploy/deploy.sh    # override the SSH target
#   deploy/deploy.sh --rollback      # redeploy the previous image tags
set -euo pipefail

HOST="${HOST:-root@us}"
REMOTE_DIR="${REMOTE_DIR:-/opt/scs}"
WEB_PORT="${SCS_WEB_PORT:-3000}"
PYSERVER_PORT="${SCS_PYSERVER_PORT:-8001}"
PLATFORM="${PLATFORM:-linux/amd64}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] error: %s\n' "$*" >&2; exit 1; }

remote() { ssh -o BatchMode=yes "$HOST" "$@"; }

# --- preflight -------------------------------------------------------------
remote true || die "cannot SSH to $HOST (run: ssh $HOST true)"

if [[ ! -f "$ROOT/deploy/web.env" && "${ALLOW_MISSING_ENV:-0}" != "1" ]]; then
  die "deploy/web.env is missing; copy deploy/web.env.example and set DEEPSEEK_API_KEY"
fi

if [[ "${1:-}" == "--rollback" ]]; then
  previous="$(remote "cat $REMOTE_DIR/.previous-images 2>/dev/null" || true)"
  [[ -n "$previous" ]] || die "no previous image tags recorded on $HOST"
  log "rolling back to: $previous"
  # shellcheck disable=SC2086
  remote "cd $REMOTE_DIR && SCS_WEB_PORT=$WEB_PORT SCS_PYSERVER_PORT=$PYSERVER_PORT \
    $previous docker compose up -d"
  for _ in $(seq 1 40); do
    code="$(remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$WEB_PORT/" || true)"
    [[ "$code" == "200" ]] && break
    sleep 2
  done
  [[ "${code:-}" == "200" ]] || die "rollback did not come up healthy (web returned ${code:-none})"
  log "rollback complete"
  exit 0
fi

SHA="$(git rev-parse --short HEAD)"
if [[ -n "$(git status --porcelain)" ]]; then
  log "warning: working tree has uncommitted changes; image is built from the working tree, tagged $SHA"
fi
WEB_IMAGE="scs-web:$SHA"
PY_IMAGE="scs-pyserver:$SHA"

# --- build -----------------------------------------------------------------
log "building $WEB_IMAGE and $PY_IMAGE for $PLATFORM"
docker buildx build --platform "$PLATFORM" --load -t "$WEB_IMAGE" web/
docker buildx build --platform "$PLATFORM" --load -t "$PY_IMAGE" pyserver/

# --- ship ------------------------------------------------------------------
log "copying images to $HOST"
docker save "$WEB_IMAGE" "$PY_IMAGE" | remote 'docker load'

log "syncing deploy files to $REMOTE_DIR"
remote "mkdir -p $REMOTE_DIR"
scp -q -o BatchMode=yes \
  "$ROOT/deploy/docker-compose.yml" \
  "$ROOT/deploy/web.env.example" \
  "$HOST:$REMOTE_DIR/"

if [[ -f "$ROOT/deploy/web.env" ]]; then
  scp -q -o BatchMode=yes "$ROOT/deploy/web.env" "$HOST:$REMOTE_DIR/web.env"
fi
remote "chmod 600 $REMOTE_DIR/web.env 2>/dev/null || true"

# --- record the running tags so --rollback can return here ------------------
# Only overwrite .previous-images when both containers are actually running, so
# a failed deploy does not erase the last known-good pair.
log "recording current image tags for rollback"
remote bash -s <<REMOTE
cd "$REMOTE_DIR"
cur_web=\$(docker inspect -f '{{.Config.Image}}' scs-web-1 2>/dev/null || true)
cur_py=\$(docker inspect -f '{{.Config.Image}}' scs-pyserver-1 2>/dev/null || true)
if [ -n "\$cur_web" ] && [ -n "\$cur_py" ]; then
  printf 'SCS_WEB_IMAGE=%s SCS_PYSERVER_IMAGE=%s ' "\$cur_web" "\$cur_py" > .previous-images
  echo "[deploy] previous: \$cur_web \$cur_py"
else
  echo "[deploy] no running pair yet; nothing to record"
fi
REMOTE

# --- start -----------------------------------------------------------------
log "starting containers"
remote "cd $REMOTE_DIR && SCS_WEB_IMAGE=$WEB_IMAGE SCS_PYSERVER_IMAGE=$PY_IMAGE \
  SCS_WEB_PORT=$WEB_PORT SCS_PYSERVER_PORT=$PYSERVER_PORT docker compose up -d"

# --- verify ----------------------------------------------------------------
log "waiting for the sidecar to become healthy"
for _ in $(seq 1 30); do
  if remote "curl -fsS http://127.0.0.1:$PYSERVER_PORT/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
remote "curl -fsS http://127.0.0.1:$PYSERVER_PORT/health" >/dev/null \
  || die "sidecar health check failed; run: deploy/deploy.sh --rollback"

log "waiting for the web app"
for _ in $(seq 1 40); do
  code="$(remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$WEB_PORT/" || true)"
  [[ "$code" == "200" ]] && break
  sleep 2
done
[[ "${code:-}" == "200" ]] || die "web app returned $code; run: deploy/deploy.sh --rollback"

# The signals page exercises the whole chain: web -> pyserver -> cache.
log "checking the signals page end to end"
remote "curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:$WEB_PORT/signals" \
  | grep -q 200 || die "signals page failed; run: deploy/deploy.sh --rollback"

log "deployed $SHA"
remote "cd $REMOTE_DIR && SCS_WEB_IMAGE=$WEB_IMAGE SCS_PYSERVER_IMAGE=$PY_IMAGE \
  SCS_WEB_PORT=$WEB_PORT SCS_PYSERVER_PORT=$PYSERVER_PORT docker compose ps"

cat <<DONE

The app is running on the VPS at 127.0.0.1:$WEB_PORT, reachable only from the
host. To expose it to your tailnet (private, not the public internet):

  ssh $HOST 'tailscale serve --bg --https 443 http://127.0.0.1:$WEB_PORT'

Then open: https://$(remote 'tailscale status --json' | python3 -c "import json,sys;print(json.load(sys.stdin)['Self']['DNSName'].rstrip('.'))")
DONE
