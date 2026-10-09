/**
 * wordCardSpeech — 朗读 for word cards: the word itself and its example
 * sentences.
 *
 * Reuses the reader's ReadAloudController (Web Speech API — the host's
 * speechSynthesis, i.e. free offline system voices): a word card is just a
 * tiny segment list — one segment for the word, one segment per example
 * sentence for 连读例句. The controller owns playback; this module owns the
 * word-card specifics:
 *   - the word speaks in the language of its OWN script (its lookup's
 *     targetLang is the translation side, not the word),
 *   - example sentences are read in display order (per-sense first, then
 *     card-level), original text only — translations stay on the page,
 *   - toggle semantics for the two detail buttons: the running kind again =
 *     stop, the other kind = switch.
 *
 * Voice/rate reuse the reader's `readAloud.voice` / `readAloud.rate` prefs;
 * the controller falls back to any voice matching the word's language prefix
 * when the preferred name does not fit.
 *
 * @module ui/wordCardSpeech
 */

import { getPref } from "../utils/prefs";
import { safeDebug } from "../utils/logger";
import {
  ReadAloudController,
  type ReadAloudSegment,
} from "../core/readAloud/readAloudController";
import type { DictionaryCardContent } from "../core/translation/types";

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for tests)
// ─────────────────────────────────────────────────────────────────────────────

export type SpeechKind = "word" | "examples";

/** CJK characters anywhere in the word → it reads with a Chinese voice. */
export function isChineseWord(word: string): boolean {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(word || "");
}

/** BCP-47 language prefix for the word's own script (voice selection). */
export function speechLangFor(word: string): string {
  return isChineseWord(word) ? "zh" : "en";
}

/**
 * Example sentences to read, in display order (per-sense examples first, then
 * card-level pairs), original text only. Empty when the card has none — the
 * caller hides the button.
 */
export function exampleSegments(content: DictionaryCardContent): string[] {
  const out: string[] = [];
  for (const sense of content?.senses ?? []) {
    const text = (sense?.example || "").replace(/\s+/g, " ").trim();
    if (text) out.push(text);
  }
  for (const pair of content?.examples ?? []) {
    const text = (pair?.text || "").replace(/\s+/g, " ").trim();
    if (text) out.push(text);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Speaker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One speaker per word-cards tab. A fresh ReadAloudController per play (the
 * bilingual view's pattern) because the controller bakes voice/lang/rate in
 * at construction, and the next word may need a different language or the
 * prefs may have changed.
 */
export class WordCardSpeaker {
  private controller: ReadAloudController | null = null;
  private active: SpeechKind | null = null;

  constructor(
    /** The window whose speechSynthesis drives playback. */
    private getWin: () => any | null,
    /** Fired on every playback state change (button label updates). */
    private onChange: () => void,
  ) {}

  isSupported(): boolean {
    try {
      return !!this.getWin()?.speechSynthesis;
    } catch {
      return false;
    }
  }

  /** The kind currently playing, or null when idle. */
  playingKind(): SpeechKind | null {
    return this.active;
  }

  /** Read the word itself. The running kind again stops; never throws. */
  speakWord(word: string): void {
    const clean = (word || "").replace(/\s+/g, " ").trim();
    this.toggle("word", clean, clean ? [clean] : []);
  }

  /** Read the card's example sentences in display order. Never throws. */
  speakExamples(word: string, content: DictionaryCardContent): void {
    this.toggle("examples", word, exampleSegments(content));
  }

  /** Stop playback (second click or tab teardown). Never throws. */
  stop(): void {
    this.active = null;
    try {
      this.controller?.stop();
    } catch {
      /* the controller already logs its own speak/cancel failures */
    }
    this.controller = null;
    this.onChange();
  }

  /**
   * Shared toggle: an empty segment list is a no-op, the running kind stops,
   * anything else (re)starts.
   */
  private toggle(kind: SpeechKind, word: string, texts: string[]): void {
    try {
      if (texts.length === 0 || !this.isSupported()) return;
      if (this.active === kind && this.controller?.getState().playing) {
        this.stop();
        return;
      }
      // Active moves BEFORE the replaced controller stops: its onEnded fires
      // synchronously from stop() and must not clear the new kind (its guard
      // compares against its own captured kind).
      this.active = kind;
      this.controller?.stop();
      const voicePref = String(getPref("readAloud.voice") || "");
      this.controller = new ReadAloudController({
        getWin: this.getWin,
        rate: Number(getPref("readAloud.rate")) || 1,
        lang: speechLangFor(word),
        ...(voicePref ? { voiceName: voicePref } : {}),
        onState: () => this.onChange(),
        onEnded: () => {
          if (this.active === kind) this.active = null;
          this.onChange();
        },
      });
      this.controller.play(
        texts.map((text) => ({ text })) as ReadAloudSegment[],
      );
      this.onChange();
    } catch (e) {
      safeDebug("[Z-Transplit] wordCardSpeech toggle failed: " + e);
      this.active = null;
      this.controller = null;
    }
  }
}
