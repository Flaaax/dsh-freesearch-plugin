# DSH Minimal Free Search

DSH Minimal Free Search 是一个面向 DeepSeek Harness（DSH）的最小权限网页搜索插件。它只注册一个原生 `WebSearchProvider`，让 DSH 已有的 `web_search` 工具通过 Bing 或 DuckDuckGo Lite 返回候选网页，不需要搜索服务 API key。

当前版本面向 DSH Desktop `0.2.1-rc.3`。项目尚未发布到 npm；仓库 URL 安装也要等仓库实际创建后才可用。

## 第一版边界

插件提供：

- Bing 和 DuckDuckGo Lite 两个固定公开搜索入口；
- 默认 Bing，失败时串行回退到 DuckDuckGo；
- 标题、HTTP(S) URL 和简短摘要；
- 查询、结果数、超时、响应体和重定向限制；
- DSH 原生 provider 注册、选择、撤销和生命周期清理；
- Desktop 插件配置中的“启用搜索接管”开关。

插件不提供或修改：

- `web_fetch` provider 或网页正文抓取；
- 第三个搜索引擎、自定义 endpoint、代理、Cookie 或请求头；
- API key、凭据读取、文件读写、子进程、浏览器或 HTTP server；
- 自定义 Agent 工具、全局提示词、遥测、自动更新或缓存。

`web_search` 只返回候选网页。当前 Profile 的 `web_fetch` 是否可用由 DSH 原有 fetch provider 决定，也可以由 Agent 在已有终端权限下自行使用 PowerShell；这些能力不属于本插件。

## 为什么不需要 DeepSeek API key

插件直接访问 Bing 或 DuckDuckGo 的公开 HTML 搜索入口，不调用 DeepSeek Search API。免费不等于本地或私密：查询文本、市场、安全搜索参数和通用插件 User-Agent 会发送给实际使用的搜索引擎。插件不发送 Cookie、DSH 会话、工作区路径或本机凭据。

## 安装

### 本地目录

完全退出目标 DSH 进程后执行：

```powershell
dsh plugin --profile desktop add "E:\Projects\JavaScript\dsh-freesearch-plugin"
```

开发和验证应使用隔离 Profile：

```powershell
dsh plugin --profile plugin-dev add "E:\Projects\JavaScript\dsh-freesearch-plugin"
```

### GitHub URL

未来仓库公开后可使用以下形式；当前文档不声称该地址已经存在：

```powershell
dsh plugin --profile desktop add "https://github.com/<owner>/dsh-minimal-free-search.git#<tag>"
```

### npm

计划包名为 `dsh-minimal-free-search-plugin`，当前尚未发布。发布后才可使用：

```powershell
dsh plugin --profile desktop add dsh-minimal-free-search-plugin@<version>
```

安装 Desktop 插件后必须完全退出并重新启动 DeepSeek Harness，仅刷新页面不够。

## 配置

Desktop 中打开“插件”，找到 `dsh-minimal-free-search-plugin` 包并展开 `web-search-minimal-free` 行，点击进入配置。配置表单由本插件自带的 client 面（`src/client/settings-card.jsx`，构建为 `lib/client.js`）提供，字段来自 DSH 原生 `Config` Schema。

| 字段 | 默认值 | 限制 | 含义 |
|---|---:|---|---|
| `takeover` | `true` | 布尔值 | 启用或撤销本插件的 Search Provider 接管 |
| `preferredEngine` | `bing` | `bing` / `duckduckgo` | 首选搜索引擎 |
| `fallback` | `true` | 布尔值 | 首选失败后是否尝试另一个固定引擎 |
| `market` | `zh-CN` | `zh-CN` / `en-US` | 市场及请求语言 |
| `safeSearch` | `moderate` | `off` / `moderate` / `strict` | 安全搜索级别 |
| `timeoutMs` | `10000` | 1000–20000 | 每个引擎的总请求超时，单位毫秒 |
| `maxResults` | `5` | 1–10 | 单次查询最多返回的结果数 |

设置会通过 DSH 官方配置机制保存。插件不提供任意回退链，也不会并发请求两个引擎。

## Provider 接管规则

插件加载后注册 `minimal-free-search`：

