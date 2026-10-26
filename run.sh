#!/usr/bin/env bash
# One command to run the app (the product name lives in brand.config.json).
#
#   ./run.sh                     install (first time), build, serve on http://localhost:4173
#                                (landing page at /, the app at /app/)
#   ./run.sh fake-camera [clip]  same, plus Chromium with a synthetic-face fake camera
#                                (clip: friend = "Sam" only, street = Sam, a stranger, Sam)
#   ./run.sh test                unit tests + end-to-end tests (Chromium, fake camera)
#   ./run.sh screens             every screen, light and dark, phone and desktop (docs/shots/)
#   ./run.sh record              the app walkthrough, the landing scroll and the 60-second try videos (docs/shots/)
#   ./run.sh accuracy            match distances on the synthetic faces (eval/accuracy-synthetic.json)
#
# The camera only works on a secure origin; http://localhost counts as secure.
# PORT=5000 ./run.sh to use another port (the tests always use 4173).
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-4173}"
URL="http://localhost:${PORT}"
NAME="$(sed -n 's/.*"name": *"\([^"]*\)".*/\1/p' brand.config.json | head -1)"

say() { printf '\033[1;33m[%s]\033[0m %s\n' "$NAME" "$*"; }
die() { printf '\033[1;31m[%s]\033[0m %s\n' "$NAME" "$*" >&2; exit 1; }

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
  say "Building (type check, Vite build, external-request check)…"
  npm run --silent build >/dev/null
}

ensure_clips() {
  if [ ! -f demo/fake-camera/friend.y4m ] || [ ! -f demo/fake-camera/street.y4m ]; then
    say "Making fake-camera clips from the synthetic sample faces…"
    bash scripts/make-fake-camera.sh
  fi
}

ensure_browser() {
  npx playwright install chromium >/dev/null
}

to_mp4() {
  # $1 = webm path; writes the .mp4 beside it when ffmpeg is installed.
  if command -v ffmpeg >/dev/null && [ -f "$1" ]; then
    ffmpeg -loglevel error -y -i "$1" -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart "${1%.webm}.mp4"
  fi
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
    say "Landing page: ${URL}/   The app: ${URL}/app/   (Ctrl+C to stop)"
    say "Served with the production headers (strict CSP). On a phone, use an HTTPS tunnel: the camera needs a secure page."
    PORT="$PORT" exec node scripts/serve-dist.mjs
    ;;

  fake-camera)
    CLIP="${2:-friend}"
    [ "$CLIP" = friend ] || [ "$CLIP" = street ] || die "Unknown clip '$CLIP' (use friend or street)"
    install_deps
    build_app
    ensure_clips
    CHROME=$(find_chromium)
    [ -n "$CHROME" ] || die "No Chromium found. Run: npx playwright install chromium"
    [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ] || say "No display found. On a headless machine use: xvfb-run -s '-screen 0 1280x1000x24' ./run.sh fake-camera ${CLIP}  (or ./run.sh record)"
    PORT="$PORT" node scripts/serve-dist.mjs >/dev/null 2>&1 &
    SERVER=$!
    trap 'kill $SERVER 2>/dev/null || true' EXIT
    for _ in $(seq 1 40); do curl -sf "$URL/" >/dev/null && break; sleep 0.25; done
    say "Opening Chromium with the '${CLIP}' fake camera (an AI-generated face, not a real person)."
    EXTRA=()
    # Ubuntu 23.10+ blocks the Chromium sandbox for browsers outside a snap or package (AppArmor).
    if [ "$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns 2>/dev/null || echo 0)" = 1 ] || [ "$(id -u)" = 0 ]; then
      EXTRA+=(--no-sandbox --test-type)
    fi
    say "The browser profile lives in .demo-profile/ so people you add survive a restart; delete that folder to start fresh."
    "$CHROME" \
      --user-data-dir="$PWD/.demo-profile" \
      --use-fake-device-for-media-stream \
      --use-fake-ui-for-media-stream \
      --use-file-for-fake-video-capture="$PWD/demo/fake-camera/${CLIP}.y4m" \
      --autoplay-policy=no-user-gesture-required \
      --no-first-run --no-default-browser-check --disable-background-networking --disable-sync \
      --window-size=430,932 \
      "${EXTRA[@]}" \
      --app="$URL/app/" || true
    ;;

  test)
    install_deps
    ensure_clips
    ensure_browser
    npx vitest run
    build_app
    npx playwright test --project=e2e
    ;;

  screens)
    install_deps
    ensure_clips
    ensure_browser
    build_app
    npx playwright test --project=screens
    node scripts/contact-sheet.mjs
    say "Done: docs/shots/<phone|desktop>-<light|dark>/ and docs/shots/contact-sheet-*.png"
    ;;

  record)
    install_deps
    ensure_clips
    ensure_browser
    build_app
    say "Recording the app walkthrough, the landing scroll and the 60-second try, headless (about 4 minutes)…"
    npx playwright test --project=record
    to_mp4 docs/shots/walkthrough.webm
    to_mp4 docs/shots/landing-scroll.webm
    to_mp4 docs/shots/try-60-seconds.webm
    say "Done: docs/shots/walkthrough, landing-scroll and try-60-seconds (.webm and .mp4), stills in docs/shots/walkthrough/"
    ;;

  accuracy)
    install_deps
    ensure_browser
    build_app
    npx playwright test --project=accuracy
    ;;

  *)
    sed -n '2,13p' "$0"
    exit 1
    ;;
esac
