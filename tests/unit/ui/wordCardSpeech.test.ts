/**
 * Word-card speech pure helper tests (speechLangFor / exampleSegments) —
 * no DOM, no Zotero. Importing the module is side-effect-free outside
 * Zotero: prefs.ts degrades to undefined reads and the ReadAloudController
 * is only constructed on play.
 */
import { describe, it, expect } from "vitest";
import {
  speechLangFor,
  exampleSegments,
} from "../../../src/ui/wordCardSpeech";
import type { DictionaryCardContent } from "../../../src/core/translation/types";

function card(overrides: Partial<DictionaryCardContent>): DictionaryCardContent {
  return {
    word: "capture",
    senses: [],
    source: "youdao",
    ...overrides,
  };
}

describe("speechLangFor", () => {
  it("maps CJK words to zh and Latin words to en", () => {
    expect(speechLangFor("大学")).toBe("zh");
    expect(speechLangFor("resonance")).toBe("en");
    expect(speechLangFor("")).toBe("en");
  });

  it("maps scripts to their own voices (internationalized cards)", () => {
    expect(speechLangFor("キャッシュ")).toBe("ja"); // kana beats Han → ja
    expect(speechLangFor("한국어")).toBe("ko"); // hangul
    expect(speechLangFor("словарь")).toBe("ru"); // Cyrillic
    expect(speechLangFor("λεξικό")).toBe("el"); // Greek
    expect(speechLangFor("قاموس")).toBe("ar"); // Arabic
    expect(speechLangFor("शब्दकोश")).toBe("hi"); // Devanagari
    expect(speechLangFor("พจนานุกรม")).toBe("th"); // Thai
    expect(speechLangFor("מילון")).toBe("he"); // Hebrew
  });
});

describe("exampleSegments", () => {
  it("reads per-sense examples before card-level pairs (display order)", () => {
    const segments = exampleSegments(
      card({
        senses: [
          { meaning: "捕获", example: "screen capture", exampleTranslation: "屏幕捕获" },
          { meaning: "夺取" },
        ],
        examples: [
          { text: "capture the moment", translation: "捕捉瞬间" },
        ],
      }),
    );
    expect(segments).toEqual(["screen capture", "capture the moment"]);
  });

  it("keeps only original text — translations stay on the page", () => {
    const segments = exampleSegments(
      card({
        senses: [{ meaning: "义", example: "an example", exampleTranslation: "译文" }],
      }),
    );
    expect(segments).toEqual(["an example"]);
  });

  it("drops blank examples and tolerates missing collections", () => {
    expect(exampleSegments(card({}))).toEqual([]);
    expect(
      exampleSegments(
        card({ senses: [{ meaning: "义", example: "   " }], examples: [] }),
      ),
    ).toEqual([]);
  });
});
