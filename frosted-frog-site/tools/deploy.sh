#!/bin/sh
# Deploys the site and its functions to Cloudflare Pages.
#
#   sh tools/deploy.sh            deploy for real
#   sh tools/deploy.sh --check    check everything is ready, touch nothing
#
# Drag and drop cannot do this job: it uploads files but never compiles the
# functions folder, so the checkout endpoint would 404. Wrangler bundles the
# functions and uploads the site in one step.
#
# Run it from the frosted-frog-site folder, on your own computer. It needs a
# browser available for the Cloudflare login the first time.

set -eu

PROJECT="super-dust-23bf"
CHECK_ONLY="${1:-}"

cd "$(dirname "$0")/.."
SITE="$(pwd)"

say() { printf '\n%s\n' "$1"; }
fail() { printf '\n%s\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- checks ----
say "Checking the folder..."
[ -f index.html ] || fail "No index.html here. Run this from inside frosted-frog-site."
[ -d functions/api ] || fail "No functions/api folder. The checkout would 404 without it."
for f in functions/api/checkout.js functions/api/stripe-webhook.js functions/api/session.js functions/api/health.js; do
  [ -f "$f" ] || fail "Missing $f"
done
printf '  site folder:      %s\n' "$SITE"
printf '  functions found:  %s\n' "$(find functions -name '*.js' | wc -l | tr -d ' ') files"

if command -v wrangler >/dev/null 2>&1; then
  WRANGLER="wrangler"
else
  say "Wrangler is not installed. Using npx, which fetches it on the fly."
  WRANGLER="npx --yes wrangler@latest"
fi
printf '  wrangler:         %s\n' "$($WRANGLER --version 2>/dev/null | tail -1)"

# The site only calls the checkout endpoint when it is set to take cards.
if grep -q 'paymentMode: "stripe"' assets/js/data.js; then
  printf '  payment mode:     stripe, cards on\n'
else
  printf '  payment mode:     deposit, orders come by email\n'
  say "Note: assets/js/data.js still says paymentMode: \"deposit\", so the site
will not call Stripe yet. The functions still deploy and can be tested
directly. Change that line to \"stripe\" and run this again when you are ready."
fi

if [ "$CHECK_ONLY" = "--check" ]; then
  say "Check passed. Nothing was uploaded."
  exit 0
fi

# ----------------------------------------------------------------- login ----
say "Checking your Cloudflare login..."
if $WRANGLER whoami >/dev/null 2>&1; then
  $WRANGLER whoami 2>/dev/null | grep -i "associated with the email" || true
else
  say "Not logged in. A browser window will open. Sign in to Cloudflare and
approve the access request, then come back here."
  $WRANGLER login
fi

# --------------------------------------------------------------- secrets ----
# wrangler reads these from the terminal without echoing them, so the values
# never appear on screen, in this script, or in your shell history.
say "Now the two Stripe secrets. Wrangler will ask for each value and will not
show it as you type or paste. Nothing is written to a file."

printf '\n--- 1 of 2: STRIPE_SECRET_KEY ---\n'
printf 'Have ready: your restricted key from Stripe, starting rk_test_ or rk_live_\n'
printf 'Get it at https://dashboard.stripe.com/apikeys (Create restricted key,\n'
printf 'with Checkout Sessions: Write and Payment Intents: Read).\n'
printf 'Paste it at the prompt below, then press Enter.\n\n'
$WRANGLER pages secret put STRIPE_SECRET_KEY --project-name "$PROJECT"

printf '\n--- 2 of 2: STRIPE_WEBHOOK_SECRET ---\n'
printf 'Have ready: the signing secret from your Stripe webhook, starting whsec_\n'
printf 'If you have not created the webhook yet, press Ctrl+C now, create it\n'
printf 'first (the URL is printed at the end of this script), then run this again.\n'
printf 'Paste it at the prompt below, then press Enter.\n\n'
$WRANGLER pages secret put STRIPE_WEBHOOK_SECRET --project-name "$PROJECT"

# ---------------------------------------------------------------- deploy ----
say "Uploading the site and compiling the functions..."
$WRANGLER pages deploy . \
  --project-name "$PROJECT" \
  --branch main \
  --commit-dirty true \
  --commit-message "The Frosted Frog, deployed from tools/deploy.sh"

# ------------------------------------------------------------------ check ---
URL="https://${PROJECT}.pages.dev"
say "Checking the functions answer on the live site..."
sleep 5
HEALTH="$(curl -fsS "${URL}/api/health" || echo FAILED)"

if [ "$HEALTH" = "FAILED" ]; then
  say "The health check did not answer. Give it a minute and try:
  curl ${URL}/api/health
If it still fails, the functions did not compile. Check the deployment log at
https://dash.cloudflare.com -> Workers and Pages -> ${PROJECT} -> Deployments."
  exit 1
fi

printf '  %s\n' "$HEALTH"

say "Done. The site and its functions are live at ${URL}

Add this webhook in Stripe (Developers -> Webhooks -> Add endpoint):

  URL:    ${URL}/api/stripe-webhook
  Events: checkout.session.completed
          checkout.session.async_payment_succeeded
          checkout.session.async_payment_failed

Once you have its signing secret, run this script again to paste it in.
Use the live-mode webhook secret for live keys; a test one will not validate."
