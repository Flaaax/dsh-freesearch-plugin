# 安全设计

## 权限清单

插件拥有：

- 向 `https://www.bing.com/search` 发起 GET 请求；
- 向 `https://lite.duckduckgo.com/lite/` 发起 GET 请求；
- 通过 DSH settings API 读取和修改 `web.searchProvider`；
- 通过自身公开 Config Schema 读取有限配置。

插件不拥有或不使用：

- API key、Cookie 或凭据存储；
- 任意 URL fetch 或搜索结果正文抓取；
- 普通文件 I/O、环境变量凭据读取、子进程或浏览器；
- HTTP server、自定义 Web 路由、SQLite、持久缓存、自动更新或遥测；
- `web.fetchProvider` 修改权限。

## 安全不变量

1. 搜索端点的 scheme、host、path 和方法由源码固定。
2. 用户查询只进入 `URLSearchParams`，不能改变 origin、path 或请求头。
3. 重定向逐跳验证，只允许回到同一引擎的同一 HTTPS origin 和 path，最多两跳。
4. 查询最多 500 个 Unicode 字符；结果最多 10 条。
5. 单引擎超时为 1–20 秒；响应体最多 1,000,000 字节。
6. 调用方 abort 或插件 dispose 会终止在途请求，且不触发回退。
7. 结果 URL 只允许无用户信息的 HTTP(S)，并删除 fragment；普通 query 参数保留。
8. 标题最多 200 字符，摘要最多 500 字符；HTML、控制字符和伪造边界标记会被清洗。
9. 错误不包含查询、响应正文、Header、Cookie 或内部堆栈。
10. 插件不注册 fetch provider、不修改 `fetchProvider`，也不请求结果页面。

## 不可信外部数据

DSH `0.2.1-rc.3` 的 `dsh-tool-web` 会在模型可见的 `web_search` 输出前添加外部不可信内容提示。插件仍在 provider 层清洗字段，防止标题和摘要伪造边界标记；它不重复包装结果，也不修改全局提示词。

## 隐私与残余风险

查询会发送给首选搜索引擎；启用 fallback 后，首选失败时同一查询也会发送给另一个引擎。插件使用通用且诚实的 User-Agent，不发送登录状态、本机路径或 DSH 会话。公开免费入口可能记录来源 IP，并可能按其自身政策处理查询。

HTML 页面结构和反爬策略可能变化。进程崩溃会跳过 dispose；若随后离线卸载插件，Profile 可能保留 provider id，README 提供重新安装撤销和手工恢复流程。
