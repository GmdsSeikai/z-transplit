# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.6.0] - 2026-10-09

### Added

- 词卡支持朗读。词卡标签页的详情区新增「朗读」按钮（用系统语音读单词）
  和「朗读例句」按钮（按显示顺序连读例句原文，译文不读，仅在有例句的词卡
  上显示）。复用阅读视图的朗读基础设施（Web Speech API），沿用
  `readAloud.rate` / `readAloud.voice` 偏好设置，并按单词自身的文字选择中
  文或英文音色（查询记录里的目标语言是译文一侧的语言，不代表单词本身）。
  播放中再次点击同一按钮即停止，点击另一按钮直接切换；关闭词卡标签页会自
  动停止播放。当前环境缺少语音接口时不渲染这两个按钮。
- 解析组件按需下载与国内镜像择优。默认构建改为精简版：XPI 不再内置 24MB 的
  OpenDataLoader 解析组件，体积从约 27MB 缩到约 8MB；首次解析时插件按随包
  分发的 PROVENANCE 指纹（版本与 SHA-256）自动下载该组件，并发区间探测全部
  来源后从最快者整包下载，单来源失败或校验不符自动降级到下一个。来源实测
  （2026-10，境内直连）：阿里云 PyPI 镜像、清华 PyPI 镜像、PyPI 官方源、
  GitHub Release（全球兜底）。Maven Central 没有该构件，不作为来源。下载
  过程经进度窗口可见，落地副本逐字节校验后复用，损坏或随插件升级过期时自动
  重新获取。下载失败时错误提示为「检查网络后重试」而非误导性的「重新安装
  插件」。设置环境变量 `ZTRANSPLIT_FULL_XPI=1` 可构建内置组件的完整版安装
  包，供离线环境分发。

### Fixed

- 打包安装（从 XPI 文件安装）下 PDF 解析必然报「OpenDataLoader 解析组件缺失
  （未找到 jar 文件），请重新安装插件」。原因：Zotero 保持插件为打包的
  .xpi（zip 压缩包），捆绑的 jar 在压缩包内部，而 `java -jar` 需要磁盘上的
  真实文件，原有查找逻辑的所有磁盘候选全部落空；提示「重新安装插件」又无法
  解决问题——重装后仍是打包安装。现在 `getJarPath` 在磁盘探测全部落空时，
  用平台自带的 `nsIZipReader` 把 `core/pdf/lib/*.jar` 解压到
  {数据目录}/ztransplit/lib/，按包内 PROVENANCE*.json 声明的 SHA-256 逐字节
  校验后返回；已落地的副本经哈希核对后复用，损坏或随插件升级过期时自动重新
  解压。解压经暂存文件改名落地，中断不会留下半截文件。该兜底同时覆盖第二个
  捆绑组件 ztransplit-region-text-remover.jar。
- 配置目录扫描不再把 `<插件ID>.xpi` 文件误当作解包目录（旧代码会拼出
  `….xpi\core\pdf\lib\…` 这样的不可能路径）。
- 错误提示区分两类组件故障：文件确实缺失仍提示重新安装；文件存在但 Java
  无法访问（杀毒软件隔离、权限、路径非法）改用新文案
  「odl-error-jar-unreadable」引导检查隔离区与权限。仅提到 "jar" 字样的
  java.lang.* 堆栈不再被误写成「组件缺失」。顺带补上代码引用了却从未定义的
  FTL 键 `err-jar-load`（旧构建在该分支会把键名本身显示给用户）。
- 划词翻译面板读到过期的选区读数。划选长句或段落后，面板可能仍读到上一次
  单词选区的读数：自动翻译与「刷新选区」都把旧单词又查了一遍——不出现
  「正在翻译」，也不报错，句子翻译从未发起，上一张单词卡片被重新显示。现在
  选区弹窗事件自带的选区文本（用户在弹窗里看到的文本）优先于
  `_selectionRanges` 重读，两者不一致时以弹窗为准并输出调试日志；点空白清除
  选区后残留的弹窗文本不会复活已清除的选区。顺带加固：宿主窗口已关闭的面板
  不再响应阅读器事件。

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

[1.6.0]: https://github.com/Liozhang/z-transplit/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/Liozhang/z-transplit/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/Liozhang/z-transplit/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Liozhang/z-transplit/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Liozhang/z-transplit/compare/v1.1.0...v1.2.0
