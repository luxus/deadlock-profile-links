# Deadlock Profile Links

A [Deadlock](https://store.steampowered.com/app/1422450/Deadlock/) addon that puts a rank badge and buttons for [Statlocker](https://statlocker.gg/) and [DeadChaps](https://www.deadchaps.gg/) on profile pages, profile cards and the post-game scoreboard.

Written from scratch. It contains no code from the previous Profile Links pak. The rank and link destinations are the same public URLs. Button logos are the existing Statlocker and DeadChaps marks already used with this addon. Settings use our Addon Settings library, vendored from [Improved Quickbuy](https://github.com/luxus/improved-quickbuy) (library 1.1.3, BUILD 5).

Listed in the [luxus Deadlock mods](https://luxus.github.io/deadlock-mods/) registry.

## What it does

- Rank badge from `https://api.deadlock-api.com/v1/players/<id>/rank/image?format=webp`
- Buttons that open `https://statlocker.gg/profile/<id>` and `https://www.deadchaps.gg/player/<id>/`
- Account ids from Valve data-binding probes, also accepting a SteamID3 or a Steam64
- One "Profile links" toggle in settings (on by default)
- A "Profile Links" tab in [CompLock HUD++](https://deadlockconfig.com/), or an ADDONS window in the Esc menu without HUD++
- "Reset Profile Links" on the right of the settings foot puts the toggle back to the default
- Toggle descriptions appear as a tooltip on hover, like HUD++'s own rows
- The script loads with the profile, profile-card and post-game scoreboard layouts. While those screens can be shown it ticks at 1 Hz; it does not poll at frame rate

Valve's profile layouts change. Runtime injection is used so a layout drift is less likely to blank the screen; that still needs a look in game to confirm.

## Build

Needs [modlock](https://github.com/paralin/modlock) (or set `MODLOCK` to a local copy) for the VPK step. Assemble and tests do not need it.

```sh
# optional: MODLOCK=/path/to/modlock
sh tools/assemble.sh
node test/test.js
sh test/mutants.sh
sh tools/build.sh   # writes build/deadlock-profile-links.vpk
```

## Install

Do this only while Deadlock is not running.

- With [shiv](https://github.com/luxus/shiv) or [Deadlock Mod Manager](https://deadlockmods.app/): add the source `https://luxus.github.io/deadlock-mods/dmm-source.json` and install Deadlock Profile Links, or use the buttons on https://luxus.github.io/deadlock-mods/ and https://luxus.github.io/deadlock-profile-links/.
- Manual: download `deadlock-profile-links-1.0.0.vpk` from the [GitHub release](https://github.com/luxus/deadlock-profile-links/releases/tag/v1.0.0), rename it to a free slot such as `pak08_dir.vpk` or later, and put it into `Deadlock/game/citadel/addons/`. Slots 01–07 are reserved for CompLock. [CompLock HUD++](https://deadlockconfig.com/) is optional.

Start Deadlock, open a profile, and check the console for `Deadlock Profile Links: 1.0.0 loaded`.

## License

MIT for this project's own code (Kai Löhnert / luxus). Valve's vanilla profile and scoreboard layouts in `vanilla/` remain Valve Corporation's property. The Statlocker and DeadChaps marks remain their owners' property.
