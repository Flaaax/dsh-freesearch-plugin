// 规模化搜索质量 baseline（真实网络）。
// 取代早期 10 查询的不完整测试：分 8 类 40 条查询 × zh-CN/en-US 两市场，
// 加相关性自动评分（硬错页检测）与关键查询稳定性复测。
// 运行：node test/bench-baseline.mjs
// 原始结果写入 bench/baseline-v0.1.0.json（不提交），stdout 打印精简汇总。

import { createSearchProvider } from '../lib/provider.js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const MAX_RESULTS = 10

// 8 类 × 5 条 = 40 条查询
const QUERY_MATRIX = [
  ['DeepSeek Harness', '品牌/产品'],
  ['OpenAI', '品牌/产品'],
  ['Node.js', '品牌/产品'],
  ['React', '品牌/产品'],
  ['Kubernetes', '品牌/产品'],
  ['清华大学 官网', '官方站点'],
  ['北京大学 官网', '官方站点'],
  ['复旦大学 官网', '官方站点'],
  ['教育部 官网', '官方站点'],
  ['苹果 官网', '官方站点'],
  ['typescript union types', '技术文档'],
  ['python async await', '技术文档'],
  ['docker compose file', '技术文档'],
  ['git rebase tutorial', '技术文档'],
  ['rust ownership', '技术文档'],
  ['微信 下载', '软件下载'],
  ['node 下载', '软件下载'],
  ['vscode 下载', '软件下载'],
  ['python 下载', '软件下载'],
  ['chrome 下载', '软件下载'],
  ['天气预报 今天', '日常常识'],
  ['美元 人民币 汇率', '日常常识'],
  ['今天 新闻', '日常常识'],
  ['北京 天气', '日常常识'],
  ['高铁 时刻表', '日常常识'],
  ['iPhone 17 Pro 价格', '中英混合'],
  ['ChatGPT API 价格', '中英混合'],
  ['Python 爬虫 教程', '中英混合'],
  ['React 面试题', '中英混合'],
  ['zqxvwbnmqzt 2027', '冷门/无结果'],
  ['qwertyuiop asdfghjkl', '冷门/无结果'],
  ['不存在的公司名 测试', '冷门/无结果'],
  ['xyzzyplugh blorb', '冷门/无结果'],
  ['2026 诺贝尔奖 名单', '时效/事件'],
  ['最新 iOS 版本', '时效/事件'],
  ['今天 股市', '时效/事件'],
  ['世界杯 冠军', '时效/事件'],
]
const MARKETS = ['zh-CN', 'en-US']

// 关键查询稳定性复测（3 次）
const ANCHORS = [
  ['清华大学 官网', '官方站点'],
  ['天气预报 今天', '日常常识'],
  ['zqxvwbnmqzt 2027', '冷门/无结果'],
  ['DeepSeek Harness', '品牌/产品'],
  ['微信 下载', '软件下载'],
  ['OpenAI API pricing', '技术文档'],
]

// 可注册域近似（eTLD+1，精简后缀表，与 v2 计划 §5.4 一致）
const MULTI_PART_SUFFIXES = new Set([
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
  'com.hk', 'org.hk', 'net.hk', 'edu.hk', 'gov.hk',
  'com.tw', 'org.tw', 'net.tw', 'edu.tw', 'gov.tw',
  'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp',
  'co.kr', 'or.kr', 'ne.kr', 'go.kr', 're.kr',
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'net.uk', 'sch.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
])

function registrableDomain(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    if (!host.includes('.') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
    const parts = host.split('.')
    if (parts.length <= 2) return host
    const last2 = parts.slice(-2).join('.')
    return MULTI_PART_SUFFIXES.has(last2) ? parts.slice(-3).join('.') : last2
  } catch {
    return ''
  }
}

// 查询信号：CJK 二字词 + 拉丁/数字词（>=2 字符）。用于硬错页检测（粗粒度，下界）。
const LATIN_STOP = new Set(['the', 'and', 'for', 'how', 'what', 'with', 'from', 'into', 'your'])
function querySignals(query) {
  const signals = new Set()
  const cjkRuns = query.match(/[\u4e00-\u9fff]+/g) || []
  for (const run of cjkRuns) {
    if (run.length <= 2) { signals.add(run); continue }
    for (let i = 0; i + 1 < run.length; i++) signals.add(run.slice(i, i + 2))
  }
  const latin = query.match(/[a-z0-9]+/gi) || []
  for (const w of latin) {
    const lw = w.toLowerCase()
    if (lw.length >= 2 && !LATIN_STOP.has(lw)) signals.add(lw)
  }
  return [...signals]
}

function overlapHits(signals, sources) {
  let hits = 0
  for (const s of sources) {
    const hay = `${s.title ?? ''} ${s.snippet ?? ''} ${s.url ?? ''}`.toLowerCase()
    if (signals.some(sig => hay.includes(sig.toLowerCase()))) hits++
  }
  return hits
}

