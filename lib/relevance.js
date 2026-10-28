// 搜索相关性守卫：识别 Bing/DuckDuckGo 返回的"结构正常但主题无关"错页。
// 只做确定性 token 重叠，不做通用相关性打分，不重排正常结果。

// 跨语言品牌/实体别名：中文查询命中纯英文官方名时，避免相关性守卫误判。
// 只覆盖公开搜索里常见的等价，不是翻译词典。
const CROSS_LINGUAL_ALIASES = new Map([
  ['苹果', ['apple']],
  ['谷歌', ['google']],
  ['微软', ['microsoft']],
  ['亚马逊', ['amazon']],
  ['脸书', ['facebook']],
  ['脸谱', ['facebook']],
  ['推特', ['twitter']],
  ['油管', ['youtube']],
  ['奈飞', ['netflix']],
  ['网飞', ['netflix']],
  ['领英', ['linkedin']],
  ['特斯拉', ['tesla']],
  ['星巴克', ['starbucks']],
  ['宝马', ['bmw']],
  ['奔驰', ['mercedes']],
  ['奥迪', ['audi']],
  ['三星', ['samsung']],
  ['华为', ['huawei']],
  ['小米', ['xiaomi']],
  ['联想', ['lenovo']],
  ['索尼', ['sony']],
  ['松下', ['panasonic']],
])

/** 文本是否包含 CJK 字符。 */
export function isCjk(text) {
  return /[\u4e00-\u9fff]/.test(String(text ?? ''))
}

/** 提取查询的重叠 token：CJK 二字词 + 拉丁/数字词（>=2）。 */
export function queryOverlapTokens(query) {
  const q = String(query ?? '').trim()
  const tokens = []
  const cjkRuns = q.match(/[\u4e00-\u9fff]+/g) ?? []
  for (const run of cjkRuns) {
    if (run.length <= 2) { tokens.push(run); continue }
    for (let i = 0; i + 1 < run.length; i++) tokens.push(run.slice(i, i + 2))
  }
  for (const word of q.match(/[a-z0-9]+/gi) ?? []) {
    const lower = word.toLowerCase()
    if (lower.length >= 2) tokens.push(lower)
  }
  return tokens
}

/**
 * 判断结果是否与查询相关：任一结果的标题/摘要/URL 至少命中一个查询 token。
 * 纯符号等无法产生 token 的查询不拦截。
 */
export function looksRelevant(query, sources) {
  const tokens = queryOverlapTokens(query)
  if (tokens.length === 0) return true
  const haystack = tokens.concat(tokens.flatMap(token => CROSS_LINGUAL_ALIASES.get(token) ?? []))
  for (const source of sources ?? []) {
    const hay = `${source.title ?? ''} ${source.snippet ?? ''} ${source.url ?? ''}`.toLowerCase()
    if (haystack.some(token => hay.includes(token.toLowerCase()))) return true
  }
  return false
}
