#!/bin/bash
set -e

echo "Building self-hosted Snack web player..."
docker build -t snack-web-player:latest .

echo ""
echo "Done! Run locally with:"
echo "  docker run -p 3100:80 snack-web-player:latest"
echo ""
echo "Then set in your frontend .env:"
echo "  NEXT_PUBLIC_SNACK_WEB_PLAYER_URL=http://localhost:3100/v2/%%SDK_VERSION%%"
