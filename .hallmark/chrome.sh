#!/usr/bin/env bash
# Hallmark's render tier launches Chrome through puppeteer-core without --no-sandbox;
# this host (Ubuntu with AppArmor user-namespace limits) needs it for a non-snap Chromium.
exec "$HOME/.cache/ms-playwright/chromium-1228/chrome-linux/chrome" --no-sandbox "$@"
