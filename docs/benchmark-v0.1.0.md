# 第一版搜索质量 Baseline 与规模化对比（v0.1.0 → 修复后）

> 本文记录当前插件在真实网络下的可复现表现，以及针对 v2 计划 §5.1（auto 市场）与
> §5.2（相关性守卫）修复后的规模化对比。结果只是某个时间点的测量，不是质量承诺。

- 生成时间：2026-10-28T21:xx（Asia/Hong_Kong）
- 环境：DSH `0.2.1-rc.3`，benchmark 运行在开发机 Node.js `v22.14.0`
- 插件版本：`0.1.0`（Junction 直连 `plugin-dev`，修复直接改 `lib/` 源码）
- 测试 Profile：`plugin-dev`（隔离，未触碰 `desktop`）

## 方法

1. **确定性 provider 级 benchmark（主）**：脚本 [test/bench-baseline.mjs](../test/bench-baseline.mjs) 直接调用
   `lib/provider.js`，对固定查询矩阵（37 查询 × 8 类）× `zh-CN`/`en-US` 两种市场做真实网络搜索，共 74 次运行；
   另有 6 锚点查询 × 3 次重跑的 36 次稳定性运行。采集结果数、可注册域多样性、去重、tracking 参数、回退与错误。
   `hardWrongPage` 定义：返回结果中与查询 token 重叠的比例 < 10%（首屏 3 条零重叠）。
2. **单测回归**：`npm test`（41 项）覆盖相关性守卫、auto 市场 URL、无关错页回退，修复前后均全绿。
3. **工具层 smoke / 真实 dsh 会话**：见文末复现一节。

## 结果汇总（修复前后对比）

| 指标 | 修复前（mkt=zh-CN 固定） | 修复后（auto 市场 + 相关性守卫） |
| --- | --- | --- |
| 总运行数（矩阵 + 稳定性） | 74 + 36 | 74 + 36 |
| 成功 / 错误 | 74 / 0 | 74 / 0 |
| 空结果 | 0 | 0 |
| **触发回退（Bing→DuckDuckGo）** | **0** | **10** |
| **硬错页（hardWrongPage）** | **16**（zh-CN 9 / en-US 7） | **2**（zh-CN 1 / en-US 1，均为误报） |
| 平均结果数（上限 10） | 9.89 | 9.99 |
| 平均域名多样性 | 0.583 | 0.624 |
| 含 tracking 参数的结果 URL | 0 | 0 |

> 回退数在修复前为 0：旧 provider 只在网络/HTTP/解析异常时回退，结构正常但无关的结果被原样返回。
> 修复后回退 10 次，全部来自"相关性守卫判定无关 → 落到 DuckDuckGo"。

## 剩余硬错页（本轮仅 2 条，均为基准误报）

| 查询 | 市场 | 首个结果（前2） | 判定 |
| --- | --- | --- | --- |
| 苹果 官网 | zh-CN | Apple (中国大陆) - 官方网站 / Apple | 基准误报：跨语言正确（苹果→Apple） |
| 苹果 官网 | en-US | Apple (中国大陆) - 官方网站 / Apple | 基准误报：跨语言正确 |

> 基准脚本的 `overlapHits` 只看 CJK 二字词重叠，不知道 `苹果→apple` 的跨语言等价，因此把正确返回的
> Apple 官网误判为错页。插件的相关性守卫已内置品牌别名（`苹果→apple`），会正确放行这两条。
> **本轮真实错页 = 0**（上一轮 4 条中有 2 条真错页 `清华大学 官网`/`世界杯 冠军`，本轮分别由 auto 市场
> 直连正确 / 相关性守卫回退到 DuckDuckGo 正确，已消除；两轮差异是真实网络非确定性，趋势一致）。

## 修复机制与效果归因（两个机制各自显著、互补）

1. **相关性守卫 → 回退（本轮回退 10 次）**：对"结构正常但 token 重叠为零/极弱"的 Bing 结果判无关并回退
   DuckDuckGo。本轮 10 次回退覆盖：全部乱码查询（`zqxvwbnmqzt 2027` ×2、`qwertyuiop asdfghjkl`、
   `xyzzyplugh blorb` ×2、`不存在的公司名 测试` ×2）、`世界杯 冠军`、`复旦大学 官网`、`rust ownership`，
   回退后全部 `wrong=False`（正确）。这把修复前"冷门/无结果类 7 条 + 部分事件类"错页直接消灭。
2. **auto 市场**：不再无条件向 Bing 发 `mkt=zh-CN`，仅显式 `zh-CN`/`en-US` 时发送；DuckDuckGo 的 `kl` 与
   `Accept-Language` 按查询是否含 CJK 选择。这从源头消除"部分线路下 `mkt=zh-CN` 触发错页"，修复了
   `最新 iOS 版本` ×2、`今天 新闻`、`今天 股市`、`清华大学 官网` 等有效查询的错页。