const TRACKING_RE = /^(utm_|gclid|fbclid|msclkid|spm|vd_source)/i
function trackingParams(url) {
  try {
    return [...new URL(url).searchParams.keys()].filter(k => TRACKING_RE.test(k))
  } catch {
    return []
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const lifetime = new AbortController()
let cfg = { takeover: true, preferredEngine: 'bing', fallback: true, market: 'zh-CN', safeSearch: 'moderate', timeoutMs: 10_000, maxResults: MAX_RESULTS }
let enginesUsed = []
const provider = createSearchProvider({
  getConfig: () => cfg,
  lifetimeSignal: lifetime.signal,
  onEngineUsed: e => enginesUsed.push(e),
})

async function runOnce(query, category, market) {
  cfg = { ...cfg, market }
  enginesUsed = []
  const started = Date.now()
  const signals = querySignals(query)
  try {
    const result = await provider.search({ query, maxResults: MAX_RESULTS })
    const sources = result.sources.map(s => ({ url: s.url, title: s.title ?? '', snippet: s.snippet ?? '', domain: registrableDomain(s.url) }))
    const domains = new Set(sources.map(s => s.domain).filter(Boolean))
    const hits = overlapHits(signals, sources)
    const topHits = overlapHits(signals, sources.slice(0, 3))
    return {
      query, category, market, status: 'ok', engines: [...enginesUsed],
      resultCount: sources.length, distinctDomains: domains.size, domains: [...domains],
      signals, overlapHits: hits, topOverlapHits: topHits, hardWrongPage: topHits === 0,
      trackingParamUrls: sources.filter(s => trackingParams(s.url).length > 0).map(s => s.url),
      latencyMs: Date.now() - started, topTitles: sources.slice(0, 4).map(s => s.title),
    }
  } catch (error) {
    return {
      query, category, market, status: 'error', engines: [...enginesUsed],
      code: error?.code ?? 'UNKNOWN', message: error?.message ?? String(error),
      latencyMs: Date.now() - started,
    }
  }
}

const runs = []
for (const market of MARKETS) {
  for (const [query, category] of QUERY_MATRIX) {
    runs.push(await runOnce(query, category, market))
    await sleep(250)
  }
}

const stability = []
for (const [query, category] of ANCHORS) {
  for (const market of MARKETS) {
    for (let rep = 1; rep <= 3; rep++) {
      const r = await runOnce(query, category, market)
      r.rep = rep
      stability.push(r)
      await sleep(250)
    }
  }
}

lifetime.abort()

const ok = runs.filter(r => r.status === 'ok')
const errors = runs.filter(r => r.status === 'error')
const empty = ok.filter(r => r.resultCount === 0)
// onEngineUsed 仅在引擎成功返回时触发一次，因此 engines 最多 1 项。
// 本 benchmark 首选引擎恒为 bing，落到 duckduckgo 即代表 bing 被拒（失败/无关）后回退。
const fellBack = runs.filter(r => r.engines.includes('duckduckgo'))
const wrong = ok.filter(r => r.hardWrongPage)
const trackingTotal = ok.reduce((n, r) => n + r.trackingParamUrls.length, 0)
const diversity = ok.map(r => (r.resultCount > 0 ? r.distinctDomains / r.resultCount : null)).filter(v => v !== null)
const avgDiversity = diversity.length ? diversity.reduce((a, b) => a + b, 0) / diversity.length : null
const avgResults = ok.length ? ok.reduce((a, r) => a + r.resultCount, 0) / ok.length : null
const wrongByMarket = {}
for (const m of MARKETS) wrongByMarket[m] = wrong.filter(r => r.market === m).length

const summary = {
  generatedAt: new Date().toISOString(), version: '0.1.0', maxResults: MAX_RESULTS, scope: 'large',
  matrixQueries: QUERY_MATRIX.length, markets: MARKETS.length,
  totalRuns: runs.length, ok: ok.length, errors: errors.length,
  errorDetails: errors.map(e => ({ query: e.query, market: e.market, code: e.code })),
  emptyResults: empty.map(e => ({ query: e.query, market: e.market })),
  fallbackCount: fellBack.length,
  hardWrongPageCount: wrong.length, hardWrongPageByMarket: wrongByMarket,
  hardWrongPages: wrong.map(w => ({ query: w.query, market: w.market, topTitles: w.topTitles })),
  avgResults, avgDiversity, trackingParamUrlCount: trackingTotal,
}

const outDir = resolve(here, '..', 'bench')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'baseline-v0.1.0.json'), JSON.stringify({ summary, runs, stability }, null, 2) + '\n', 'utf8')

console.log(JSON.stringify({
  summary,
  wrongPage: wrong.map(w => ({ query: w.query, category: w.category, market: w.market, topTitles: w.topTitles })),
  errors: summary.errorDetails,
  fallbacks: fellBack.map(f => ({ query: f.query, market: f.market, engines: f.engines })),
  runs: runs.map(r => ({ q: r.query, cat: r.category, m: r.market, st: r.status, eng: r.engines, n: r.resultCount, dd: r.distinctDomains, oh: r.overlapHits, top: r.topOverlapHits, wrong: r.hardWrongPage })),
  stability: stability.map(s => ({ q: s.query, m: s.market, rep: s.rep, wrong: s.hardWrongPage, topTitles: s.topTitles })),
}, null, 2))
