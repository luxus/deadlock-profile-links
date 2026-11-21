#!/bin/sh
# Negative controls: each mutant of the built script must make the stand-in suite fail.
cd "$(dirname "$0")/.."
B=build/pak/panorama/scripts/profile_links.js
run() { name=$1; shift; python3 -c "
import sys; s=open('$B').read(); args=sys.argv[1:]
for a,b in zip(args[::2],args[1::2]):
    assert a in s, 'mutant anchor missing: '+a; s=s.replace(a,b,1)
open('/tmp/pl_mutant.js','w').write(s)" "$@" || { echo "BROKEN $name"; return; }
  if node test/test.js /tmp/pl_mutant.js >/tmp/pl_mutant.out 2>&1; then echo "SURVIVED $name"; else echo "killed   $name ($(grep -c FAIL /tmp/pl_mutant.out) fails)"; fi; }

run default-off "const LINKS_DEFAULT = true;" "const LINKS_DEFAULT = false;"
run tick-every-frame "const TICK_S = 1;" "const TICK_S = 0.016;"
run runs-when-off "const settingsChanged = () => { if (wanted()) { attach(); kick(); } else stop(); };" "const settingsChanged = () => { attach(); kick(); };" "	if (!wanted()) { s.hosts.forEach(h => { if (h.kind === 'board') players(h.ctx).forEach(hideTree); else hideTree(h.ctx); }); AddonSettings.pulse(); return; }" "	if (!wanted()) { s.hosts.forEach(h => { if (h.kind === 'board') players(h.ctx).forEach(hideTree); else hideTree(h.ctx); }); AddonSettings.pulse(); s.timer = $.Schedule(TICK_S, tick); return; }"
run write-every-tick "const show = (p, on) => { const v = on ? 'visible' : 'collapse'; if (!ok(p) || p.style.visibility === v) return; p.style.visibility = v; };" "const show = (p, on) => { if (ok(p)) p.style.visibility = on ? 'visible' : 'collapse'; };" "	if (box.GetAttributeString('sig', '') === sig) return;" "	if (false && box.GetAttributeString('sig', '') === sig) return;"
run hook-hudpp-button "AddonSettings.ride(() => !!st().timer);" "const hb = top().FindChildTraverse('HudppMenuButton'); if (ok(hb)) \$.RegisterEventHandler('Activated', hb, () => {});
AddonSettings.ride(() => !!st().timer);"
run wrong-settings-id "	id: 'deadlock_profile_links', title: '#Pl_Tab', prefix: 'Pl', strings: STRINGS," "	id: 'hudpp_settings', title: '#Pl_Tab', prefix: 'Pl', strings: STRINGS,"
run no-pulse "	if (wanted() && s.hosts.some(h => ok(h.ctx))) s.timer = \$.Schedule(TICK_S, tick);
	AddonSettings.pulse();" "	if (wanted() && s.hosts.some(h => ok(h.ctx))) s.timer = \$.Schedule(TICK_S, tick);"
run version-string "say(VERSION + ' loaded (' + AddonSettings.language() + ')');" "say('v0 loaded (' + AddonSettings.language() + ')');"
run steam64-broken "	const id = subDec(t, STEAM64_BASE);" "	const id = t;"
run mismatch-opens "	if (h && v && h !== v) return '';" "	if (false && h && v && h !== v) return '';"