3. **跨语言品牌别名（防误伤）**：`苹果→apple`、`谷歌→google` 等映射，避免把"中文查询命中英文官网"的正确
   结果误判为无关而误回退。

**真错页降幅**：排除跨语言误报后，真错页从 **14 → 0**（本轮）/ 0~2（两轮间网络波动），降幅约
**86%–100%**。此前仅靠 auto 市场无法覆盖乱码查询（Bing 对无意义词条返回随机内容），相关性守卫回退
恰好补齐这一半；两者缺一不可。

## 逐查询错页对比（修复前 16 → 修复后 0 真错页）

| 查询 | 市场 | 修复前 | 修复后 | 修复机制 |
| --- | --- | --- | --- | --- |
| 清华大学 官网 | zh-CN | ❌ 错页 | ✅ 正确 | auto 市场 |
| 复旦大学 官网 | zh-CN | ❌ 错页 | ✅ 正确 | 相关性守卫回退 |
| 苹果 官网 | zh-CN | ⚠️ 误报（Apple 正确） | ⚠️ 误报（Apple 正确） | 品牌别名放行 |
| zqxvwbnmqzt 2027 | zh-CN | ❌ 错页 | ✅ 正确 | 相关性守卫回退 |
| qwertyuiop asdfghjkl | zh-CN | ❌ 错页 | ✅ 正确 | 相关性守卫回退 |
| 不存在的公司名 测试 | zh-CN | ❌ 错页 | ✅ 正确 | 相关性守卫回退 |
| xyzzyplugh blorb | zh-CN | ❌ 错页 | ✅ 正确 | 相关性守卫回退 |
| 最新 iOS 版本 | zh-CN | ❌ 错页 | ✅ 正确 | auto 市场 |
| 世界杯 冠军 | zh-CN | ❌ 错页 | ✅ 正确 | 相关性守卫回退 |
| 苹果 官网 | en-US | ⚠️ 误报（Apple 正确） | ⚠️ 误报（Apple 正确） | 品牌别名放行 |
| 今天 新闻 | en-US | ❌ 错页 | ✅ 正确 | auto 市场 |
| zqxvwbnmqzt 2027 | en-US | ❌ 错页 | ✅ 正确 | 相关性守卫回退 |
| 不存在的公司名 测试 | en-US | ❌ 错页 | ✅ 正确 | 相关性守卫回退 |
| xyzzyplugh blorb | en-US | ❌ 错页 | ✅ 正确 | 相关性守卫回退 |
| 最新 iOS 版本 | en-US | ❌ 错页 | ✅ 正确 | auto 市场 |
| 今天 股市 | en-US | ❌ 错页 | ✅ 正确 | auto 市场 |

## 剩余可改进项（对应 v2 后续小节）

1. **基准误报需对齐**：`苹果 官网` → Apple 属跨语言正确，但基准 `overlapHits` 未做别名映射，仍标记为错页。
   可在基准脚本里复用 [lib/relevance.js](../lib/relevance.js) 的别名逻辑，使指标与插件行为一致。
2. **弱相关错页仍有漏网窗口**：相关性守卫是"整页任一结果零重叠"级别；若 Bing 首屏混入 1 条弱重叠结果，
   整页会放行（上一轮的 `清华大学 官网`/`世界杯 冠军` 即是）。[v2 §5.2](v2-search-quality-plan.md)
   的"逐条/首屏 N 条阈值"可进一步收紧。
3. **近重复未去重、域名多样性仍偏低**（平均 0.624）：[v2 §5.3/§5.4/§5.7] 的超采样 + 归一化去重 +
   确定性域名轮转可继续改善。
4. **tracking 参数为 0**：Bing 经 `unwrapBingUrl` 解跳后已无 `utm_*`/`gclid`，tracking 剥离主要价值在
   DuckDuckGo 与归一化去重幂等性。

## 复现

```powershell
# 确定性 benchmark（真实网络，不经过 LLM）
node test/bench-baseline.mjs

# 单测回归
npm test

# 工具层 smoke
$env:DSH_MINIMAL_SEARCH_HOST_LIVE='1'; node test/dsh-host-smoke.mjs

# 真实会话
$env:DIANXIN_API_KEY = [Environment]::GetEnvironmentVariable('DIANXIN_API_KEY','User')
dsh --profile plugin-dev --json "请使用 web_search 工具搜索 DeepSeek Harness 是什么，然后用一句话回答。"
```

原始数据：修复前 `bench/baseline-v0.1.0-before.json`、修复后 `bench/baseline-v0.1.0.json`
（均不提交，`bench/` 已加入 `.gitignore`）。