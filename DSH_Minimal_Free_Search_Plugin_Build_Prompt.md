# 任务：为 DeepSeek Harness 开发最小权限的免费联网搜索插件

请在一个新的空白工作区中，从零设计、实现、测试并交付一个 DeepSeek Harness（DSH）原生插件，为 DSH 提供无需 API key 的基础网页搜索能力。

这个项目的重点不是复刻一个功能庞大的搜索平台，而是交付一个**容易审计、权限最小、默认安全、可重复安装**的第一版。第一版只解决“让 DSH 的原生 `web_search` 能通过免费公开搜索入口返回候选网页”这一件事。

暂定命名如下；如果当前工作区已经确定了其它名称，沿用现有名称并保持所有标识一致：

- 产品名：`DSH Minimal Free Search`
- 仓库名：`dsh-minimal-free-search`
- npm 包名：`dsh-minimal-free-search-plugin`
- Cordis row id：`web-search-minimal-free`
- Web search provider id：`minimal-free-search`

不要只给出方案或代码片段。请实际创建项目、初始化 Git、完成实现和自动化测试，并用本机 DSH 的隔离开发 Profile 进行可复现的集成验证。

## 开始前必须完成

1. 阅读并遵循当前工作区及其父目录中所有适用的 `AGENTS.md`。
2. 如果当前插件项目没有 `AGENTS.md`，创建它；如果已经存在，补充而不是覆盖。
3. 插件项目的 `AGENTS.md` 必须明确要求：凡涉及本机 DeepSeek Harness 的安装位置、版本、运行时、Profile 行为、插件安装和验证，必须先读取并遵循：

   ```text
   E:\Projects\Python\PythonWorkspace\Project_DeepSeekHarness\README.md
   ```

4. 不要把上述本机信息复制进新项目；使用跨工作区引用，避免以后过时。
5. 通过说明文件及只读命令重新确认本机 DSH 版本。当前已知版本是 `0.2.1-rc.3`，但不得仅凭本提示词沿用。
6. 核对当前 DSH 版本公开的 Cordis bundle、`ctx.web`、`WebSearchProvider`、provider 选择、settings 变更和 dispose 机制。优先读取官方源码、类型和本机实际安装内容，不要只根据第三方插件猜测接口。

## Git 与工作方式

如果当前目录还不是 Git 仓库，自行执行：

```powershell
git init -b main
```

然后：

- 创建适合 Node.js/DSH 插件的 `.gitignore`；
- 把 `_references/`、临时包、测试输出、日志、凭据和 DSH Profile 内容排除在版本控制之外；
- 在实现过程中使用 Git 做小步、语义清楚的提交；
- 每次提交前检查 diff，避免把临时文件、密钥或参考仓库提交进去；
- 不要推送远端、创建 GitHub 仓库、发布 npm 包或创建 PR，除非用户之后明确要求；
- 不要重写或删除用户已有的 Git 历史。

## 参考资料与引用仓库

可以按需把参考仓库拉取到当前工作区的 `_references/` 中。无需为了形式完整下载所有仓库；只拉取确实需要阅读的内容，并优先使用 shallow clone、partial clone 或 sparse checkout。

至少允许参考：

```text
_references/deepseek-harness
https://github.com/deepseek-ai/deepseek-harness.git

_references/dsh-free-search
https://github.com/DDDMUC/dsh-free-search.git
```

对 `dsh-free-search`，本任务已经静态审计过的基线是：

```text
tag: v0.9.16
commit: a5843427e894b365c6bd622f4f9a3f7a889fe577
```

如果拉取它，应 checkout 到上述固定 commit，除非用户明确要求评估更新版本。不要安装、启用或运行该参考插件，也不要执行其 `tools/` 脚本。它只用于理解以下内容：

