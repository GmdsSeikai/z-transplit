# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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

[1.4.0]: https://github.com/Liozhang/z-transplit/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Liozhang/z-transplit/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Liozhang/z-transplit/compare/v1.1.0...v1.2.0
