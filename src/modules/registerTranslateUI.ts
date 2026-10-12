/**
 * registerTranslateUI — item-pane section registration for the translate pane.
 *
 * Loaded dynamically by src/hooks.ts#onStartup (inside a try/catch), so a
 * failure here can never take the data layer down.
 *
 * Registration is capability-driven, exactly like leadero's
 * src/modules/readerSections.ts translate section (which guarded on
 * `getPref('translate.enabled') && checkFeatureReadiness('translation', …).ready`):
 *
 *   - `getPref("translate.enabled")` must be on, AND
 *   - `checkTranslationReadiness()` must report ready (engine + credentials).
 *
 * When either is false the section is simply not registered: a pane that fails
 * on first use is worse than no pane. The trade-off is that flipping the pref
 * (or configuring an engine) needs a Zotero restart to show the pane — recorded
 * as an open question, because Zotero 7 has no "re-register section" event.
 */

import { config } from "../../package.json";
import { getPref } from "../utils/prefs";
import { getLocaleID } from "../utils/locale";
import { safeDebug } from "../utils/logger";
import { checkTranslationReadiness } from "../core/translation/featureReadiness";
import { mountTranslatePane } from "../ui/translatePane";

/** Pane ID registered with Zotero.ItemPaneManager. */
export const TRANSLATE_PANE_ID = "ztransplit-translate";

/** Re-entrancy latch (same reason as src/hooks.ts#onStartup). */
let registered = false;

let toolbarRegistered = false;
let toolbarModule: any = null;

/**
 * This addon's ID (package.json config), with a runtime fallback to
 * `addon.data.config.addonID` — same resolution order as
 * src/core/pdf/splitview/splitViewFactory.ts#addonID.
 */
function addonID(): string {
  try {
    const fromData = (globalThis as any)?.addon?.data?.config?.addonID;
    if (fromData) return fromData;
  } catch {
    /* no addon global (node) — fall through to the config import */
  }
  return config.addonID;
}

/** L10n ids as Zotero's Fluent overlay sees them (messages are build-prefixed). */
const HEADER_L10N_ID = getLocaleID("pane-translate");
const SIDENAV_L10N_ID = getLocaleID("pane-translate-sidenav");

/**
 * Register the 「翻译」 item-pane section.
 *
 * Returns true when the section is registered, false when registration was
 * skipped (pref off / engine not ready / host API missing) — the reason is
 * always logged so a missing pane is diagnosable rather than silent.
 */