- DSH `ctx.web.registerSearchProvider` 的接入形态；
- DSH 0.2.x provider 选择与运行时接管的兼容问题；
- Bing、DuckDuckGo 的请求和结果解析思路；
- timeout、abort、结果裁剪、失败回退和 untrusted-content 边界的测试案例；
- bundle patch 和包结构。

不要复制它的以下设计到第一版：

- `web_fetch` 接管；
- 无 SSRF 防护的 URL 抓取；
- 启动 Edge、Chrome 或其它外部进程；
- `--no-sandbox` 浏览器；
- HTTP settings bridge；
- 凭据读写；
- 自动更新或执行 `pnpm add ...@latest`；
- SQLite 正文缓存；
- research、platform、video、weather、domain search 等附加工具；
- 多个匿名服务的自动并发或全量回退；
- 付费搜索服务和 API key 配置。

创建 `docs/references.md`，记录每个实际参考仓库的：

- URL；
- commit hash；
- 查看过的关键文件；
- 得到的接口或行为结论；
- 是否复制或实质改编了代码。

## 许可证和代码来源

`dsh-free-search` 使用 MIT License。允许参考、复制和修改，但如果复制或实质性改编了任何代码，必须：

1. 保留适用的 MIT 版权与许可证文本；
2. 在 `THIRD_PARTY_NOTICES.md` 中列出仓库、文件、固定 commit 和改编内容；
3. 在相关源码中加入简洁、准确的 attribution；
4. 不得把同结构改写虚假描述为严格 clean-room implementation；
5. 核对所有其它实际复用内容的许可证后，再决定本项目是否采用 MIT License。

仅借鉴公开接口和行为规格、代码独立编写时，也要在 `docs/references.md` 诚实记录参考关系。

## 第一版产品目标

第一版只实现一个 DSH 原生网页搜索 provider，使 DSH 已有的 `web_search` 工具能够：

1. 接收查询文本和最大结果数；
2. 请求固定、公开、无需 API key 的搜索入口；
3. 返回规范化的标题、URL 和简短摘要；
4. 首选引擎失败时，按小型固定白名单回退；
5. 明确把搜索结果视为不可信外部数据；
6. 不接管或扩展 `web_fetch`；
7. 不需要用户配置凭据；
8. 安装到 DSH Profile 后，不需要修改 DSH 内置代码。

第一版只支持两个引擎：

- `bing`：默认首选；
- `duckduckgo`：失败回退，可根据实际稳定性在 HTML 与 Lite 入口中选择一个并固定实现。

不得在第一版增加第三个搜索引擎。某个入口在当前网络或当前页面结构下不可用时，应返回可诊断错误或回退，不得通过增加高权限机制绕过。

## 第一版配置边界

配置保持最小化，只允许以下字段；如果当前 DSH 的 schema 机制要求不同，可以调整表达形式，但不能扩大能力：

- `preferredEngine`：`bing` 或 `duckduckgo`，默认 `bing`；
- `fallback`：是否允许在首选引擎失败时尝试另一个固定引擎，默认 `true`；
- `market`：有限枚举，至少支持 `zh-CN` 和 `en-US`，默认 `zh-CN`；
- `safeSearch`：有限枚举，默认开启中等安全搜索；
- `timeoutMs`：有严格上下界的请求超时；
- `maxResults`：有严格上限的结果数。

不要支持：

- 任意 base URL；
- 任意自定义请求头；
- 代理账号或 Cookie；
- API key；
- 用户提供的 JavaScript、正则表达式或模板；
- 可编辑的无限回退链；
- 自动并发查询两个引擎。

第一版不需要设置页面。配置通过 DSH 官方插件配置机制完成，README 给出准确示例。不要为了图形界面引入 Client bundle、自建 HTTP API 或 DOM 注入。

## 开发前的可行性 spike

正式实现前，创建 `docs/feasibility.md`，用源码证据和最小原型回答：

