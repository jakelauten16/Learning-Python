#!/bin/sh
# Deploys the site and its API to Cloudflare Workers.
#
#   sh tools/deploy.sh            deploy for real
#   sh tools/deploy.sh --check    check everything is ready, upload nothing
#
# This project is a Worker with static assets, not a Pages project. The site
# files are served from the assets binding and src/worker.js answers /api/...
# Drag and drop cannot deploy it: there would be no Worker, so the checkout
# would 404.

set -eu

WORKER="super-dust-23bf"
CHECK_ONLY="${1:-}"

cd "$(dirname "$0")/.."

say() { printf '\n%s\n' "$1"; }
fail() { printf '\n%s\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- checks ----
say "Checking the folder..."
[ -f index.html ] || fail "No index.html here. Run this from inside frosted-frog-site."
[ -f wrangler.jsonc ] || fail "No wrangler.jsonc. The Worker config has to be here."
[ -f src/worker.js ] || fail "No src/worker.js. Without it nothing answers /api/..."
for f in functions/api/checkout.js functions/api/stripe-webhook.js functions/api/session.js functions/api/health.js; do
  [ -f "$f" ] || fail "Missing $f"
done
grep -q "\"name\": \"$WORKER\"" wrangler.jsonc || fail \
  "wrangler.jsonc does not name the Worker $WORKER. Cloudflare refuses a build when the names differ."
printf '  worker name:      %s\n' "$WORKER"

if command -v wrangler >/dev/null 2>&1; then
  WRANGLER="wrangler"
else
  say "Wrangler is not installed. Using npx, which fetches it when needed."
  WRANGLER="npx --yes wrangler@latest"
fi
printf '  wrangler:         %s\n' "$($WRANGLER --version 2>/dev/null | tail -1)"

if grep -q 'paymentMode: "stripe"' assets/js/data.js; then
  printf '  payment mode:     stripe, cards on\n'
else
  printf '  payment mode:     deposit, orders arrive by email\n'
fi

say "Running the tests..."
node tools/test-worker.mjs | tail -1
node tools/test-checkout.mjs | tail -1

say "Building, without uploading, to prove it compiles..."
$WRANGLER deploy --dry-run --outdir .wrangler/dry-run >/dev/null 2>&1 \
  && printf '  build:            ok\n' \
  || fail "The Worker did not compile. Run: $WRANGLER deploy --dry-run"

if [ "$CHECK_ONLY" = "--check" ]; then
  say "Check passed. Nothing was uploaded."
  exit 0
fi

# ----------------------------------------------------------------- login ----
say "Checking your Cloudflare login..."
if ! $WRANGLER whoami >/dev/null 2>&1; then
  say "Not logged in. A browser window will open. Sign in to Cloudflare, approve
the request, then come back here."
  $WRANGLER login
fi

# --------------------------------------------------------------- secrets ----
# Wrangler reads these from the terminal without echoing them, so no value
# appears on screen, in this file, or in your shell history.
say "Now the two Stripe secrets. Skip either one by pressing Ctrl+C; the deploy
step below still runs if you run this script again."

printf '\n--- 1 of 2: STRIPE_SECRET_KEY ---\n'
printf 'Have ready: your restricted key from https://dashboard.stripe.com/apikeys\n'
printf 'starting rk_test_ or rk_live_, with Checkout Sessions: Write and\n'
printf 'Payment Intents: Read. Paste it at the prompt, then press Enter.\n\n'
$WRANGLER secret put STRIPE_SECRET_KEY

printf '\n--- 2 of 2: STRIPE_WEBHOOK_SECRET ---\n'
printf 'Have ready: the signing secret from your Stripe webhook, starting whsec_\n'
printf 'The webhook URL is printed at the end of this script if you still need\n'
printf 'to create it. Paste the secret at the prompt, then press Enter.\n\n'
$WRANGLER secret put STRIPE_WEBHOOK_SECRET

# ---------------------------------------------------------------- deploy ----
say "Uploading..."
$WRANGLER deploy

# ----------------------------------------------------------------- check ----
URL="https://${WORKER}.madison-lautenschlager.workers.dev"
say "Checking the API answers on the live site..."
sleep 5
HEALTH="$(curl -fsS "${URL}/api/health" || echo FAILED)"

if [ "$HEALTH" = "FAILED" ]; then
  say "No answer from ${URL}/api/health yet. Wait a minute and try it again in
a browser. If it still fails, check the Worker's logs at
https://dash.cloudflare.com -> Workers & Pages -> ${WORKER} -> Logs."
  exit 1
fi

printf '  %s\n' "$HEALTH"

say "Done. Live at ${URL}

Add this webhook in Stripe, under Developers -> Webhooks -> Add endpoint:

  URL:    ${URL}/api/stripe-webhook
  Events: checkout.session.completed
          checkout.session.async_payment_succeeded
          checkout.session.async_payment_failed"
