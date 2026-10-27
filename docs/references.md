# 参考资料

## DeepSeek Harness

- 仓库：<https://github.com/deepseek-ai/deepseek-harness.git>
- 版本标签：`dsh-v0.2.1-rc.3`
- commit：`1f81c047fc48fa190a683e469daa699857e9afe8`
- 本机版本：`dsh 0.2.1-rc.3`
- 查看过的关键文件：
  - `packages/web/web/src/types.ts`
  - `packages/web/web/src/index.ts`
  - `packages/web/web/README.md`
  - `packages/web/tool-web/src/search.ts`
  - `packages/web/tool-web/src/trust.ts`
  - `packages/web/web-search-deepseek/src/index.ts`
  - `packages/web/web-search-deepseek/src/provider.ts`
  - `packages/settings/settings/src/index.ts`
  - `packages/boot/config-editor/src/index.ts`
  - `packages/boot/plugin-manager/src/operations.ts`
  - `packages/bundle/base/cordis.patch.yml`
- 结论：`ctx.web` 公开注册、选择和执行 search/fetch provider；`web_search` 工具由 DSH 核心注册并负责不可信外部内容提示。provider 选择是 `web` 条目的 volatile 配置，公开的持久修改路径是 `settings.mutate()`。
- 代码来源：未复制或实质改编代码；当前仅依据公开接口、生命周期和行为规格设计。

## dsh-free-search

- 仓库：<https://github.com/DDDMUC/dsh-free-search.git>
- 标签：`v0.9.16`
- commit：`a5843427e894b365c6bd622f4f9a3f7a889fe577`
- 查看过的关键文件：
  - `README.md`
  - `package.json`
  - `cordis.patch.yml`
  - `lib/index.js`
- 结论：该插件展示了 `registerSearchProvider()` 与 `settings.mutate("web", …)` 的兼容接法，也明确记录了持久 provider 选择在插件移除后可能悬空的问题。它还包含超出本项目第一版范围的 fetch provider、设置桥、凭据、多引擎和附加工具。
- 代码来源：未复制或实质改编代码；不执行该仓库的脚本，也不安装或启用该插件。

## 本机说明

- 文件：`E:\Projects\Python\PythonWorkspace\Project_DeepSeekHarness\README.md`
- 结论：本机 DSH 安装于 `C:\Users\TempAccount\AppData\Local\Programs\DeepSeek Harness`，开发验证使用隔离的 `plugin-dev` Profile，未经授权不修改 `desktop` Profile。
