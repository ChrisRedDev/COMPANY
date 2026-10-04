#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo "Zainstaluj Node.js 24 LTS z https://nodejs.org i uruchom skrypt ponownie."
  exit 1
fi
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 20 || (major === 20 && minor < 9)) { console.error("Wymagany Node.js >= 20.9. Zalecany Node.js 24 LTS."); process.exit(1); }'
npm ci
echo "Po uruchomieniu serwera otwórz http://localhost:3000 na tym komputerze."
npm run dev -- --hostname 127.0.0.1 --port 3000
