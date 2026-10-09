#!/usr/bin/env node
/**
 * 从 CHANGELOG.md 提取 package.json 当前版本对应的段落，输出到标准输出。
 *
 * 用途：zotero-plugin-scaffold 的 `release` 命令在 release.changelog 未配置时
 * 会用 git 提交信息自动生成 GitHub 发布说明——本仓库的提交信息是中文，不符合
 * 「发布说明使用纯英文」的约定。把 zotero-plugin.config.ts 的
 * release.changelog 指到本脚本后，发布说明一律取自手工维护的 CHANGELOG.md
 * 段落（英文），不再由提交信息生成。
 *
 * 段落边界：从 `## [版本]` 行起，到下一个 `## [` 标题或文末的
 * `[x.y.z]: https://…` 链接定义之前为止。
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const changelogPath = new URL("../CHANGELOG.md", import.meta.url);
const text = readFileSync(changelogPath, "utf8");

const heading = `## [${version}]`;
const start = text.indexOf(heading);
if (start === -1) {
  console.error(`release-notes: CHANGELOG.md has no section for version ${version}`);
  process.exit(1);
}

const rest = text.slice(text.indexOf("\n", start) + 1);
let end = rest.search(/^## \[/m);
const linkDefs = rest.search(/^\[\d+\.\d+\.[^\]]*\]:\s*http/m);
if (linkDefs !== -1 && (end === -1 || linkDefs < end)) {
  end = linkDefs;
}
const section = (end === -1 ? rest : rest.slice(0, end)).trim();

if (!section) {
  console.error(`release-notes: CHANGELOG.md section for ${version} is empty`);
  process.exit(1);
}
console.log(section);
