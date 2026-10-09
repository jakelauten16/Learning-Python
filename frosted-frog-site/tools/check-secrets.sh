#!/bin/sh
# Refuses to let a Stripe key reach the repository.
#
# Install it as a git hook, from the repository root:
#   cp frosted-frog-site/tools/check-secrets.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Then a commit carrying a key is stopped before it is made. Git hooks are not
# themselves versioned, so each clone installs it once.

if git diff --cached --name-only -z | xargs -0 grep -nE '(sk|rk|pk)_(test|live)_[A-Za-z0-9]{8,}' 2>/dev/null; then
  echo ""
  echo "A Stripe key appears in the lines above. Commit refused."
  echo "Keys belong in the Cloudflare dashboard, never in a file."
  echo "If this key has been committed or shared anywhere, roll it:"
  echo "  https://dashboard.stripe.com/apikeys"
  exit 1
fi
exit 0