1. 当前 DSH `0.2.1-rc.3` 中 `WebSearchProvider` 的准确接口、返回结构和 dispose 语义是什么？
2. provider 注册后，怎样使用公开 API 把 `web_search` 指向本插件？
3. 能否只在 provider 未设置或仍为官方默认 provider 时接管，而不覆盖用户显式选择？
4. provider 选择是否会持久写入 Profile？卸载或禁用插件时如何避免悬空 provider id？
5. 能否在完全不接管 `web_fetch` 的情况下正常使用本插件？
6. DSH 核心是否已经为 `web_search` 输出添加不可信内容边界？如果没有，provider 应在哪个公开层完成？
7. Desktop 与 `plugin-dev` Profile 是否使用同一 Host provider 机制？
8. abort、timeout 和插件 dispose 时正在进行的请求应如何终止？

优先方案是：

- bundle 只挂载本插件 row；
- Host 只注册一个 search provider；
- 仅当当前 search provider 为空或仍是 DSH 官方默认值时，使用公开 settings/provider API 切换到本插件；
- 如果用户已经显式选择其它 provider，只记录清楚的提示，不抢占；
- 插件 dispose 时，只有当前 provider 仍指向本插件时才尝试恢复原先值；
- README 明确记录安装、停用和卸载顺序，并提供只影响本插件的恢复检查。

不要未经验证就照搬参考插件的 provider 接管代码。如果公开 API 无法实现可靠、可恢复的一键启用，先输出证据和可接受降级方案，然后停止并询问用户；不得改用私有 API、修改 DSH 源码或偷偷留下悬空配置。

## 技术实现要求

- 使用现代 JavaScript，Node.js ESM；
- 优先直接提交可运行的 `.js`，不引入 TypeScript 编译步骤；
- 运行时尽量只使用 Node.js 内置能力和 DSH 必要 peer dependencies；
- 使用 DSH 原生 Cordis 插件体系；
- 提供正确的 `package.json`、`cordis.patch.yml` 和 ESM 入口；
- 通过 `dsh.bundle.patch` 声明 bundle patch；
- npm 文件白名单只包含运行所需代码、许可证、README 和必要文档；
- 不提供 `preinstall`、`install`、`postinstall` 或自动下载脚本；
- 不使用 `eval`、`new Function`、`node:vm`；
- 不导入或调用 `node:child_process`；
- 运行时不读写普通文件；
- 运行时不读取环境变量中的凭据；
- 不启动 HTTP server，不注册自定义 Web 路由；
- 不注册除 search provider 以外的新 Agent 工具；
- 不修改全局提示词、用户 `AGENTS.md`、DSH 内置文件或 OpenCode 配置；
- 不发送遥测、更新检查、版本探测、星标请求或与搜索无关的后台网络请求。

## 网络与数据安全要求

搜索请求必须满足：

- 只允许固定的 `https` 搜索端点；
- host、path 和请求方法由代码固定，用户输入只能进入经过编码的 query 参数或请求体字段；
- 不跟随到非白名单 origin；如实现重定向，逐跳重新验证协议和 host，并限制跳数；
- 严格限制查询长度、结果数、响应体大小、重定向次数和总超时；
- 支持 `AbortSignal`，取消后不得继续后台请求；
- 不发送 Cookie、本机标识、DSH 会话、工作区路径或其它不必要信息；
- User-Agent 使用通用、诚实的插件标识，不伪造已登录用户；
- 不请求搜索结果指向的网页；
- 不解析或执行搜索结果中的脚本；
- 结果 URL 只允许 `http`/`https`，丢弃 `javascript:`、`data:`、`file:` 等协议；
- 标题与摘要必须去除 HTML 标签、控制字符和伪造边界标记，并有长度上限；
- 搜索错误不得包含响应头、Cookie、完整页面或其它可能的敏感内容；
- README 明确说明查询会发送给所选搜索引擎，“免费”不等于“本地”或“私密”。

