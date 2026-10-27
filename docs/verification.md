# 验证记录

目标环境：Windows，DSH `0.2.1-rc.3`，Node.js `24.21.0`（DSH 内置运行时）。开发机独立 Node.js 单元测试运行时为 `v22.14.0`。

## 已完成

- `npm test`：31 项通过；覆盖解析器、网络限制、回退、abort、配置、生命周期、安全扫描和 `npm pack --dry-run`。
- `DSH_MINIMAL_SEARCH_LIVE=1 npm run test:live`：通过；固定查询 `DeepSeek Harness`，实际引擎为 Bing，返回 3 条结果，未访问结果页面。
- `DSH_MINIMAL_SEARCH_HOST_LIVE=1 npm run test:host-live`：通过；使用官方 `@deepseek-ai/dsh-web`、`@deepseek-ai/dsh-tools` 和 `@deepseek-ai/dsh-tool-web`，正式 `web_search` 工具返回真实结果，provider 为 `minimal-free-search`，输出包含 DSH 核心的不可信外部内容提示。
- `npm audit --omit=dev`：生产依赖 0 个漏洞。完整开发依赖树中的审计告警来自仅用于 Host smoke 的官方 DSH 测试依赖，不进入发布包。

## plugin-dev 集成

隔离 Profile `plugin-dev` 已完成以下验证：

1. 从项目绝对路径安装成功；插件列表和合成配置中各只有一个本插件条目。
2. 安装前为 `searchProvider: deepseek-official`、`fetchProvider: http`；加载插件后 Search 切换为 `minimal-free-search`，Fetch 始终保持 `http`。
3. 网络恢复后，真实 DSH 模型会话确实发出 `web_search` tool call，查询 `DeepSeek Harness` 并返回结果；未调用 `web_fetch`。
4. 将 Desktop 同源配置字段 `takeover` 设为 `false` 并启动 Profile 后，Search 持久恢复为 `deepseek-official`，Fetch 仍为 `http`。
5. 随后卸载成功，清除本插件配置 override 后无悬空 provider、无配置警告；原有 `dsh-backtrack-plugin` 和 `dsh-superpowers-plugin` 均保留。

真实进程退出曾观察到 dispose 尝试未能持久恢复，这与 settings 服务停止顺序有关。因此 fake harness 生命周期测试只证明控制器条件恢复逻辑，不代表退出时必然写盘；卸载验证以显式关闭 `takeover` 为准。

## 发布包检查

- 实际 `npm pack` 生成 18 个文件、约 19.8 kB 的 tarball。
- 包内仅有入口、运行时代码、bundle patch、许可证和文档；不含 `_references/`、测试、日志、Profile、临时文件或凭据。
- 解包后对 `lib/index.js` 执行独立 ESM import，要求导出 Cordis `apply` 入口。

未经用户授权，不对真实 `desktop` Profile 执行安装、停用、升级或卸载。
