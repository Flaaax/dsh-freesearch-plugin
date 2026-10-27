import { SearchPluginError } from '../errors.js'
import { normalizeSources, unwrapDuckDuckGoUrl } from '../normalize.js'

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2]
}

/**
 * 解析 DuckDuckGo Lite HTML 搜索结果。
 * 结果类名识别思路改编自 dsh-free-search v0.9.16。
 */
export function parseDuckDuckGoResults(html, maxResults) {
  const source = String(html ?? '')
  if (/captcha|unusual traffic|verify (?:that )?you are human|anomaly-modal/i.test(source.slice(0, 80_000))) {
    throw new SearchPluginError('DuckDuckGo 返回了反爬验证页面。', 'SEARCH_ENGINE_BLOCKED')
  }
  const links = source.match(/<a\b[^>]*class=(["'])[^"']*\bresult-link\b[^"']*\1[^>]*>[\s\S]*?<\/a>/gi) ?? []
  const snippets = [...source.matchAll(/<td\b[^>]*class=(["'])[^"']*\bresult-snippet\b[^"']*\1[^>]*>([\s\S]*?)<\/td>/gi)]
  const candidates = []
  for (let index = 0; index < links.length; index++) {
    const link = links[index]
    const href = attribute(link, 'href')
    if (!href) continue
    const title = link.replace(/^<a\b[^>]*>/i, '').replace(/<\/a>$/i, '')
    const snippet = snippets[index]?.[2]
    candidates.push({ url: unwrapDuckDuckGoUrl(href), title, ...(snippet ? { snippet } : {}) })
  }
  const sources = normalizeSources(candidates, maxResults)
  if (sources.length === 0) {
    const code = links.length === 0 ? 'SEARCH_ENGINE_STRUCTURE_CHANGED' : 'SEARCH_ENGINE_EMPTY'
    throw new SearchPluginError('DuckDuckGo 没有返回可用结果。', code)
  }
  return sources
}

export const duckDuckGoAdapter = {
  id: 'duckduckgo',
  parse: parseDuckDuckGoResults,
}