搜索 provider 不接受任意 URL，因此第一版本身不应存在 SSRF 入口。不要实现 DNS/IP 黑名单来为一个本来不需要的任意 URL 功能兜底。

## 解析和回退语义

- 为 Bing 和 DuckDuckGo 分别建立独立 adapter；
- 网络层、HTML 解析、结果规范化和 provider 编排分离；
- 解析器只处理保存的 fixture 字符串，不依赖浏览器或 DOM；
- 去重以规范化后的最终 URL 为主，但不要删除可能影响资源身份的普通 query 参数；
- 单个引擎只有在网络失败、超时、明确反爬页面、响应非法、解析失败或零结果时才允许回退；
- 用户取消请求不得触发回退；
- 不自动重试多次；如确有必要，每个引擎最多一次请求；
- 不并发查询两个引擎；
- 成功结果中记录实际使用的引擎，但不要把内部错误堆栈交给模型；
- 两个引擎都失败时，返回简短、可诊断且不泄露数据的错误。

不要声称抓取式搜索永远稳定。页面结构变化必须表现为测试失败或清晰错误，而不是返回错误解析的数据。

## 建议项目结构

可以根据官方 API 调整，但职责应保持清晰：

```text
.
├─ AGENTS.md
├─ package.json
├─ cordis.patch.yml
├─ README.md
├─ LICENSE
├─ THIRD_PARTY_NOTICES.md        # 仅在实际复用时需要
├─ lib/
│  ├─ index.js                   # Cordis 入口、provider 注册和生命周期
│  ├─ provider.js                # 编排、回退和结果契约
│  ├─ network.js                 # 固定端点、超时、大小限制和 abort
│  ├─ normalize.js               # 清洗、URL 校验和去重
│  └─ engines/
│     ├─ bing.js
│     └─ duckduckgo.js
├─ test/
│  ├─ fixtures/
│  ├─ manifest.test.mjs
│  ├─ provider.test.mjs
│  ├─ engines.test.mjs
│  ├─ security.test.mjs
│  └─ package.test.mjs
└─ docs/
   ├─ architecture.md
   ├─ feasibility.md
   ├─ references.md
   ├─ security.md
   ├─ verification.md
   └─ roadmap.md
```

## 自动化测试要求

使用 Node.js 内置 `node:test` 或同等轻量方案。网络测试默认使用 fixture 和受控 fake transport，不依赖真实搜索服务。

至少覆盖：

1. `package.json`、ESM 入口和 bundle patch 正确；
2. provider 能注册、dispose，并且不会重复注册；
3. Bing 与 DuckDuckGo fixture 能解析；
4. 空结果、结构变化、反爬页面和畸形 HTML 可诊断；
5. 查询参数经过正确编码，不能注入 host、path 或额外请求头；
6. `maxResults`、query 长度、timeout、响应体大小和重定向次数均受限；
7. abort 不触发回退，且请求会终止；
8. 首选成功时不请求备用引擎；
9. 首选失败时仅请求另一个固定引擎；
10. 两个引擎都失败时错误稳定且不泄露响应正文；
11. `javascript:`、`data:`、`file:` 等结果 URL 被丢弃；
12. 标题和摘要清洗控制字符、HTML 及伪造 untrusted 边界；
13. 配置枚举和数值上下界有效；
14. 已显式选择其它 provider 时不抢占；
15. 只有当前 provider 仍指向本插件时才允许恢复；
16. 插件不修改 `fetchProvider`；
17. 发布文件中不存在 `node:child_process`、浏览器启动、HTTP server、凭据服务、自动更新、SQLite、任意 base URL 或安装钩子；
18. `npm pack --dry-run` 或打到临时目录的 tarball 内容完整且没有 `_references/`、fixture 以外的抓取内容、日志或秘密；
19. tarball 解包到临时目录后，入口仍可独立加载；
20. README 中的安装、验证和卸载命令与实际测试一致。

