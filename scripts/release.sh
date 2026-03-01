#!/bin/bash
# Release a new version of claude-alive to npm.
#
# Usage:
#   bash scripts/release.sh patch   # 0.2.0 → 0.2.1
#   bash scripts/release.sh minor   # 0.2.0 → 0.3.0
#   bash scripts/release.sh major   # 0.2.0 → 1.0.0
#
# What it does:
#   1. Bumps version in root package.json (single source of truth)
#   2. Builds the npm package (reads version from package.json)
#   3. Creates a git tag
#   4. Publishes to npmjs.com
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: bash scripts/release.sh [patch|minor|major]"
  exit 1
fi

# 1. Check for clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: Working tree is not clean. Commit or stash changes first."
  exit 1
fi

# 2. Bump version in root package.json
OLD_VERSION=$(node -p "require('./package.json').version")
NEW_VERSION=$(node -p "
  const [major, minor, patch] = '$OLD_VERSION'.split('.').map(Number);
  if ('$BUMP' === 'major') console.log((major+1)+'.0.0');
  else if ('$BUMP' === 'minor') console.log(major+'.'+(minor+1)+'.0');
  else console.log(major+'.'+minor+'.'+(patch+1));
" | tail -1)

echo "Releasing claude-alive: $OLD_VERSION → $NEW_VERSION ($BUMP)"
echo ""

# Update root package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# 3. Build npm package (version is read from root package.json)
echo "Building..."
bash scripts/build-npm.sh

# 4. Git commit + tag
git add package.json
git commit -m "release: v$NEW_VERSION"
git tag "v$NEW_VERSION"

# 5. Publish to npm
echo ""
echo "Publishing to npm..."
cd "$ROOT/npm-dist"
npm publish --access public

echo ""
echo "Done! claude-alive@$NEW_VERSION published."
echo ""
echo "Next steps:"
echo "  git push origin main --tags"
