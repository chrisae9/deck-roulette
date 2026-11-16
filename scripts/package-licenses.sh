#!/bin/sh
set -eu

sdk=node_modules/@decky/api
# Decky CLI includes dist/ in the store ZIP.
output=dist/licenses
staging=$(mktemp -d)
trap 'rm -rf "$staging"' EXIT

mkdir -p "$staging/decky-api" "$staging/scripts" "$output"
cp -R src "$staging/"
cp scripts/package-licenses.sh "$staging/scripts/"
cp LICENSE THIRD_PARTY_NOTICES.md package.json plugin.json pnpm-lock.yaml \
  rollup.config.js tsconfig.json "$staging/"
cp -R "$sdk/src" "$staging/decky-api/"
cp "$sdk/LICENSE" "$sdk/package.json" "$staging/decky-api/"

cp THIRD_PARTY_NOTICES.md "$output/"
cp "$sdk/LICENSE" "$output/decky-api-LICENSE.txt"
cp node_modules/react-icons/LICENSE "$output/react-icons-LICENSE.txt"
tar -czf "$output/frontend-source.tar.gz" -C "$staging" .