可以增加一次明确标记的 live smoke test，但它必须：

- 默认不随单元测试运行；
- 只发送一个无敏感信息的固定查询；
- 不访问搜索结果页面；
- 记录实际访问的引擎和结果，不把偶发网络失败伪装成单元测试失败。

## 本机 DSH 集成验证

以本机说明文件为准，优先使用持久的 `plugin-dev` Profile，不要在开发阶段反复修改真实 `desktop` Profile。

至少完成：

1. 使用 DSH 自己的插件命令，把当前项目绝对路径安装到 `plugin-dev`；
2. `dsh plugin --profile plugin-dev list --depth 0` 确认只有一个本插件条目；
3. `dsh --profile plugin-dev --dump-config` 成功，bundle row 和 provider 配置无重复；
4. 通过正式 `web_search` 路径或 Host provider 集成测试执行一次无敏感内容的查询；
5. 确认实际 provider 为本插件，且无需 `DEEPSEEK_API_KEY`；
6. 确认 `web_fetch` provider 未被本插件更改；
7. 确认插件禁用或移除后，Profile 不留下无法解析的 `minimal-free-search` 引用；
8. 验证结束后，只清理本任务创建的临时 Profile、临时包和测试文件，不修改或卸载其它插件。

`desktop` 是最终目标 Profile，但除非执行本提示词的用户在该任务中明确授权，不要安装、停用、升级或移除真实 `desktop` Profile 的插件。未获授权时，提供准确的 Desktop 安装命令和重启后的人工检查步骤，并如实标注尚未执行。

不要通过在普通 headless prompt 中输入字符串 `web_search` 或斜杠命令来冒充 provider 集成测试；必须使用真实工具调用路径、公开 Host service 测试入口或可证明等价的集成测试。

## 文档要求

`README.md` 默认使用中文，至少包括：

- 插件解决的问题与严格的第一版边界；
- 默认目标是 DSH Desktop；
- 本地目录、GitHub URL 和未来 npm 包三种安装形式，但不得声称尚未发布的渠道已经可用；
- 为什么无需 DeepSeek API key；
- 查询会发送给 Bing 或 DuckDuckGo 的隐私说明；
- 配置字段和默认值；
- Profile 中 provider 接管的准确行为；
- 如何确认插件已加载并实际生效；
- Desktop 完整重启要求；
- 如何禁用、卸载及恢复官方 provider；
- HTML 抓取式搜索可能被限流或因页面结构变化失效；
- 插件不提供 `web_fetch`，也不会读取搜索结果正文；
- 许可证和参考来源。

`docs/security.md` 应明确列出插件拥有和不拥有的权限，并建立如下安全不变量：

- 无凭据；
- 无任意 URL fetch；
- 无文件 I/O；
- 无子进程；
- 无浏览器；
- 无 HTTP server；
- 无自动更新；
- 无遥测；
- 无搜索结果正文抓取。

## 后续版本路线图

创建 `docs/roadmap.md`。后续方向可以规划，但第一版不得提前实现。

建议按独立里程碑列出：

### v1.1：官方设置 UI

- 只使用 DSH 公开 Client slot 和 settings API；
- 不自建 HTTP bridge；
- 不处理凭据；
- UI 只是现有有限配置的图形化表达。

### v1.2：第三个搜索来源

- 优先考虑用户自建 SearXNG；
- 自定义 endpoint 属于新的 SSRF 和凭据边界，必须先完成独立威胁模型；
- 需要协议/host/IP/重定向/DNS rebinding 防护和专门测试；
- 未完成安全设计前不实现。

### v1.3：隐私和可靠性增强

- 显式选择而非静默多源发送；
- 仅内存的短期缓存；
- 可观测但不包含查询正文的本地诊断；
- HTML parser fixture 更新工具，但同步工具不得在普通安装时运行。

### v2：附加搜索工具