- 当前 Search Provider 未设置或仍为官方默认 `deepseek-official`：切换到本插件；
- 当前是 `deepseek-search-api` 或其他第三方 provider：不抢占；
- 将 `takeover` 关闭并保存：仅当当前仍指向本插件时恢复 `deepseek-official`；
- 插件 dispose：尽力执行同样的条件恢复，但不把进程退出顺序当作卸载保障；
- `fetchProvider` 始终保持原值。

Desktop 的内置“启用新版 Web 搜索 API”开关不是通用 provider 选择器。它会同时切换官方 Search/Fetch provider；需要卸载本插件时应使用本插件配置中的 `takeover` 开关。

## 验证

查看插件条目：

```powershell
dsh plugin --profile plugin-dev list --depth 0
```

检查 Profile 可以正常合成：

```powershell
dsh --profile plugin-dev --dump-config
```

实际验证必须调用正式 `web_search` 工具路径，并确认日志包含 provider 接管和实际引擎信息。普通字符串中提到 `web_search` 不构成集成验证。详细记录见 [docs/verification.md](docs/verification.md)。

## 安全停用和卸载

### Desktop 推荐流程

1. 打开“插件”中的 `web-search-minimal-free` 配置。
2. 关闭 `takeover`（“启用搜索接管”）并保存。
3. 确认搜索 provider 已恢复；完全退出 Desktop。
4. 再执行卸载：

```powershell
dsh plugin --profile desktop remove dsh-minimal-free-search-plugin
```

正常关闭 DSH 时插件也会尝试恢复，但 DSH 的服务停止顺序不保证持久写入一定成功。可靠流程是先在运行中的 Desktop 关闭 `takeover` 并确认恢复，再卸载。不要在插件仍接管时直接离线删除其文件。

### plugin-dev 推荐流程

先通过插件配置关闭 `takeover`，启动一次 Profile 并确认已恢复官方 provider，再执行：

```powershell
dsh plugin --profile plugin-dev remove dsh-minimal-free-search-plugin
```

### 意外卸载后的恢复

如果插件已被删除，而 Profile 仍含 `searchProvider: minimal-free-search`，`web_search` 会报告 provider 未注册。首选恢复方式是：

1. 重新安装同一插件版本；
2. 启动 Desktop，在插件配置中关闭 `takeover` 并保存；
3. 完全退出 Desktop；
4. 再次卸载插件。

无法重新安装时，完全退出 Desktop，备份对应 Profile 的 `cordis.patch.yml`，只把 `web` 条目中的：

```yaml
searchProvider: minimal-free-search
```

改为：

```yaml
searchProvider: deepseek-official
```

保留同一 `web` 条目中的 `fetchProvider` 和所有其他字段，不要删除其他插件或 Profile 内容。Desktop 文件通常位于：

```text
C:\Users\<用户名>\.dsh\profiles\desktop\cordis.patch.yml
```

修改后完整重启 Desktop。也可打开内置“网页搜索”设置并切换官方模式，但该开关会同时改动 Fetch Provider，不适合作为首选恢复手段。

## 已知限制

- Bing 和 DuckDuckGo 的 HTML 页面不是稳定 API，可能限流、出现反爬页或改变结构。
- 插件不会访问搜索结果正文；摘要可能不完整或过时。
- 每个引擎最多请求一次；失败回退会把同一查询发送给第二个搜索引擎。
- 非正常崩溃后再离线卸载，provider 选择可能来不及恢复，需按上述流程修复。
- 第一版不提供自定义端点或 SearXNG；后续候选方向见 [docs/roadmap.md](docs/roadmap.md)。

## 开发

```powershell
npm install --ignore-scripts
npm test
$env:DSH_MINIMAL_SEARCH_LIVE='1'
npm run test:live
$env:DSH_MINIMAL_SEARCH_HOST_LIVE='1'
npm run test:host-live
```

默认测试只使用 fixture 和受控 fake transport。`test:live` 直接验证网络 provider；`test:host-live` 使用官方 DSH Host、Web service 和正式 `web_search` 工具路径。两者都只搜索固定的 `DeepSeek Harness`，不访问结果页面。

## 许可证与来源

本项目采用 MIT License。接口依据 DSH `0.2.1-rc.3` 官方源码；部分 HTML 解析思路改编自 MIT 许可的 `dsh-free-search v0.9.16`。详情见 [docs/references.md](docs/references.md) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
