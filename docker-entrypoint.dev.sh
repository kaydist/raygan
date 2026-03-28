#!/bin/sh
set -e

# Node.js TLS 1.3 is broken in Docker Desktop for Mac.
# wget (system TLS) works fine, Node.js (OpenSSL) doesn't.
# Set global Node.js option and configure pnpm to use HTTP.
export NODE_OPTIONS="--dns-result-order=ipv4first --tls-max-v1.2"

# Install pnpm if not available
if ! command -v pnpm > /dev/null 2>&1; then
  echo "Installing pnpm via wget..."
  PNPM_VERSION="9.15.0"
  mkdir -p /usr/local/lib/node_modules/pnpm
  wget -qO- "https://registry.npmjs.org/pnpm/-/pnpm-${PNPM_VERSION}.tgz" \
    | tar -xz -C /usr/local/lib/node_modules/pnpm --strip-components=1
  ln -sf /usr/local/lib/node_modules/pnpm/bin/pnpm.cjs /usr/local/bin/pnpm
  ln -sf /usr/local/lib/node_modules/pnpm/bin/pnpx.cjs /usr/local/bin/pnpx
  chmod +x /usr/local/bin/pnpm /usr/local/bin/pnpx
  echo "pnpm ${PNPM_VERSION} installed"
fi

# Configure pnpm/npm to use HTTP registry (bypasses Node.js TLS issue)
npm config set registry http://registry.npmjs.org/
pnpm config set registry http://registry.npmjs.org/ 2>/dev/null || true

# Install dependencies if node_modules is empty
if [ ! -d "/app/node_modules/.pnpm" ]; then
  echo "Installing project dependencies..."
  cd /app && pnpm install --frozen-lockfile
fi

# Install eas-cli if not present
if ! command -v eas > /dev/null 2>&1; then
  echo "Installing eas-cli..."
  npm install -g eas-cli@latest || echo "Warning: Failed to install eas-cli. Build features unavailable."
fi

# Reset registry to HTTPS for the app runtime (non-critical, just a preference)
npm config set registry https://registry.npmjs.org/ 2>/dev/null || true

exec "$@"
