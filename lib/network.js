import { SearchPluginError, isAbortFailure } from './errors.js'

export const MAX_RESPONSE_BYTES = 1_000_000
export const MAX_REDIRECTS = 2

const ENDPOINTS = {
  bing: {
    url: new URL('https://www.bing.com/search'),
    acceptLanguage: { 'zh-CN': 'zh-CN,zh;q=0.9,en;q=0.7', 'en-US': 'en-US,en;q=0.9' },
  },
  duckduckgo: {
    url: new URL('https://lite.duckduckgo.com/lite/'),
    acceptLanguage: { 'zh-CN': 'zh-CN,zh;q=0.9,en;q=0.7', 'en-US': 'en-US,en;q=0.9' },
  },
}

/** 构造只含固定端点和受控查询参数的搜索 URL。 */
export function buildSearchUrl(engine, query, config, maxResults) {
  const definition = ENDPOINTS[engine]
  if (!definition) throw new SearchPluginError('不支持的搜索引擎。', 'SEARCH_CONFIG_INVALID')
  const url = new URL(definition.url)
  url.searchParams.set('q', query)
  if (engine === 'bing') {
    url.searchParams.set('count', String(maxResults))
    url.searchParams.set('mkt', config.market)
    url.searchParams.set('adlt', config.safeSearch)
  } else {
    url.searchParams.set('kl', config.market === 'zh-CN' ? 'cn-zh' : 'us-en')
    url.searchParams.set('adlt', config.safeSearch === 'strict' ? '1' : config.safeSearch === 'moderate' ? '0' : '-1')
  }
  return url
}

function validateRedirect(engine, value, previous) {
  let next
  try { next = new URL(value, previous) } catch {
    throw new SearchPluginError(`${engine} 返回了无效重定向。`, 'SEARCH_REDIRECT_INVALID')
  }
  const endpoint = ENDPOINTS[engine].url
  if (next.protocol !== 'https:' || next.origin !== endpoint.origin || next.pathname !== endpoint.pathname) {
    throw new SearchPluginError(`${engine} 返回了非白名单重定向。`, 'SEARCH_REDIRECT_BLOCKED')
  }
  return next
}

async function readLimitedBody(response, maxBytes, signal) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new SearchPluginError('搜索响应超过大小限制。', 'SEARCH_RESPONSE_TOO_LARGE')
  }
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  try {
    while (true) {
      if (signal.aborted) throw signal.reason
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) throw new SearchPluginError('搜索响应超过大小限制。', 'SEARCH_RESPONSE_TOO_LARGE')
      chunks.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

/** 请求一个固定搜索端点并返回有界 HTML。 */
export async function fetchSearchHtml(engine, query, config, maxResults, signal, fetchImpl = globalThis.fetch) {
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(new Error('timeout')), config.timeoutMs)
  const combined = AbortSignal.any([signal, timeout.signal])
  let url = buildSearchUrl(engine, query, config, maxResults)
  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      let response
      try {
        response = await fetchImpl(url, {
          method: 'GET',
          redirect: 'manual',
          signal: combined,
          headers: {
            accept: 'text/html,application/xhtml+xml;q=0.9',
            'accept-language': ENDPOINTS[engine].acceptLanguage[config.market],
            'user-agent': 'DSH-Minimal-Free-Search/0.1.0',
          },
        })
      } catch (error) {
        if (signal.aborted) throw new SearchPluginError('搜索已取消。', 'SEARCH_ABORTED', { cause: error })
        if (timeout.signal.aborted) throw new SearchPluginError('搜索请求超时。', 'SEARCH_TIMEOUT', { cause: error })
        throw new SearchPluginError(`${engine} 网络请求失败。`, 'SEARCH_NETWORK_FAILED', { cause: error })
      }
      if (response.status >= 300 && response.status < 400) {
        if (redirects === MAX_REDIRECTS) throw new SearchPluginError('搜索重定向次数过多。', 'SEARCH_REDIRECT_LIMIT')
        const location = response.headers.get('location')
        if (!location) throw new SearchPluginError('搜索重定向缺少目标。', 'SEARCH_REDIRECT_INVALID')
        url = validateRedirect(engine, location, url)
        continue
      }
      if (!response.ok) throw new SearchPluginError(`${engine} 返回 HTTP ${response.status}。`, 'SEARCH_HTTP_FAILED')
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new SearchPluginError(`${engine} 返回了非 HTML 响应。`, 'SEARCH_RESPONSE_INVALID')
      }
      try { return await readLimitedBody(response, MAX_RESPONSE_BYTES, combined) } catch (error) {
        if (isAbortFailure(error, signal)) throw new SearchPluginError('搜索已取消。', 'SEARCH_ABORTED', { cause: error })
        if (timeout.signal.aborted) throw new SearchPluginError('搜索请求超时。', 'SEARCH_TIMEOUT', { cause: error })
        throw error
      }
    }
    throw new SearchPluginError('搜索重定向次数过多。', 'SEARCH_REDIRECT_LIMIT')
  } finally {
    clearTimeout(timer)
  }
}
