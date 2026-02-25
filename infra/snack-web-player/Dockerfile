FROM node:22-alpine AS builder

RUN apk add --no-cache git python3 make g++ sed

WORKDIR /app
RUN git clone --depth 1 https://github.com/expo/snack.git .

# Install from monorepo root so workspace packages (snack-content, etc.) are linked
RUN yarn install --frozen-lockfile

WORKDIR /app/runtime

# Patch the origin allowlist to allow all origins.
# The web player checks postMessage origins against a hardcoded list
# that only includes localhost and Expo's own domains.
# Self-hosting means we control access via our own domain/CORS instead.
RUN TRANSPORT_FILE="src/transports/RuntimeTransportImplWebPlayer.ts" && \
    if [ -f "$TRANSPORT_FILE" ]; then \
      sed -i 's/return allowedOrigins\.includes(origin)/return true \|\| allowedOrigins.includes(origin)/' "$TRANSPORT_FILE" && \
      echo "Patched origin allowlist in $TRANSPORT_FILE"; \
    else \
      echo "WARNING: Transport file not found at $TRANSPORT_FILE"; \
      find /app/runtime/src -name "*.ts" -exec grep -l "allowedOrigins" {} \; || true; \
    fi

ENV EXPO_PUBLIC_SNACK_ENV=production

RUN node -e " \
  const {execFileSync} = require('child_process'); \
  const paths = [ \
    '/app/node_modules/expo/bin/cli', \
    '/app/node_modules/expo/bin/cli.js', \
    '/app/runtime/node_modules/expo/bin/cli', \
    '/app/runtime/node_modules/expo/bin/cli.js', \
  ]; \
  const fs = require('fs'); \
  let cli = paths.find(p => fs.existsSync(p)); \
  if (!cli) { \
    try { cli = require.resolve('expo/bin/cli'); } catch(e) {} \
  } \
  if (!cli) { \
    console.log('Searching for expo CLI...'); \
    const {execSync} = require('child_process'); \
    const found = execSync('find /app -name \"cli.js\" -path \"*/expo/bin/*\" -not -path \"*/.cache/*\" 2>/dev/null || true').toString().trim().split('\\n')[0]; \
    if (found) cli = found; \
  } \
  if (!cli) { throw new Error('Could not find expo CLI anywhere'); } \
  console.log('Using expo CLI at:', cli); \
  execFileSync('node', [cli, 'export', '--platform', 'web'], {stdio: 'inherit', cwd: '/app/runtime'}); \
"

FROM nginx:alpine
COPY --from=builder /app/runtime/dist /usr/share/nginx/html/_snack
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
