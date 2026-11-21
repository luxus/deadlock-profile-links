// Stand-in tests for Deadlock Profile Links: node test/test.js build/pak/panorama/scripts/profile_links.js
'use strict';
const fs = require('fs');
const S = require('./panorama.js');
const { H, C, advance, buildWorld, storage, shown, overlay, setAccount } = S;
const SRC = fs.readFileSync(process.argv[2] || __dirname + '/../build/pak/panorama/scripts/profile_links.js', 'utf8');
let fails = 0, passes = 0;
const assert = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL', m); } if (process.env.V) console.log(c ? 'ok  ' : 'FAIL', m); };

const byId = (id, root) => { const w = p => { for (const k of p.kids) { if (k.id === id) return k; const r = w(k); if (r) return r; } return null; }; return w(root || H.root); };
const click = id => { const p = byId(id); if (!p) throw new Error('missing ' + id); if (p.events.onactivate) p.events.onactivate(); };
const start = (opts = {}) => {
	for (const k in storage) delete storage[k];
	if (opts.store) storage.deadlock_profile_links_settings = JSON.stringify(opts.store);
	buildWorld(opts);
	S.load(SRC);
	advance(opts.wait === undefined ? 0.05 : opts.wait);
};
const T = () => $.PlTest;
const bodies = () => [['hud', H.hudBody], ['mm', H.mmBody], ['xh', H.xhBody], ['links', byId('PlBody')]].filter(([, b]) => b && shown(b)).map(([k]) => k).join(',');

start();
assert(S.errors.length === 0, 'no errors at start: ' + S.errors.join(' | '));
assert(/const LINKS_DEFAULT = true;/.test(SRC), 'Profile links on by default');
assert(S.info.some(m => /Deadlock Profile Links: 1.0.1 loaded/.test(m)), 'console line 1.0.1 loaded: ' + S.info.join(' | '));
assert(T().TICK_S === 1, 'tick is 1 Hz, not a frame poll');
assert(!/0\.016/.test(SRC), 'no 0.016 s / ~60 Hz interval in the built script');

// parsers
assert(T().parseAccount('1234567') === '1234567', 'plain account id');
assert(T().parseAccount('[U:1:2000001]') === '2000001', 'SteamID3');
assert(T().parseAccount('76561198000000000') === '39734272', 'Steam64 to account id: ' + T().parseAccount('76561198000000000'));
assert(T().parseAccount('99') === '', 'below minimum rejected');
assert(T().parseAccount('{i:account_id}') === '', 'unresolved binding rejected');
assert(T().parseAccount('#Citadel_Profile_FriendID') === '', 'loc token rejected');
assert(T().agree('1111111', '2222222') === '', 'hidden/visible mismatch yields no id');
assert(T().agree('1111111', '1111111') === '1111111', 'matching probes agree');
assert(T().rankUrl('1234567') === 'https://api.deadlock-api.com/v1/players/1234567/rank/image?format=webp', 'rank image url');
assert(T().statlockerUrl('1234567') === 'https://statlocker.gg/profile/1234567', 'statlocker url');
assert(T().deadchapsUrl('1234567') === 'https://www.deadchaps.gg/player/1234567/', 'deadchaps url');
assert(T().rankUrl('nope') === '' && T().statlockerUrl('') === '', 'bad ids produce no url');

// runtime injection on the profile page
assert(byId('PlRoot', H.page) && byId('PlStatlocker', H.page) && byId('PlDeadchaps', H.page) && byId('PlBadge', H.page), 'page: badge and both link buttons injected');
assert(shown(byId('PlRoot', H.page)), 'page: root shown when enabled');
assert(byId('PlStatlocker', H.page).enabled && byId('PlDeadchaps', H.page).enabled, 'page: buttons enabled once an account is known');
assert(byId('PlBadge', H.page).img === 'https://api.deadlock-api.com/v1/players/1234567/rank/image?format=webp', 'page: rank image set for the account');

overlay.urls = [];
click('PlStatlocker');
assert(overlay.urls.includes('https://statlocker.gg/profile/1234567'), 'Statlocker click opens the profile url: ' + overlay.urls.join(','));
overlay.urls = [];
byId('PlDeadchaps', H.page).events.onactivate();
assert(overlay.urls.includes('https://www.deadchaps.gg/player/1234567/'), 'DeadChaps click opens the player url: ' + overlay.urls.join(','));

// 1 Hz, no writes while nothing changes
S.resetCounts(); advance(5);
assert(C.classWrites === 0 && C.textWrites === 0 && C.styleWrites === 0 && C.images === 0, '5 s, nothing changes: no writes (' + JSON.stringify(C) + ')');
assert(C.sched >= 4 && C.sched <= 6, 'timer at 1 Hz: ' + C.sched);

// account change updates once
setAccount(H.page, '2222222', '2222222');
advance(1);
assert(byId('PlBadge', H.page).img.indexOf('2222222') >= 0, 'account change: badge url follows');
assert(byId('PlRoot', H.page).GetAttributeString('account', '') === '2222222', 'account change: stored on the host');

