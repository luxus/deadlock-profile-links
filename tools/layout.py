#!/usr/bin/env python3
"""Valve profile / scoreboard layouts + our style, script, probes and scoreboard slot.

Runtime code binds the badge and buttons. These files load the script on those
screens, give it Valve data-binding labels for the account id, and on the
scoreboard place a visible icon slot AFTER the stats row so Valve's columns
stay under their header.
"""
import re
import sys
from pathlib import Path

STYLE = '\t\t<include src="s2r://panorama/styles/profile_links.vcss_c" />\n'
SCRIPTS = '\t<scripts>\n\t\t<include src="s2r://panorama/scripts/profile_links.vjs_c" />\n\t</scripts>\n'
BANNER = '<!-- Valve layout + Deadlock Profile Links includes (tools/layout.py) -->\n'
PROBE = (
    '\t\t\t\t\t\t\t<Label id="PlAccountId" class="PlProbe" text="{i:r:account_id}" hittest="false" />\n'
    '\t\t\t\t\t\t\t<Label id="PlAccountIdDirect" class="PlProbe" text="{i:account_id}" hittest="false" />\n'
    '\t\t\t\t\t\t\t<Label id="PlAccountIdPlayer" class="PlProbe" text="{i:player_account_id}" hittest="false" />\n'
    '\t\t\t\t\t\t\t<Label id="PlAccountIdPlayerRoot" class="PlProbe" text="{i:r:player_account_id}" hittest="false" />\n'
)
# After the stats PlayerRow (which ends with CopyBuildButton). Our own ids.
SLOT = (
    '\t\t\t\t<Panel id="PlRoot" class="PlRoot PlSlot Pl_row">\n'
    '\t\t\t\t\t<Button id="PlStatlocker" class="PlButton" onmouseover="UIShowTextTooltip( #Pl_Statlocker )" onmouseout="UIHideTextTooltip()">\n'
    '\t\t\t\t\t\t<Panel class="PlLogo PlLogoStatlocker" hittest="false" />\n'
    '\t\t\t\t\t</Button>\n'
    '\t\t\t\t\t<Button id="PlDeadchaps" class="PlButton" onmouseover="UIShowTextTooltip( #Pl_Deadchaps )" onmouseout="UIHideTextTooltip()">\n'
    '\t\t\t\t\t\t<Panel class="PlLogo PlLogoDeadchaps" hittest="false" />\n'
    '\t\t\t\t\t</Button>\n'
    '\t\t\t\t</Panel>\n'
)
SLOT_RE = re.compile(
    r'(<Button class="CopyBuildButton" id="CopyBuildButton"[^/]*/>\s*</Panel>\n)',
    re.M,
)

HOOKS = (
    '<Panel id="ProfileInfo">',
    '<Panel id="AccountID">',
    '<Panel class="PlayerInfoContainer">',
)


def patch(src: str) -> str:
    if src.startswith('<!--'):
        src = src[src.index('-->') + 3:].lstrip()
    src = src.replace('.vcss"', '.vcss_c"')
    styles_end = '\t</styles>\n'
    if styles_end not in src:
        raise SystemExit('styles block not found')
    if 'profile_links.vcss_c' not in src:
        src = src.replace(styles_end, STYLE + styles_end, 1)
    if 'profile_links.vjs_c' not in src:
        if '\t</scripts>\n' in src:
            src = src.replace('\t</scripts>\n', '\t\t<include src="s2r://panorama/scripts/profile_links.vjs_c" />\n\t</scripts>\n', 1)
        else:
            src = src.replace(styles_end, styles_end + SCRIPTS, 1)
    if 'id="PlAccountId"' not in src:
        for hook in HOOKS:
            if hook in src:
                src = src.replace(hook, hook + '\n' + PROBE, 1)
                break
        else:
            raise SystemExit('no probe hook found')
    if 'CopyBuildButton' in src and 'class="PlSlot"' not in src:
        src, n = SLOT_RE.subn(r'\1' + SLOT, src, count=1)
        if n != 1:
            raise SystemExit('scoreboard PlayerRow close not found for PlSlot')
    return BANNER + src


def main():
    src, dest = Path(sys.argv[1]), Path(sys.argv[2])
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(patch(src.read_text(encoding='utf-8')), encoding='utf-8')


if __name__ == '__main__':
    main()
