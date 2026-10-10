#!/bin/sh
# Changes the ?v= stamp on every script and stylesheet so returning browsers
# fetch the new files instead of the ones they already hold.
#
#   sh tools/bump-assets.sh
#
# Run it whenever the menu, the prices or any script change. Forgetting means
# a customer who visited last week keeps seeing last week's prices.

set -eu
cd "$(dirname "$0")/.."

# Down to the second. An earlier version only went to the hour, so two
# deploys in one hour produced the same stamp and the second one never
# reached anybody's browser, which is the exact failure this script exists
# to prevent.
NEW="$(date -u +%Y%m%d%H%M%S)"
OLD="$(grep -ho 'assets/js/data\.js?v=[^"]*' index.html | head -1 | sed 's/.*?v=//')"

[ -n "$OLD" ] || { echo "No version stamp found. Has bump-assets run before?" >&2; exit 1; }
[ "$OLD" != "$NEW" ] || { echo "Already at $NEW, nothing to do."; exit 0; }

for f in *.html; do
  sed -i.bak "s/?v=$OLD/?v=$NEW/g" "$f" && rm -f "$f.bak"
done

printf 'Bumped %s -> %s across %s pages.\n' "$OLD" "$NEW" "$(ls *.html | wc -l | tr -d ' ')"
printf 'Now commit and push, then the new files reach everyone on their next visit.\n'
