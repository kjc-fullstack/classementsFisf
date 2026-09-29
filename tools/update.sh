#!/usr/bin/env bash
# ============================================================
#  Mise a jour du site en une commande (Git Bash / Linux)
#  1. regenere assets/data/data.js depuis archives/
#  2. commit + push  -> la CI deploie automatiquement
#
#  Usage :  bash tools/update.sh
#           bash tools/update.sh "Classement du 29/10/2026"
# ============================================================
set -e
cd "$(dirname "$0")/.."

echo "=== 1/4  Generation des donnees ==="
python tools/build_data.py

echo "=== 2/4  Verification des changements ==="
git add .
if git diff --cached --quiet; then
  echo "Rien a commiter : deja a jour."
  exit 0
fi

echo "=== 3/4  Commit ==="
MSG="${1:-Mise a jour du classement}"
git commit -m "$MSG"

echo "=== 4/4  Push ==="
git push
echo
echo "Termine ! La CI GitHub Actions deploie le site automatiquement."
