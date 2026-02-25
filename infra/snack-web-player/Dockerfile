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
ENV NODE_PATH=/app/node_modules
RUN EXPO_CLI=$(find /app -path "*/expo/bin/cli" -not -path "*/.cache/*" -type f | head -1) && \
    echo "Found expo CLI at: $EXPO_CLI" && \
    node "$EXPO_CLI" export --platform web

FROM nginx:alpine
COPY --from=builder /app/runtime/dist /usr/share/nginx/html/_snack
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
