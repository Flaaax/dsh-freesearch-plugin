# 架构

## 数据流

```text
DSH 原生 web_search
  → ctx.web.search()
  → minimal-free-search provider
  → 首选 adapter
  → 固定 HTTPS 搜索端点
  → 有界 HTML
  → 引擎解析器
  → URL 校验、文本清洗、去重
  → WebSearchResult
```

插件不注册工具。`web_search` 的参数 Schema、多个查询的合并、模型可见渲染和不可信内容提示仍由 `@deepseek-ai/dsh-tool-web` 所有。

## 模块职责

- `lib/index.js`：Cordis 入口、Config Schema、provider 注册和 settings 生命周期。
- `lib/client.js`：构建产物，Plugins 页面配置表单的 client 面（`window.__ModuleLoader__.load` 包装的浏览器 bundle）。
- `src/client/settings-card.jsx`：React 配置卡片，渲染 7 个 volatile 字段并写入共享配置表单。
- `src/client/index.jsx`：client 入口，把配置卡片注册到 `plugins.bundle.config` slot。
- `scripts/build.mjs`：esbuild 构建 client bundle（external `react` 与 `@deepseek-ai/*`）。
- `lib/provider.js`：查询校验、配置校验、串行回退和 provider 选择控制器。
- `lib/network.js`：固定端点、查询编码、超时、重定向、响应类型和字节上限。
- `lib/normalize.js`：HTML 文本清洗、结果 URL 校验和去重。
- `lib/engines/bing.js`：Bing HTML 解析。
- `lib/engines/duckduckgo.js`：DuckDuckGo Lite HTML 解析。
- `lib/errors.js`：稳定、简短且不泄露响应正文的错误类型。

## Provider 生命周期

`ctx.web.registerSearchProvider()` 的 disposer 由 Cordis effect 所有。插件同时持有生命周期 `AbortController`；dispose 时先尝试恢复官方 provider，再中止在途请求并注销 provider。真实 DSH 退出时可能先停止 settings 服务，因此 dispose 恢复只是尽力而为；可靠卸载边界是先在运行中的 Profile 关闭 `takeover` 并确认持久恢复。

选择通过公开 `settings.describe()` 读取，通过 `settings.mutate('web', …)` 写入。插件不读取 `ctx.web` 的私有配置字段。写入串行化，避免配置编辑互相覆盖。

`takeover` 是 Plugins 页面配置表单（由本插件的 client 面提供，字段来自 `Config` Schema）中的撤销入口：

- `true`：仅从未设置或 `deepseek-official` 接管；
- `false`：仅从 `minimal-free-search` 恢复到 `deepseek-official`；
- 其他 provider 始终视为用户显式选择。

## 回退语义

两个引擎永不并发。网络失败、超时、非成功 HTTP、非法响应、反爬、结构变化和零可用结果可以触发一次备用引擎调用。调用方取消或插件 dispose 不触发回退。

实际成功引擎写入本地 DSH 日志，不扩展 `WebSearchResult` 的官方字段，也不把内部堆栈返回给模型。