// settings tab in the new 3-tab CompLock menu
H.menuButton.events.onactivate(); advance(1.1);
assert(H.menu && H.menu.cls.has('HudppOpen'), 'CompLock menu opens');
assert(byId('PlTab') && byId('PlTab').parent.cls.has('HudppTabs'), 'Profile Links tab in the CompLock tab bar');
assert(bodies() === 'hud', 'menu still on HUD after our tab is added: ' + bodies());
click('PlTab'); advance(0.1);
assert(bodies() === 'links', 'our tab: HUD++ HUD/Minimap/Crosshair bodies hidden: ' + bodies());
assert(H.foot.applied.visibility === 'collapse', 'our tab: HUD++ foot hidden');
assert(byId('PlTab').cls.has('HudppSelected'), 'our tab selected');
H.tabs.mm.events.onactivate(); advance(0.06);
assert(bodies() === 'mm', 'hand back to Minimap after HUD++ refresh: ' + bodies());
click('PlTab'); advance(0.1);
H.tabs.xh.events.onactivate(); advance(0.06);
assert(bodies() === 'xh', 'hand back to Crosshair: ' + bodies());

// toggle off hides UI and stops the 1 Hz work
click('PlTab'); advance(0.1);
assert(!!byId('PlRow_on'), 'settings has the Profile links toggle');
click('PlRow_on'); advance(1.1);
assert(!shown(byId('PlRoot', H.page)), 'toggle off: page links hidden');
H.closeMenu(); advance(0.1);
S.resetCounts(); advance(5);
assert(C.sched <= 2, 'toggle off: no 1 Hz profile timer (' + C.sched + ')');

// old 2-tab HUD++ still hides both CompLock bodies
start({ model: 'old' });
H.menuButton.events.onactivate(); advance(1.1); click('PlTab'); advance(0.1);
assert(bodies() === 'links', '18 Nov two-tab menu: our tab hides HUD and Crosshair: ' + bodies());

// scoreboard and card, from those layouts
start({ ctx: 'card', cardHidden: '4000001', cardDirect: '4000001' });
assert(byId('PlRoot', H.card) && shown(byId('PlRoot', H.card)), 'profile card: links injected');
assert(byId('PlBadge', H.card).img.indexOf('4000001') >= 0, 'profile card: badge for its account');

start({ ctx: 'board' });
const rowRoots = H.rows.map(r => byId('PlRoot', r));
assert(rowRoots.every(Boolean) && rowRoots.every(shown), 'scoreboard: a link row on every player');
assert(rowRoots.every(box => box.GetParent() === box.GetParent() && H.rows.includes(box.GetParent())), 'scoreboard: slot is a child of the Player row');
assert(rowRoots.every(box => {
	const names = box.GetParent().FindChildTraverse('PlayerNameContainer');
	let p = box;
	while (p) { if (p === names) return false; p = p.GetParent(); }
	return true;
}), 'scoreboard: slot is not inside the name column');
assert(byId('PlRoot', H.rows[1]).GetAttributeString('account', '') === '2000001', 'scoreboard: ally account');
assert(byId('PlRoot', H.rows[2]).GetAttributeString('account', '') === '3000001', 'scoreboard: SteamID3 account');
overlay.urls = [];
byId('PlStatlocker', H.rows[1]).events.onactivate();
assert(overlay.urls.includes('https://statlocker.gg/profile/2000001'), 'scoreboard Statlocker click');

// scoreboard rows often bind {i:player_account_id} rather than {i:account_id}
start({ ctx: 'board', rows: [{ name: 'Solo', hidden: '', direct: '', player: '8000001', playerRoot: '8000001' }] });
assert(byId('PlRoot', H.rows[0]).GetAttributeString('account', '') === '8000001', 'scoreboard: player_account_id probe');
overlay.urls = [];
byId('PlDeadchaps', H.rows[0]).events.onactivate();
assert(overlay.urls.includes('https://www.deadchaps.gg/player/8000001/'), 'scoreboard DeadChaps click from player_account_id');

// layout-provided slot: bind the existing buttons, do not inject a second host
start({ ctx: 'board', rows: [{ name: 'Ally', hidden: '2000001', direct: '2000001', layoutSlot: true }] });
assert(H.rows[0].FindChild('PlRoot') && H.rows[0].FindChild('PlRoot').BHasClass('PlSlot'), 'scoreboard: uses the layout slot');
assert(byId('PlRoot', H.rows[0]).GetAttributeString('account', '') === '2000001', 'scoreboard layout slot: account');
overlay.urls = [];
byId('PlStatlocker', H.rows[0]).events.onactivate();
assert(overlay.urls.includes('https://statlocker.gg/profile/2000001'), 'scoreboard layout slot: Statlocker click');

// default-off store
start({ store: { v: 1, on: false } });
advance(0.2);
assert(byId('PlRoot', H.page) && !shown(byId('PlRoot', H.page)), 'saved off: root exists but is hidden');

// hooks on HUD++ tabs only while our tab is shown
start();
H.menuButton.events.onactivate(); advance(1.1);
click('PlTab'); advance(0.1);
assert(S.handlers.some(h => h.ev === 'Activated' && h.p && [H.tabs.hud, H.tabs.mm, H.tabs.xh].includes(h.p)), 'while our tab is shown, HUD++ tabs have an Activated hook');
H.tabs.mm.events.onactivate(); advance(0.06);
assert(!S.handlers.some(h => h.ev === 'Activated' && h.p && [H.tabs.hud, H.tabs.mm, H.tabs.xh].includes(h.p)), 'no Activated hook left on HUD++ tabs after leaving ours');

console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
