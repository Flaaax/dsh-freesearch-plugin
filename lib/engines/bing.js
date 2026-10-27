import { SearchPluginError } from '../errors.js'
import { normalizeSources, unwrapBingUrl } from '../normalize.js'

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2]
}

/**
 * 解析 Bing HTML 搜索结果。
 * 结果块和跳转链接思路改编自 dsh-free-search v0.9.16。
 */
export function parseBingResults(html, maxResults) {
  const source = String(html ?? '')
  if (/captcha|unusual traffic|verify (?:that )?you are human|robot check/i.test(source.slice(0, 80_000))) {
    throw new SearchPluginError('Bing 返回了反爬验证页面。', 'SEARCH_ENGINE_BLOCKED')
  }
  const blocks = source.match(/<li\b[^>]*class=(["'])[^"']*\bb_algo\b[^"']*\1[^>]*>[\s\S]*?<\/li>/gi) ?? []
  const candidates = []
  for (const block of blocks) {
    const heading = block.match(/<h2\b[^>]*>[\s\S]*?<a\b([^>]*)>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i)
    if (!heading) continue
    const href = attribute(heading[1], 'href')
    if (!href) continue
    const snippet = block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]
    candidates.push({ url: unwrapBingUrl(href), title: heading[2], ...(snippet ? { snippet } : {}) })
  }
  const sources = normalizeSources(candidates, maxResults)
  if (sources.length === 0) {
    const code = blocks.length === 0 ? 'SEARCH_ENGINE_STRUCTURE_CHANGED' : 'SEARCH_ENGINE_EMPTY'
    throw new SearchPluginError('Bing 没有返回可用结果。', code)
  }
  return sources
}

export const bingAdapter = {
  id: 'bing',
  parse: parseBingResults,
}
