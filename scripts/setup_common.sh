#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 0 ]; then
  printf 'Usage: %s (configure Node and npm through PATH)\n' "$0" >&2
  exit 2
fi

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"
command -v node >/dev/null || { printf 'Node.js 22.13+ is required.\n' >&2; exit 1; }
command -v npm >/dev/null || { printf 'npm is required.\n' >&2; exit 1; }
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
const required = JSON.parse(readFileSync('package.json', 'utf8')).engines.node;
const minimum = required.match(/^>=(\d+)\.(\d+)\.(\d+)$/);
if (!minimum) throw new Error(`Unsupported Node requirement: ${required}`);
const actual = process.versions.node.split('.').map(Number);
const expected = minimum.slice(1).map(Number);
let supported = true;
for (let index = 0; index < 3; index++) {
  if (actual[index] !== expected[index]) {
    supported = actual[index] > expected[index];
    break;
  }
}
if (!supported) throw new Error(`Node ${required} required; found ${process.versions.node}`);
JS

npm ci --no-audit --no-fund
npm run check
