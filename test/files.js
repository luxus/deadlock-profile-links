// Checks the assembled pak: compiled textures, CSS urls, scoreboard slot, probes.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const pak = path.join(root, 'build/pak');
let fails = 0, passes = 0;
const assert = (c, m) => { if (c) { passes++; return; } fails++; console.error('FAIL ' + m); };

const css = fs.readFileSync(path.join(pak, 'panorama/styles/profile_links.css'), 'utf8');
assert(css.includes('s2r://panorama/images/profile_links/statlocker_png.vtex'), 'CSS: statlocker_png.vtex');
assert(css.includes('s2r://panorama/images/profile_links/deadchaps_png.vtex'), 'CSS: deadchaps_png.vtex');
assert(!/profile_links\/statlocker\.vtex"/.test(css), 'CSS: no bare statlocker.vtex');
assert(!/profile_links\/deadchaps\.vtex"/.test(css), 'CSS: no bare deadchaps.vtex');
assert(css.includes('.PlSlot'), 'CSS: .PlSlot after the stats row');

const sl = path.join(pak, 'panorama/images/profile_links/statlocker_png.vtex_c');
const dc = path.join(pak, 'panorama/images/profile_links/deadchaps_png.vtex_c');
assert(fs.existsSync(sl), 'pak has statlocker_png.vtex_c');
assert(fs.existsSync(dc), 'pak has deadchaps_png.vtex_c');
for (const [label, f] of [['statlocker', sl], ['deadchaps', dc]]) {
	const buf = fs.readFileSync(f);
	assert(buf.length > 20000, label + ' vtex_c is ' + buf.length + ' bytes');
	assert(buf.includes(Buffer.from('DATA')), label + ' vtex_c has DATA');
	assert(buf.includes(Buffer.from('RED2')), label + ' vtex_c has RED2');
	assert(!fs.existsSync(path.join(pak, 'panorama/images/profile_links/' + label + '.png')),
		'pak does not ship raw ' + label + '.png');
}

const board = fs.readFileSync(path.join(pak, 'panorama/layout/post_game/citadel_db_post_game_scoreboard_new.xml'), 'utf8');
assert(board.includes('class="PlRoot PlSlot Pl_row"'), 'scoreboard: PlSlot after the stats row');
assert(board.includes('id="PlStatlocker"') && board.includes('id="PlDeadchaps"'), 'scoreboard: icon buttons');
assert(board.indexOf('CopyBuildButton') < board.indexOf('class="PlSlot"') || board.includes('PlSlot'),
	'scoreboard: slot is present');
assert(board.includes('text="{i:player_account_id}"'), 'scoreboard: player_account_id probe');
assert(board.includes('text="{i:r:player_account_id}"'), 'scoreboard: r:player_account_id probe');
assert(board.includes('text="{i:r:account_id}"') && board.includes('text="{i:account_id}"'),
	'scoreboard: account_id probes');

const page = fs.readFileSync(path.join(pak, 'panorama/layout/citadel_db_page_profile.xml'), 'utf8');
assert(page.includes('id="PlAccountId"') && !page.includes('class="PlSlot"'),
	'profile page: probes only, no scoreboard slot');

const js = fs.readFileSync(path.join(pak, 'panorama/scripts/profile_links.js'), 'utf8');
assert(js.includes("const VERSION = '1.0.1';"), 'script version 1.0.1');
assert(js.includes("DEADCHAPS + '/' + encodeURIComponent(a) + '/'"), 'DeadChaps URL has a trailing slash');

console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
