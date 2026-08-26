#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/tmp/guardrails-test-repos/vault.git"
TEST_PROJECT="$(cd "$(dirname "$0")/../test-project" && pwd)"

if [ -d "$REPO_DIR" ]; then
  echo "Test repo already exists at $REPO_DIR"
  exit 0
fi

mkdir -p /tmp/guardrails-test-repos
git init --bare "$REPO_DIR"

TMP_WORK=$(mktemp -d)
git -C "$TMP_WORK" init
cp -r "$TEST_PROJECT/src" "$TMP_WORK/src"
cp -r "$TEST_PROJECT/test" "$TMP_WORK/test"
cp "$TEST_PROJECT/foundry.toml" "$TMP_WORK/foundry.toml"
cp "$TEST_PROJECT/README.md" "$TMP_WORK/README.md"
git -C "$TMP_WORK" add .
git -C "$TMP_WORK" commit -m "Initial commit"
git -C "$TMP_WORK" remote add origin "$REPO_DIR"
git -C "$TMP_WORK" push origin main
rm -rf "$TMP_WORK"

echo "Test repo initialized at $REPO_DIR"
echo "Clone URL: file://$REPO_DIR"