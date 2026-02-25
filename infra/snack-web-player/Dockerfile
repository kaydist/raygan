FROM node:22-alpine AS builder

RUN apk add --no-cache git python3 make g++ sed

WORKDIR /app
RUN git clone --depth 1 https://github.com/expo/snack.git .

# Install from monorepo root so workspace packages (snack-content, etc.) are linked
RUN yarn install --frozen-lockfile

# Build workspace packages so their build/ directories exist
RUN for dir in packages/*/; do \
      if [ -f "$dir/package.json" ]; then \
        echo "Building $dir..." && \
        (cd "$dir" && yarn build 2>/dev/null || npm run build 2>/dev/null || true); \
      fi; \
    done

WORKDIR /app/runtime

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

# Install expo locally, then re-link workspace packages that npm may have shadowed
RUN npm install --no-save expo && \
    for dir in /app/packages/*/; do \
      if [ -f "$dir/package.json" ]; then \
        pkgname=$(node -p "require('${dir}package.json').name" 2>/dev/null || true); \
        if [ -n "$pkgname" ] && [ "$pkgname" != "undefined" ]; then \
          rm -rf "node_modules/$pkgname" 2>/dev/null; \
          ln -sf "$dir" "node_modules/$pkgname"; \
          echo "Linked $pkgname"; \
        fi; \
      fi; \
    done

RUN npx expo export --platform web

FROM nginx:alpine
COPY --from=builder /app/runtime/dist /usr/share/nginx/html/_snack
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
