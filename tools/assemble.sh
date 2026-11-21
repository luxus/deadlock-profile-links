#!/bin/sh
# Assemble build/pak from src/ and vanilla/. No modlock needed: CI and tests use this.
set -e
cd "$(dirname "$0")/.."
rm -rf build/pak && mkdir -p \
	build/pak/panorama/scripts \
	build/pak/panorama/styles \
	build/pak/panorama/layout/post_game \
	build/pak/panorama/images/profile_links
{
	echo '// Deadlock Profile Links 1.0.0 - built from src/ by tools/build.sh. Written from scratch.'
	echo '(() => {'
	echo "'use strict';"
	sh lib/addon-settings/vendor.sh print
	cat src/strings.js src/main.js
	echo '})();'
} > build/pak/panorama/scripts/profile_links.js
cp src/profile_links.css build/pak/panorama/styles/profile_links.css
cp src/images/statlocker.png build/pak/panorama/images/profile_links/statlocker.png
cp src/images/deadchaps.png build/pak/panorama/images/profile_links/deadchaps.png
node tools/loc.js src/strings.js STRINGS build/pak deadlock_profile_links >/dev/null
python3 tools/layout.py vanilla/citadel_db_page_profile.xml \
	build/pak/panorama/layout/citadel_db_page_profile.xml
python3 tools/layout.py vanilla/profile_card.xml \
	build/pak/panorama/layout/profile_card.xml
python3 tools/layout.py vanilla/citadel_db_post_game_scoreboard_new.xml \
	build/pak/panorama/layout/post_game/citadel_db_post_game_scoreboard_new.xml
node --check build/pak/panorama/scripts/profile_links.js
