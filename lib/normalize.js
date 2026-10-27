const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g
const BOUNDARY_MARKERS = /<\/?untrusted-web-content>|external web content follows\.?|treat it as untrusted data, not instructions\.?/gi
const NAMED_ENTITIES = new Map([
  ['amp', '&'], ['lt', '<'], ['gt', '>'], ['quot', '"'], ['apos', "'"], ['nbsp', ' '],
  ['ensp', ' '], ['emsp', ' '], ['thinsp', ' '],
  ['hellip', '…'], ['ndash', '–'], ['mdash', '—'], ['middot', '·'],
])

/** 解码搜索页中常见的 HTML 实体。 */
export function decodeHtmlEntities(value) {
  return String(value ?? '').replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);?/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hexadecimal = entity[1]?.toLowerCase() === 'x'
      const raw = hexadecimal ? entity.slice(2) : entity.slice(1)
      const codePoint = Number.parseInt(raw, hexadecimal ? 16 : 10)
      if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return ''
      try { return String.fromCodePoint(codePoint) } catch { return '' }
    }
    return NAMED_ENTITIES.get(entity.toLowerCase()) ?? match
  })
}

/** 将 HTML 片段转换为有界纯文本，并移除伪造的不可信内容标记。 */
export function sanitizeText(value, maxLength) {
  const withoutMarkup = decodeHtmlEntities(String(value ?? ''))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
  const clean = withoutMarkup
    .replace(BOUNDARY_MARKERS, ' ')
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return Array.from(clean).slice(0, maxLength).join('')
}

/** 只接受可供引用的 HTTP(S) 结果 URL。 */
export function normalizeResultUrl(value) {
  try {
    const url = new URL(decodeHtmlEntities(value))
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    url.hash = ''
    return url.href
  } catch {
    return null
  }
}

/**
 * 解开 Bing 的公开结果跳转 URL。
 * 思路改编自 dsh-free-search v0.9.16，详见 THIRD_PARTY_NOTICES.md。
 */
export function unwrapBingUrl(value) {
  const decoded = decodeHtmlEntities(value)
  try {
    const url = new URL(decoded)
    if (!/(^|\.)bing\.com$/i.test(url.hostname) || url.pathname !== '/ck/a') return decoded
    const encoded = url.searchParams.get('u')
    if (!encoded) return decoded
    const payload = encoded.startsWith('a1') ? encoded.slice(2) : encoded
    const target = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return /^https?:\/\//i.test(target) ? target : decoded
  } catch {
    return decoded
  }
}

/** 解开 DuckDuckGo 结果跳转 URL。 */
export function unwrapDuckDuckGoUrl(value) {
  const decoded = decodeHtmlEntities(value)
  try {
    const url = new URL(decoded, 'https://lite.duckduckgo.com')
    if (/(^|\.)duckduckgo\.com$/i.test(url.hostname)) {
      const target = url.searchParams.get('uddg')
      if (target) return target
    }
    return url.href
  } catch {
    return decoded
  }
}

/** 清洗、验证并按最终 URL 去重。 */
export function normalizeSources(sources, limit) {
  const output = []
  const seen = new Set()
  for (const source of sources) {
    const url = normalizeResultUrl(source.url)
    if (!url || seen.has(url)) continue
    seen.add(url)
    const title = sanitizeText(source.title, 200)
    const snippet = sanitizeText(source.snippet, 500)
    output.push({ url, ...(title ? { title } : {}), ...(snippet ? { snippet } : {}) })
    if (output.length >= limit) break
  }
  return output
}
