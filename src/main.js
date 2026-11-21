const VERSION = '1.0.1';
const LINKS_DEFAULT = true;
const TICK_S = 1;
const CACHE_MS = 600000;
const ACCOUNT_MIN = 100000;
const ACCOUNT_MAX = 4294967295;
const STEAM64_BASE = '76561197960265728';
const API_BASE = 'https://api.deadlock-api.com/v1/players';
const STATLOCKER = 'https://statlocker.gg/profile';
const DEADCHAPS = 'https://www.deadchaps.gg/player';

const cfg = { on: LINKS_DEFAULT };
const say = m => { try { $.Msg('Deadlock Profile Links: ' + m); } catch (e) { /* no console */ } };
const ok = p => !!(p && p.IsValid && p.IsValid());
const cancel = h => { if (h) { try { $.CancelScheduled(h); } catch (e) { /* ran */ } } return null; };
const show = (p, on) => { const v = on ? 'visible' : 'collapse'; if (!ok(p) || p.style.visibility === v) return; p.style.visibility = v; };
const guard = (name, fn) => { try { return fn(); } catch (e) { say(name + ' failed: ' + (e && e.message ? e.message : e)); return undefined; } };

const stripZeros = s => { s = String(s || '').replace(/^0+/, ''); return s || '0'; };
const cmpDec = (a, b) => { a = stripZeros(a); b = stripZeros(b); if (a.length !== b.length) return a.length > b.length ? 1 : -1; return a === b ? 0 : (a > b ? 1 : -1); };
const subDec = (a, b) => {
	a = stripZeros(a); b = stripZeros(b);
	if (cmpDec(a, b) < 0) return '';
	let out = '', borrow = 0;
	for (let i = 0; i < a.length; i++) {
		const ai = a.length - 1 - i, bi = b.length - 1 - i;
		let d = Number(a.charAt(ai)) - borrow - (bi >= 0 ? Number(b.charAt(bi)) : 0);
		if (d < 0) { d += 10; borrow = 1; } else borrow = 0;
		out = String(d) + out;
	}
	return stripZeros(out);
};
const inRange = id => { if (!/^\d{1,10}$/.test(id)) return false; const n = Number(id); return isFinite(n) && n >= ACCOUNT_MIN && n <= ACCOUNT_MAX; };
const fromSteam64 = text => {
	const t = String(text || '');
	if (!/^\d{17}$/.test(t)) return '';
	const id = subDec(t, STEAM64_BASE);
	return inRange(id) ? id : '';
};
const tidy = value => String(value === undefined || value === null ? '' : value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
const parseAccount = value => {
	const text = tidy(value);
	if (!text || /[{}]/.test(text) || text.charAt(0) === '#' || /^nan$/i.test(text)) return '';
	const steam3 = /^\[U:1:(\d+)\]$/i.exec(text);
	if (steam3) { const id = stripZeros(steam3[1]); return inRange(id) ? id : ''; }
	if (/^\d{17}$/.test(text)) return fromSteam64(text);
	if (/^\d{1,10}$/.test(text)) { const id = stripZeros(text); return inRange(id) ? id : ''; }
	const found = [];
	const add = v => { if (v && found.indexOf(v) < 0) found.push(v); };
	const re3 = /\[U:1:(\d+)\]/gi;
	let m;
	while ((m = re3.exec(text))) { const id = stripZeros(m[1]); add(inRange(id) ? id : ''); }
	const re64 = /(^|\D)(\d{17})(?!\d)/g;
	while ((m = re64.exec(text))) add(fromSteam64(m[2]));
	if (/\b(?:account\s*id|friend\s*code)\b/i.test(text)) {
		const rest = text.replace(/^.*?\b(?:account\s*id|friend\s*code)\b\s*:?\s*/i, '');
		if (/^[0-9\s.,'’_-]+$/.test(rest)) add(parseAccount(rest));
	}
	return found.length === 1 ? found[0] : '';
};
const agree = (hidden, visible) => {
	const h = parseAccount(hidden), v = parseAccount(visible);
	if (h && v && h !== v) return '';
	return h || v;
};
const rankUrl = id => { const a = parseAccount(id); return a ? API_BASE + '/' + encodeURIComponent(a) + '/rank/image?format=webp' : ''; };
const statlockerUrl = id => { const a = parseAccount(id); return a ? STATLOCKER + '/' + encodeURIComponent(a) : ''; };
const deadchapsUrl = id => { const a = parseAccount(id); return a ? DEADCHAPS + '/' + encodeURIComponent(a) + '/' : ''; };

const openUrl = url => {
	if (!url) return false;
	try {
		if (typeof SteamOverlayAPI !== 'undefined' && SteamOverlayAPI && SteamOverlayAPI.OpenURL) {
			SteamOverlayAPI.OpenURL(url);
			return true;
		}
	} catch (e) { /* overlay missing */ }
	try { $.DispatchEvent('ExternalBrowserGoToURL', url); return true; } catch (e2) { return false; }
};

const top = () => { let a = $.GetContextPanel(), last = a; while (ok(a)) { last = a; a = a.GetParent(); } return last; };
const st = () => {
	const r = top();
	if (!ok(r)) return { timer: null, hosts: [], cache: {} };
	if (!r.Pl) r.Pl = { timer: null, hosts: [], cache: {} };
	return r.Pl;
};
const nowMs = () => Date.now();
const cacheGet = (s, id) => { const e = s.cache[id]; return e && nowMs() - e.at <= CACHE_MS ? e : null; };
const cacheSet = (s, id, url) => { s.cache[id] = { url: url, at: nowMs() }; };
const readText = p => { if (!ok(p)) return ''; try { return String(p.text || ''); } catch (e) { return ''; } };
const probe = (root, key, id) => { if (ok(root[key])) return root[key]; const p = root.FindChildTraverse(id); if (ok(p)) root[key] = p; return p; };
const accountFrom = root => {
	if (!ok(root)) return '';
	const hidden = readText(probe(root, '_plHidden', 'PlAccountId'));
	const direct = readText(probe(root, '_plDirect', 'PlAccountIdDirect'));
	const player = readText(probe(root, '_plPlayer', 'PlAccountIdPlayer'));
	const playerRoot = readText(probe(root, '_plPlayerRoot', 'PlAccountIdPlayerRoot'));
	const a = agree(hidden, direct);
	const b = agree(player, playerRoot);
	if (a && b && a !== b) return '';
	if (a || b) return a || b;
	const friend = root.FindChildTraverse('FriendID');
	if (ok(friend)) { const id = parseAccount(readText(friend)); if (id) return id; }
	const acc = root.FindChildTraverse('AccountID');
	if (ok(acc)) {
		const n = acc.GetChildCount ? acc.GetChildCount() : 0;
		for (let i = 0; i < n; i++) { const id = parseAccount(readText(acc.GetChild(i))); if (id) return id; }
		const id = parseAccount(readText(acc)); if (id) return id;
	}
	return '';
};

const makeBtn = (parent, id, logoClass, title, which) => {
	let b = parent.FindChild(id);
	if (!ok(b)) {
		b = $.CreatePanel('Button', parent, id);
		b.AddClass('PlButton');
		const logo = $.CreatePanel('Panel', b, '');
		logo.AddClass('PlLogo');
		logo.AddClass(logoClass);
		logo.hittest = false;
	}
	b.SetPanelEvent('onactivate', () => {
		const box = b.GetParent();
		const acc = ok(box) ? box.GetAttributeString('account', '') : '';
		openUrl(which === 'statlocker' ? statlockerUrl(acc) : deadchapsUrl(acc));
	});
	return b;
};
const parentFor = (root, kind) => {
	if (kind === 'page') return root.FindChildTraverse('ProfileInfo') || root;
	if (kind === 'card') return root.FindChild('AccountID') || root;
	// Scoreboard: a sibling of the stats row, not inside the tight name column.
	return root;
};
const ensureHost = (root, kind) => {
	if (ok(root._plBox)) return root._plBox;
	let box = root.FindChildTraverse('PlRoot');
	if (!ok(box)) {
		const parent = parentFor(root, kind);
		if (!ok(parent)) return null;
		box = $.CreatePanel('Panel', parent, 'PlRoot');
		box.AddClass('PlRoot');
		box.AddClass(kind === 'page' ? 'Pl_page' : kind === 'card' ? 'Pl_card' : 'Pl_row');
		if (kind === 'row') box.AddClass('PlSlot');
		if (kind !== 'row') {
			const badge = $.CreatePanel('Image', box, 'PlBadge');
			badge.AddClass('PlBadge');
			badge.hittest = false;
			show(badge, false);
		}
	}
	makeBtn(box, 'PlStatlocker', 'PlLogoStatlocker', 'Statlocker', 'statlocker');
	makeBtn(box, 'PlDeadchaps', 'PlLogoDeadchaps', 'DeadChaps', 'deadchaps');
	root._plBox = box;
	return box;
};
const apply = (box, id, s) => {
	const on = !!cfg.on;
	const has = on && !!id;
	box.SetAttributeString('account', has ? id : '');
	const sl = box.FindChild('PlStatlocker'), dc = box.FindChild('PlDeadchaps'), badge = box.FindChild('PlBadge');
	if (ok(sl)) sl.enabled = has;
	if (ok(dc)) dc.enabled = has;
	show(box, on);
	if (!has) { show(badge, false); box.SetAttributeString('rankurl', ''); return; }
	const url = rankUrl(id);
	if (!url || !ok(badge)) { show(badge, false); return; }
	if (box.GetAttributeString('rankurl', '') === url) { show(badge, true); return; }
	box.SetAttributeString('rankurl', url);
	try { badge.SetImage(url); cacheSet(s, id, url); } catch (e) { show(badge, false); return; }
	show(badge, true);
};
const syncHost = (root, kind, s) => {
	if (!ok(root)) return;
	const box = ensureHost(root, kind);
	if (!ok(box)) return;
	const id = accountFrom(root);
	const sig = (cfg.on ? '1' : '0') + ':' + id;
	if (box.GetAttributeString('sig', '') === sig) return;
	box.SetAttributeString('sig', sig);
	apply(box, id, s);
};
const players = root => {
	const out = [];
	const walk = p => {
		if (!ok(p)) return;
		if (p.BHasClass('Player')) out.push(p);
		const n = p.GetChildCount();
		for (let i = 0; i < n; i++) walk(p.GetChild(i));
	};
	walk(root);
	return out;
};
const kindOf = ctx => {
	if (ok(ctx.FindChildTraverse('ProfileInfo'))) return 'page';
	if (ok(ctx.FindChild('MiniProfileContainer')) || ok(ctx.FindChild('AccountID'))) return 'card';
	if (ok(ctx.FindChildTraverse('TeamPlayers'))) return 'board';
	return '';
};
const attach = () => {
	const ctx = $.GetContextPanel();
	if (!ok(ctx)) return;
	const s = st();
	if (s.hosts.some(h => h.ctx === ctx)) return;
	const kind = kindOf(ctx);
	if (!kind) return;
	s.hosts.push({ ctx: ctx, kind: kind });
};
const hideTree = root => { const b = ok(root) ? root.FindChildTraverse('PlRoot') : null; if (ok(b)) show(b, false); };
const syncAll = s => {
	s.hosts = s.hosts.filter(h => ok(h.ctx));
	s.hosts.forEach(h => {
		if (h.kind === 'board') players(h.ctx).forEach(row => syncHost(row, 'row', s));
		else syncHost(h.ctx, h.kind, s);
	});
};
const wanted = () => !!cfg.on;
const tick = () => {
	const s = st();
	s.timer = null;
	if (!wanted()) { s.hosts.forEach(h => { if (h.kind === 'board') players(h.ctx).forEach(hideTree); else hideTree(h.ctx); }); AddonSettings.pulse(); return; }
	guard('sync', () => syncAll(s));
	if (wanted() && s.hosts.some(h => ok(h.ctx))) s.timer = $.Schedule(TICK_S, tick);
	AddonSettings.pulse();
};
const kick = () => { const s = st(); s.timer = cancel(s.timer); tick(); };
const stop = () => {
	const s = st();
	s.timer = cancel(s.timer);
	s.hosts.forEach(h => { if (h.kind === 'board') players(h.ctx).forEach(hideTree); else hideTree(h.ctx); });
};
const settingsChanged = () => { if (wanted()) { attach(); kick(); } else stop(); };

const SCHEMA = {
	id: 'deadlock_profile_links', title: '#Pl_Tab', prefix: 'Pl', strings: STRINGS,
	resetLabel: '#Pl_Reset',
	controls: [
		{ key: 'on', type: 'toggle', title: '#Pl_Enable', desc: '#Pl_EnableDesc', default: LINKS_DEFAULT }
	]
};

AddonSettings.ride(() => !!st().timer);
AddonSettings.register(SCHEMA, values => { Object.assign(cfg, values); settingsChanged(); });
attach();
settingsChanged();
say(VERSION + ' loaded (' + AddonSettings.language() + ')');

$.PlTest = { parseAccount, agree, fromSteam64, rankUrl, statlockerUrl, deadchapsUrl, openUrl, VERSION, TICK_S, LINKS_DEFAULT };
