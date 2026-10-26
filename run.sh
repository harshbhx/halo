#!/usr/bin/env bash
# Face Whisper: one command to run it.
#
#   ./run.sh                     install (first time), build, serve on http://localhost:4173
#   ./run.sh fake-camera [clip]  same, plus Chromium with a synthetic-face fake camera
#                                (clip: friend = "Sam" only, street = Sam, a stranger, Sam)
#   ./run.sh record              record the full demo walkthrough (video + screenshots in docs/shots/)
#   ./run.sh test                unit tests + end-to-end tests
#
# The camera only works on a secure origin; http://localhost counts as secure.
# PORT=5000 ./run.sh to use another port.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-4173}"
URL="http://localhost:${PORT}"

say() { printf '\033[1;36m[face-whisper]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[face-whisper]\033[0m %s\n' "$*" >&2; exit 1; }

# --- Node 20+ -------------------------------------------------------------
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [ "$(node_major)" -lt 20 ]; then
  for candidate in "$HOME/.local/node24/bin" "$HOME/.nvm/versions/node"/*/bin; do
    if [ -x "$candidate/node" ]; then export PATH="$candidate:$PATH"; fi
    [ "$(node_major)" -ge 20 ] && break
  done
fi
[ "$(node_major)" -ge 20 ] || die "Node 20 or newer is needed (found $(node -v 2>/dev/null || echo none)). Install it from https://nodejs.org"

# --- Install and build ----------------------------------------------------
install_deps() {
  if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
    say "Installing dependencies (first run only)…"
    npm ci --no-audit --no-fund
  fi
  node scripts/copy-models.mjs >/dev/null
}

build_app() {
  say "Building…"
  npx vite build --logLevel warn
}

ensure_clips() {
  if [ ! -f demo/fake-camera/friend.y4m ] || [ ! -f demo/fake-camera/street.y4m ]; then
    say "Making fake-camera clips from the synthetic sample faces…"
    bash scripts/make-fake-camera.sh
  fi
}

serve_fg() {
  say "Face Whisper is running at ${URL}  (Ctrl+C to stop)"
  say "Open it in Chrome, Edge, Firefox or Safari. On a phone, use an HTTPS tunnel (the camera needs a secure page)."
  exec npx vite preview --port "$PORT" --strictPort
}

find_chromium() {
  local pw
  pw=$(node -e "import('@playwright/test').then(m => console.log(m.chromium.executablePath())).catch(() => {})" 2>/dev/null || true)
  if [ -n "$pw" ] && [ -x "$pw" ]; then echo "$pw"; return; fi
  for b in chromium chromium-browser google-chrome google-chrome-stable; do
    if command -v "$b" >/dev/null; then command -v "$b"; return; fi
  done
}

case "${1:-start}" in
  start)
    install_deps
    build_app
    serve_fg
    ;;

  fake-camera)
    CLIP="${2:-friend}"
    [ -f "demo/fake-camera/${CLIP}.y4m" ] || [ "$CLIP" = friend ] || [ "$CLIP" = street ] || die "Unknown clip '$CLIP' (use friend or street)"
    install_deps
    build_app
    ensure_clips
    CHROME=$(find_chromium)
    [ -n "$CHROME" ] || die "No Chromium found. Run: npx playwright install chromium"
    [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ] || say "No display found. On a headless machine use: xvfb-run -s '-screen 0 1280x1000x24' ./run.sh fake-camera ${CLIP}  (or ./run.sh record)"
    npx vite preview --port "$PORT" --strictPort >/tmp/face-whisper-preview.log 2>&1 &
    SERVER=$!
    trap 'kill $SERVER 2>/dev/null || true' EXIT
    for _ in $(seq 1 40); do curl -sf "$URL" >/dev/null && break; sleep 0.25; done
    say "Opening Chromium with the '${CLIP}' fake camera (AI-generated face, not a real person)."
    EXTRA=()
    # Ubuntu 23.10+ blocks the Chromium sandbox for browsers outside a snap/package (AppArmor).
    if [ "$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns 2>/dev/null || echo 0)" = 1 ] || [ "$(id -u)" = 0 ]; then
      EXTRA+=(--no-sandbox --test-type)
    fi
    say "The browser profile lives in .demo-profile/ so people you enrol survive a restart; delete that folder to start fresh."
    "$CHROME" \
      --user-data-dir="$PWD/.demo-profile" \
      --use-fake-device-for-media-stream \
      --use-fake-ui-for-media-stream \
      --use-file-for-fake-video-capture="$PWD/demo/fake-camera/${CLIP}.y4m" \
      --autoplay-policy=no-user-gesture-required \
      --no-first-run --no-default-browser-check --disable-background-networking --disable-sync \
      --window-size=430,932 \
      "${EXTRA[@]}" \
      --app="$URL" || true
    ;;

  record)
    install_deps
    ensure_clips
    npx playwright install chromium >/dev/null
    say "Recording the demo walkthrough (headless, about 2.5 minutes)…"
    npx vite build --logLevel warn
    npx playwright test --project=record
    if command -v ffmpeg >/dev/null; then
      ffmpeg -loglevel error -y -i docs/shots/walkthrough.webm -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart docs/shots/walkthrough.mp4
    fi
    say "Done: docs/shots/walkthrough.webm (.mp4) and docs/shots/*.png"
    ;;

  test)
    install_deps
    ensure_clips
    npx playwright install chromium >/dev/null
    npx vitest run
    npx vite build --logLevel warn
    npx playwright test --project=e2e
    ;;

  *)
    sed -n '2,12p' "$0"
    exit 1
    ;;
esac
