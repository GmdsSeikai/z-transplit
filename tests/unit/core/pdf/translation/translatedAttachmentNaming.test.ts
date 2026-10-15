/**
 * 译文附件命名辅助函数的契约（translatedAttachment.ts）。
 *
 * 两条硬约束在这里钉死：
 *   1. 磁盘文件基名 = Translated_<原基名>——Zotero 默认按父条目命名会让
 *      原文与译文两个 PDF 在 storage 里同名，前缀消除歧义；
 *   2. 显示标题必须保持 `Translated (<lang>) (` 开头——splitViewCleanup 的
 *      TRANSLATION_TITLE_RE 与条目菜单的内联正则以 `^` 锚定识别译文附件
 *      （查重 + 分屏复用），标题换格式必须先过这一关。
 */
import { describe, expect, it } from "vitest";

import {
  translatedFileBaseName,
  translatedSourceBaseName,
  translatedTitleWithSource,
} from "../../../../../src/core/pdf/translation/translatedAttachment";

describe("translatedSourceBaseName — 原文件基名", () => {
  it("取附件文件名并去掉 .pdf 扩展名", () => {
    expect(translatedSourceBaseName({ attachmentFilename: "paper.pdf" })).toBe(
      "paper",
    );
    expect(
      translatedSourceBaseName({ attachmentFilename: "Paper.PDF" }),
    ).toBe("Paper");
  });

  it("attachmentFilename 缺失时回退到文件路径（正反斜杠均可）", () => {
    expect(
      translatedSourceBaseName({ getFilePath: () => "C:\\lib\\storage\\a b.pdf" }),
    ).toBe("a b");
    expect(
      translatedSourceBaseName({ getFilePath: () => "/data/storage/x.pdf" }),
    ).toBe("x");
  });

  it("无扩展名、空值或空基名时给常量兜底", () => {
    expect(translatedSourceBaseName({ attachmentFilename: "noext" })).toBe(
      "noext",
    );
    expect(translatedSourceBaseName({ attachmentFilename: "  " })).toBe("pdf");
    expect(translatedSourceBaseName(undefined)).toBe("pdf");
    expect(translatedSourceBaseName({})).toBe("pdf");
  });
});

describe("translatedFileBaseName — 译文磁盘文件基名", () => {
  it("原名前加 Translated_ 前缀", () => {
    expect(translatedFileBaseName({ attachmentFilename: "paper.pdf" })).toBe(
      "Translated_paper",
    );
    expect(
      translatedFileBaseName({ attachmentFilename: "a b (2024).PDF" }),
    ).toBe("Translated_a b (2024)");
  });
});

describe("translatedTitleWithSource — 附件标题", () => {
  const RECOGNITION_RE = /^(译文|Translated)\s*\(/i;

  it("格式为 Translated (<lang>) · <原基名>", () => {
    expect(translatedTitleWithSource("zh-CN", "paper")).toBe(
      "Translated (zh-CN) · paper",
    );
  });

  it("保持译文识别正则命中（查重与分屏复用的兼容契约）", () => {
    for (const lang of ["zh-CN", "en-US", "ja"]) {
      expect(RECOGNITION_RE.test(translatedTitleWithSource(lang, "paper"))).toBe(
        true,
      );
    }
  });
});