- 平台搜索、多源交叉验证、时间过滤可以分别评估；
- 每项作为独立工具和独立权限审查，不默认并入基础 provider；
- 付费引擎、凭据管理和匿名 MCP 服务必须显式 opt-in。

### 独立项目：安全网页抓取

- `web_fetch` 不属于本插件第一版；
- 如以后需要，应作为独立插件或独立高风险模块设计；
- 必须先解决 SSRF、重定向、DNS rebinding、响应大小、内容类型、内网地址、云元数据地址和提示注入；
- 不把“启动无沙箱浏览器”列为可接受默认方案。

路线图只能描述候选方向，不得把未实现功能写成承诺或当前能力。

## 推进顺序

1. 读取 AGENTS 与本机 DSH 说明；
2. 初始化 Git 并提交项目骨架；
3. 按需拉取并固定参考仓库；
4. 完成 `docs/references.md` 和 `docs/feasibility.md`；
5. 写 `docs/architecture.md` 与 `docs/security.md`；
6. 先实现纯解析器和 fixture 测试；
7. 实现受限网络层；
8. 实现 provider 编排与回退；
9. 接入 Cordis/DSH 生命周期；
10. 完成 provider 选择、恢复和卸载测试；
11. 完成包测试和 tarball 检查；
12. 在 `plugin-dev` 做真实 DSH 集成验证；
13. 补齐 README、verification 和 roadmap；
14. 检查 Git 状态和提交历史，确保没有参考仓库、秘密或临时产物。

普通实现问题自行调查和解决，不要在每个步骤等待确认。只有出现以下情况才停止并询问用户：

- 当前公开 DSH API 无法注册或选择 search provider；
- 一键安装必须依赖私有 API或修改 DSH 源码；
- 必须修改 `web_fetch` 才能完成基础搜索；
- 必须启动浏览器、子进程或本地服务器；
- 无法可靠避免卸载后的悬空 provider；
- 需要突破本提示词的第一版权限或产品边界。

## 首次汇报内容

完成调查和 feasibility spike 后，先向用户简短报告：

1. 实际 DSH 版本；
2. 实际参考仓库及 commit；
3. 当前 DSH search provider 接口结论；
4. 一键启用与卸载恢复是否可行；
5. 第一版最终目录与实现计划；
6. 是否发现必须停止确认的边界问题。

如果没有边界问题，汇报后继续实现，不要等待不必要的确认。

## 完成标准

只有同时满足以下条件才算完成：

- 插件使用 DSH 原生 search provider，不依赖 OpenCode；
- Bing 与 DuckDuckGo 两个固定免费引擎工作；
- 不需要任何 API key；
- 不接管 `web_fetch`；
- 不含文件 I/O、子进程、浏览器、本地 HTTP server、凭据访问、自动更新或遥测；
- 安装后只在官方默认/未设置 provider 时接管，不覆盖显式选择；
- 禁用或卸载有可验证的安全恢复路径；
- 单元测试、包测试和安全不变量测试全部通过；
- 在本机 `plugin-dev` Profile 完成至少一次可复现的真实 DSH smoke test；
- README 中的命令与实际执行结果一致；
- Git 历史清晰，没有提交 `_references/`、凭据或临时产物；
- `docs/roadmap.md` 规划了后续版本，但第一版没有越界实现。

## 最终汇报格式

完成后简洁汇报：

1. 实现结果、DSH 版本和参考 commit；
2. 主要文件及职责；
3. 第一版安全边界是否全部保持；
4. 实际运行过的测试、打包检查和结果；
5. `plugin-dev` 集成验证结果；
6. Desktop 的准确安装、配置、验证、更新和卸载命令；
7. 哪些 Desktop 步骤尚未执行；
8. 已知限制及后续路线图。

不要把未运行的检查描述为已验证，不要把路线图描述为已有功能，也不要把候选安装渠道描述为已发布版本。
