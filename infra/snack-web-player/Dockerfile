FROM node:22-alpine AS builder

RUN apk add --no-cache git python3 make g++ sed

WORKDIR /app
RUN git clone --depth 1 https://github.com/expo/snack.git .

# Install root workspace packages and build them (postinstall runs turbo build)
RUN yarn install

# Bootstrap standalone packages that need special build steps
RUN yarn --cwd packages/snack-babel-standalone bootstrap || true
RUN yarn --cwd packages/snack-eslint-standalone bootstrap || true

# Install runtime dependencies (has its own yarn.lock, includes expo + local file refs)
WORKDIR /app/runtime
RUN yarn install

# Patch the origin allowlist to allow all origins.
RUN TRANSPORT_FILE="src/transports/RuntimeTransportImplWebPlayer.ts" && \
    if [ -f "$TRANSPORT_FILE" ]; then \
      sed -i 's/return allowedOrigins\.includes(origin)/return true \|\| allowedOrigins.includes(origin)/' "$TRANSPORT_FILE" && \
      echo "Patched origin allowlist in $TRANSPORT_FILE"; \
    else \
      echo "WARNING: Transport file not found at $TRANSPORT_FILE"; \
      find /app/runtime/src -name "*.ts" -exec grep -l "allowedOrigins" {} \; || true; \
    fi

ENV EXPO_PUBLIC_SNACK_ENV=production
RUN npx expo export --platform web

FROM nginx:alpine
COPY --from=builder /app/runtime/dist /usr/share/nginx/html/_snack
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
