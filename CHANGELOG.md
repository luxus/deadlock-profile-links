# Changelog

All notable changes to Deadlock Profile Links are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-11-21

### Fixed

- The Statlocker and DeadChaps icons on the post-game scoreboard were missing.
  1.0.0 packed raw PNGs and pointed CSS at `statlocker.vtex` / `deadchaps.vtex`,
  so the game looked for `statlocker.vtex_c` and failed to open the texture.
  1.0.1 ships compiled `statlocker_png.vtex_c` and `deadchaps_png.vtex_c` and
  matching CSS URLs.
- The icons now sit in a slot after each player's stats row, next to the name
  row, so Valve's Souls/KDA/Damage/Healing/Items columns stay under their header.
- Scoreboard rows also read `{i:player_account_id}` probes, which is what those
  rows actually bind.

The texture names, slot placement, extra probes and the DeadChaps
`/player/{id}/` URL follow the newest Profile Links work in
[deadlock-qol-mods](https://github.com/luxus/deadlock-qol-mods) (`af90240`).
The script and styles in this addon stay a clean-room rewrite.

## [1.0.0] - 2026-11-21

First public release.

### Added

- Rank badge and Statlocker and DeadChaps buttons on profile pages, profile cards and the post-game scoreboard.
- A "Profile Links" tab in [CompLock HUD++](https://deadlockconfig.com/), or an ADDONS window in the Esc menu without HUD++.
- One "Profile links" toggle (on by default). "Reset Profile Links" on the right of the settings foot restores it.
- Toggle rows match HUD++: a compact line with the description as a tooltip on hover.
- Addon Settings library 1.1.3 (BUILD 5), vendored from Improved Quickbuy.

[Unreleased]: https://github.com/luxus/deadlock-profile-links/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/luxus/deadlock-profile-links/releases/tag/v1.0.1
[1.0.0]: https://github.com/luxus/deadlock-profile-links/releases/tag/v1.0.0
