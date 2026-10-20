#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node -e "const [major,minor]=process.versions.node.split('.').map(Number); if (major < 20 || (major === 20 && minor < 9)) throw new Error('Node.js 20.9+ required')"
npm ci --ignore-scripts --no-audit --no-fund
npm ci --prefix supabase/tests --ignore-scripts --no-audit --no-fund
