#!/bin/sh
# Print GitHub release notes for a version from CHANGELOG.md (used by the publish workflow).
set -e
cd "$(dirname "$0")/.."
v=${1:?version, e.g. 1.0.0}
body=$(awk -v h="## [$v]" 'index($0, h) == 1 { on = 1; next } on && /^## \[/ { exit } on && !/^\[.*\]: / { print }' CHANGELOG.md)
[ -n "$(echo "$body" | tr -d '[:space:]')" ] || { echo "no [$v] section in CHANGELOG.md" >&2; exit 1; }
sum=$(cut -d' ' -f1 "release/deadlock-profile-links-$v.vpk.sha256")
printf '%s\n\n' "$(echo "$body" | sed '/./,$!d')"
cat <<NOTES
### Install

- shiv or Deadlock Mod Manager: add the source \`https://luxus.github.io/deadlock-mods/dmm-source.json\` (or \`https://luxus.github.io/deadlock-profile-links/dmm-source.json\`) and install Deadlock Profile Links.
- Manual: download \`deadlock-profile-links-$v.vpk\`, rename it to a free slot such as \`pak08_dir.vpk\` or later, and put it into \`Deadlock/game/citadel/addons/\`. Slots 01–07 are reserved for CompLock. [CompLock HUD++](https://deadlockconfig.com/) is optional.

SHA-256 of \`deadlock-profile-links-$v.vpk\`: \`$sum\`

Written from scratch.
NOTES
