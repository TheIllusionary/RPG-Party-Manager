#!/bin/bash
# Legacy helper — generates PR text for review (does not auto-commit).
# Prefer: npm run commit:ai  →  review docs/LAST_COMMIT_MSG.txt  →  git commit -F docs/LAST_COMMIT_MSG.txt

set -euo pipefail
cd "$(dirname "$0")/.."

npm run commit:ai

echo ""
echo "Next steps:"
echo "  1. Review docs/LAST_COMMIT_MSG.txt"
echo "  2. git commit -F docs/LAST_COMMIT_MSG.txt"
echo "  3. gh pr create --body-file docs/LAST_COMMIT_MSG.txt  (optional)"
