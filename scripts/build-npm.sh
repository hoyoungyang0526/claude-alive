#!/bin/bash
# Build the single npm package (claude-alive)
# Bundles CLI + server + core + hooks into self-contained files.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/npm-dist"

echo "[1/5] Building all packages..."
pnpm build

echo "[2/5] Cleaning npm-dist..."
rm -rf "$OUT"
mkdir -p "$OUT/dist" "$OUT/scripts" "$OUT/ui"

echo "[3/5] Bundling CLI..."
npx esbuild "$ROOT/npm/cli-entry.ts" \
  --bundle --platform=node --format=esm \
  --target=node20 --outfile="$OUT/dist/cli.mjs" \
  --external:ws

echo "[4/5] Bundling server..."
npx esbuild "$ROOT/npm/server-entry.ts" \
  --bundle --platform=node --format=esm \
  --target=node20 --outfile="$OUT/dist/server.mjs" \
  --external:ws

echo "[5/5] Copying assets..."
cp "$ROOT/packages/hooks/scripts/stream-event.sh" "$OUT/scripts/"
# Copy UI dist but exclude proprietary Live2D models
rsync -a --exclude='live2d/' "$ROOT/packages/ui/dist/" "$OUT/ui/"
cp "$ROOT/LICENSE" "$OUT/"
cp "$ROOT/README.md" "$OUT/"

# Create package.json for npm
cat > "$OUT/package.json" << 'PKGJSON'
{
  "name": "claude-alive",
  "version": "0.1.0",
  "description": "Real-time animated UI for Claude Code sessions, powered by hooks",
  "license": "MIT",
  "type": "module",
  "bin": {
    "claude-alive": "./dist/cli.mjs"
  },
  "files": [
    "dist/",
    "scripts/",
    "ui/",
    "LICENSE",
    "README.md"
  ],
  "dependencies": {
    "ws": "^8"
  },
  "engines": {
    "node": ">=20"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/hoyoungyang0526/claude-alive.git"
  },
  "homepage": "https://github.com/hoyoungyang0526/claude-alive",
  "keywords": [
    "claude",
    "claude-code",
    "agent",
    "monitoring",
    "dashboard",
    "live2d",
    "hooks",
    "realtime",
    "websocket"
  ]
}
PKGJSON

chmod +x "$OUT/dist/cli.mjs"

echo ""
echo "Done! Package ready at: $OUT"
echo "To publish: cd npm-dist && npm publish"
