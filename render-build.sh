#!/bin/bash

# Install Chromium dependencies
apt-get update && apt-get install -y wget ca-certificates \
  fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 \
  libcups2 libdbus-1-3 libnss3 libxcomposite1 libxrandr2 \
  xdg-utils libgbm-dev libxshmfence1

# Prevent Puppeteer from downloading Chromium
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Set Puppeteer Chromium executable path
export PUPPETEER_EXECUTABLE_PATH=$(node -e "console.log(require('@sparticuz/chromium').executablePath)")

echo "Chromium Path: $PUPPETEER_EXECUTABLE_PATH"
