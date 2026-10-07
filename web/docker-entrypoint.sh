#!/bin/sh
# Seed the persisted data directory from the copy baked into the image.
# The named volume at /app/data starts empty, which would hide the watchlist
# shipped in the image, so copy it in on first boot.
set -e

if [ ! -f /app/data/universe.json ]; then
  mkdir -p /app/data
  cp -a /app/data-seed/. /app/data/
fi

exec "$@"