export async function registerTranslateUI(): Promise<boolean> {
  if (registered) {
    safeDebug("[Z-Transplit] registerTranslateUI: already registered, skipping");
    return true;
  }

  const mgr = (globalThis as any)?.Zotero?.ItemPaneManager;
  if (!mgr || typeof mgr.registerSection !== "function") {
    safeDebug(
      "[Z-Transplit] registerTranslateUI: Zotero.ItemPaneManager unavailable — section not registered",
    );
    return false;
  }

  if (!getPref("translate.enabled")) {
    safeDebug(
      "[Z-Transplit] registerTranslateUI: translate.enabled is off — section not registered",
    );
    return false;
  }

  const readiness = checkTranslationReadiness();
  if (!readiness.ready) {
    const missing = readiness.missing.map((m) => m.prefKey).join(", ");
    safeDebug(
      `[Z-Transplit] registerTranslateUI: translation engine not ready (${missing || "unknown"}) — section not registered`,
    );
    return false;
  }

  // One live pane per section body; destroy() aborts in-flight requests and
  // removes listeners/DOM.
  const panes = new WeakMap<HTMLElement, { destroy(): void }>();

  try {
    const paneID = mgr.registerSection({
      paneID: TRANSLATE_PANE_ID,
      pluginID: addonID(),
      // 图标为「文 / A 互换」母题的品牌配色版（墨 = 原文，绯红 = 翻译/互换），
      // 显式配色：Zotero 按 background-image 绘制插件 section 图标，并提供
      // darkIcon 双变体（prefers-color-scheme 切换），因此不需要 currentColor
      // 反色（QA S7 已同步允许「显式配色 + 配对 -dark 变体」）。
      header: {
        l10nID: HEADER_L10N_ID,
        icon: "chrome://ztransplit/content/icons/translate.svg",
        darkIcon: "chrome://ztransplit/content/icons/translate-dark.svg",
      },
      sidenav: {
        l10nID: SIDENAV_L10N_ID,
        icon: "chrome://ztransplit/content/icons/translate-20.svg",
        darkIcon: "chrome://ztransplit/content/icons/translate-20-dark.svg",
      },
      onItemChange: ({
        tabType,
        setEnabled,
      }: {
        tabType: string;
        setEnabled: (enabled: boolean) => void;
      }) => {
        // Reader only — the source text comes from the PDF reader's selection.
        setEnabled(tabType === "reader");
      },
      onRender: ({
        doc,
        body,
        item,
      }: {
        doc: Document;
        body: HTMLElement;
        item: any;
      }) => {
        // mountTranslatePane is idempotent per body: when Zotero re-renders the
        // section for another item in the same tab, the existing pane is
        // refreshed (re-reads the selection, honours translate.auto live)
        // instead of being duplicated.
        const handle = mountTranslatePane({
          doc,
          body,
          itemID: item?.id,
        });
        panes.set(body, handle);
        // Bilingual control block renders BELOW the translate pane root (the
        // pane mounts synchronously; this dynamic import appends afterwards);
        // its destroy is folded into the same per-body teardown.
        try {
          void import("../ui/bilingualControl").then((bc) => {
            const bcHandle = bc.mountBilingualControl({
              doc,
              body,
              itemID: item?.id,
            });
            const prev = panes.get(body);
            panes.set(body, {
              destroy() {
                try {
                  bcHandle.destroy();
                } catch {
                  /* best-effort */
                }
                prev?.destroy();
              },
            });
          });
        } catch (e) {
          safeDebug("[Z-Transplit] bilingualControl mount failed: " + e);
        }
      },
      onDestroy: ({ body }: { body: HTMLElement }) => {
        const handle = panes.get(body);
        handle?.destroy();
        panes.delete(body);
      },
    });

    if (typeof paneID !== "string") {
      safeDebug(
        "[Z-Transplit] registerTranslateUI: registerSection returned no pane ID",
      );
      return false;
    }

    registered = true;
    safeDebug(`[Z-Transplit] registerTranslateUI: section "${paneID}" registered`);
    if (!toolbarRegistered) {
      try {
        toolbarModule = await import("../ui/bilingualControl");
        toolbarModule.registerBilingualReaderToolbar?.();
        toolbarRegistered = true;
      } catch (e) {
        safeDebug("[Z-Transplit] bilingual toolbar register failed: " + e);
      }
    }
    return true;
  } catch (e) {
    safeDebug(`[Z-Transplit] registerTranslateUI: registration failed: ${e}`);
    return false;
  }
}

/**
 * Revoke the section (plugin shutdown / disable). Best-effort, mirroring
 * unregisterSplitViewMenu() in src/core/pdf/splitview/splitViewFactory.ts.
 *
 * Note the live panes' own teardown (abort + listener removal) happens in the
 * section's onDestroy hook, which Zotero fires when it drops the section.
 */
export function unregisterTranslateUI(): boolean {
  const mgr = (globalThis as any)?.Zotero?.ItemPaneManager;
  if (!mgr || typeof mgr.unregisterSection !== "function") return false;
  if (!registered) return false;
  try {
    const ok = mgr.unregisterSection(TRANSLATE_PANE_ID);
    registered = false;
    safeDebug(
      `[Z-Transplit] unregisterTranslateUI: section "${TRANSLATE_PANE_ID}" revoked (${ok})`,
    );
    if (toolbarRegistered && toolbarModule) {
      try {
        toolbarModule.unregisterBilingualReaderToolbar?.();
      } catch {
        /* best-effort */
      }
      toolbarModule = null;
      toolbarRegistered = false;
    }
    return true;
  } catch (e) {
    safeDebug(`[Z-Transplit] unregisterTranslateUI: failed: ${e}`);
    return false;
  }
}

export default registerTranslateUI;
