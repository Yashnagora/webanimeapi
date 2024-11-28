#!/bin/bash

# Skip Chromium download and use Sparticuz Chromium
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=$(node -e "console.log(require('@sparticuz/chromium').executablePath)")

# Install Node.js dependencies
npm install
