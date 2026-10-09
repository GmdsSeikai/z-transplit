# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.5.0] - 2026-10-09

### Added

- Live selection sync in the reader translate pane. Zotero's official
  「renderTextSelectionPopup」 reader event (one shared listener per process,
  fanned out to panes by item identity) re-reads the selection about 250 ms
  after the user completes a selection, so the pane follows the mouse without
  a manual 「Refresh selection」 click. A re-fire for an unchanged selection is
  a no-op — no duplicate requests, no copy-state resets.
- An 「Auto translate」 checkbox in the pane's language bar, bound to the
  existing `translate.auto` preference. Turning it on translates the pending
  selection immediately; combined with live sync, a selection produces a
  translation with zero clicks.
- Every bilingual / read-aloud control is now a button. The presentation mode
  (上下对照 interleave / 仅译文 translation-only) moved from a dropdown to a
  pair of buttons whose active highlight is synced with the session's actual
  mode; the bilingual toggle, mode buttons, and read-aloud buttons share one
  style, with active states in the brand crimson `#b5343a` — same family as
  the pane's primary action and the word-card chips.
- Brand-colored reader-pane icons. The translate section's header and sidenav
  icons adopt a 文/A swap motif in the logo's palette (ink = source, crimson =
  translation), replacing the single-color outline glyphs. Zotero switches
  between light and dark variants via `registerSection`'s `darkIcon`, so the
  icons no longer rely on `currentColor`. The QA S7 rule accepts an
  explicitly colored UI icon when a paired `-dark.svg` companion exists.
- A Java runtime install/repair entry point in the settings pane (PDF
  split-screen translation → Java runtime): a status line shows the detected
  state (plugin-managed portable runtime with version, system Java, or not
  found), and 「Install / repair…」 runs the same progress-window install as
  the missing-Java dialog — reachable at any time, without having to fail a
  translation first. The pane talks to the plugin main bundle through a new
  `Zotero.ZTransplit.java` surface (`getStatus` / `install`); when the bundle
  is not loaded the pane says so instead of failing silently.

### Fixed

- The reader translate pane no longer collapses when the sidebar is dragged
  narrow. The pane (and the bilingual control bar) keep a readable minimum
  width (~248 px); below that the item pane's scroll container shows a
  horizontal scrollbar instead of squeezing the right-hand controls out of
  view, and the language bar wraps.
- The Word Cards tab now fills its container and no longer reflows when a
  card is selected. The tab root is a child of Zotero's `<tab-content>`, a
  flex-row XUL element, so as a plain flex item it was content-sized — on a
  2560 px window the page measured ~1030 px and hugged the left edge, and
  every tile click re-measured the (different) detail content and resized the
  whole page. The root now takes `flex: 1 1 auto; width: 100%`, and selecting
  a card only toggles the tiles' highlight and rebuilds the detail column —
  the grid keeps its DOM, so focus and scroll position survive the click
  (verified on a real Zotero 10.0.3: root 1032→2560 px on open, unchanged on
  selection).
- Opening the Word Cards tab recovers from a failed `Zotero_Tabs.add()`.
  Zotero's add() appends the container and registers the tab before it
  selects it, so anything throwing in between (its own `_update` icon read or
  another plugin's tab observer) left the tab registered but unselected —
  the first click appeared dead and only the second one got in. The open
  path now resolves the container by id and selects the tab itself whenever
  add() did not complete, so a single click always lands on the page.

- The "missing Java → offer install" classification no longer misses real
  failures. The two pipeline catch sites now consult the structured
  `PdfParseError.reason` first (`isJavaMissingCause`) instead of regex-matching
  the message text, and the signature table adds the shells such errors
  actually arrive in: the health-preflight shell ("Java 不可用：…" /
  "Java unavailable: …"), the `java -version failed` fallback, and the zh-CN
  too-old wording ("…需要 Java 11+"). Previously a failed install that left a
  broken managed runtime could route every later attempt to a generic error —
  the install dialog never reappeared and no manual entry point existed.

## [1.4.0] - 2026-10-04

### Added

- Interruption-safe managed JRE installation. When the plugin downloads its
  bundled Temurin JRE for PDF parsing:
  - The downloaded archive is verified against the official Adoptium SHA-256
    checksum and cached. A retry after a failed or interrupted install reuses
    the verified archive and skips the ~45 MB download entirely.
  - Extraction runs in a staging directory and must pass a `java -version`
    probe before being atomically moved into place, so a process killed
    mid-extract can never leave a half-written runtime that is later served
    as valid.
  - A cached but broken managed JRE is detected by probe at three entry
    points (`downloadJRE`, `getJavaStatus`, `checkHealth`), discarded
    automatically, and on the parse path the system Java is used as an
    immediate fallback (self-healing).
  - Retries while offline reuse the locally recorded checksum when the
    Adoptium metadata API is unreachable; a new upstream patch release
    invalidates the cached archive automatically.
  - A checksum mismatch on download now fails fast with a clear error and
    discards the archive instead of extracting corrupt data.
- Managed JRE discovery also understands the macOS bundle layout
  (`jdk-*/Contents/Home/bin/java`).
- A unit test suite for the installer (8 scenarios) drives the real
  `JavaRuntimeManager` against a faked host boundary (in-memory file system,
  fake `nsIProcess` dispatch, fake HTTP) — covering fresh install, interrupted
  extraction with download-skip on retry, checksum mismatch, upstream patch
  refresh, offline reuse, self-healing, status fallback, and the macOS layout.

### Fixed

- A truncated JRE extraction (for example Zotero killed while unpacking) no
  longer poisons every later parse with cryptic JVM errors: the broken
  runtime is discarded and reinstalled on the next attempt.

### Changed

- License corrected from MIT to AGPL-3.0-only, matching Zotero itself.
  `LICENSE` now carries the full AGPL-3.0 text; package metadata, README
  badges, and the bundled JAR provenance manifests are updated accordingly.

## [1.3.0] - 2026-09-30

### Added

- Sibling-repo feedback round: the Bing web translation engine is directly
  selectable, with rate-limit backoff plus network-zone routing and guard
  mechanisms.

## [1.2.0] - 2026-09-30

### Added

- Original-text removal: translated paragraphs are genuinely deleted from
  the page content stream (replacing the white-mask approach); text inside
  image regions is excluded from translation as a whole.
- Real-machine QA rig expansion (probe commands, screenshot scripts, reading
  fixtures) and refreshed Chinese UI screenshots.

### Changed

- Parse errors are classified by HTTP status code with dedicated messages;
  unified dialog helpers; batch-translation progress is throttled by step.

Releases before 1.2.0 predate this changelog and are not backfilled.

[1.5.0]: https://github.com/Liozhang/z-transplit/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/Liozhang/z-transplit/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Liozhang/z-transplit/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Liozhang/z-transplit/compare/v1.1.0...v1.2.0
