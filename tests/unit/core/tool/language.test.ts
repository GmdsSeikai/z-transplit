/**
 * getLanguageName — 注入词典/翻译提示词的语言友好名。
 *
 * 契约：精确 locale 命中；主子标签回退（pt-BR → Portuguese，经 pt）；未知
 * 代码原样透传（调用方依赖这一行为）。国际化后非前九种语言的用户同样应得到
 * 英语语言名，而不是原样透传的 locale 代码。
 */
import { describe, expect, it } from "vitest";
import { getLanguageName, LANGUAGE_NAME_MAP } from "../../../../src/core/tool/language";

describe("getLanguageName", () => {
  it("精确 locale 命中", () => {
    expect(getLanguageName("zh-CN")).toBe("Simplified Chinese");
    expect(getLanguageName("fr-FR")).toBe("French");
    expect(getLanguageName("ru-RU")).toBe("Russian");
  });

  it("主子标签回退：未列出的地区变体取基础语言名", () => {
    expect(getLanguageName("pt-BR")).toBe("Portuguese");
    expect(getLanguageName("pt")).toBe("Portuguese");
    expect(getLanguageName("de-AT")).toBe("German");
    expect(getLanguageName("nn-NO")).toBe("Norwegian");
  });

  it("大小写与空白容错", () => {
    expect(getLanguageName(" FR ")).toBe("French");
    expect(getLanguageName("fr_fr")).toBe("French");
  });

  it("未知代码原样透传", () => {
    expect(getLanguageName("xx-XX")).toBe("xx-XX");
    expect(getLanguageName("")).toBe("");
  });

  it("映射表按导出契约只读暴露", () => {
    expect(Object.keys(LANGUAGE_NAME_MAP).length).toBeGreaterThan(40);
  });
});
