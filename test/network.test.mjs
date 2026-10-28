import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSearchUrl, fetchSearchHtml, MAX_REDIRECTS, MAX_RESPONSE_BYTES } from '../lib/network.js'
import { normalizeConfig } from '../lib/provider.js'

const config = normalizeConfig()

test('查询只能进入编码后的固定查询参数', () => {
  const value = 'x&evil=1#fragment\r\nX-Test: injected'
  const url = buildSearchUrl('bing', value, config, 5)
  assert.equal(url.origin, 'https://www.bing.com')
  assert.equal(url.pathname, '/search')
  assert.equal(url.searchParams.get('q'), value)
  assert.equal(url.searchParams.get('evil'), null)
})

test('auto 市场不向 Bing 发送 mkt，且 DDG kl 跟随查询语言', () => {
  const auto = normalizeConfig({ market: 'auto' })
  assert.equal(buildSearchUrl('bing', '清华大学 官网', auto, 5).searchParams.get('mkt'), null)
  assert.equal(buildSearchUrl('duckduckgo', '清华大学 官网', auto, 5).searchParams.get('kl'), 'cn-zh')
  assert.equal(buildSearchUrl('duckduckgo', 'OpenAI API', auto, 5).searchParams.get('kl'), 'us-en')
})

test('显式 zh-CN / en-US 仍发送对应 mkt', () => {
  assert.equal(buildSearchUrl('bing', 'x', normalizeConfig({ market: 'zh-CN' }), 5).searchParams.get('mkt'), 'zh-CN')
  assert.equal(buildSearchUrl('bing', 'x', normalizeConfig({ market: 'en-US' }), 5).searchParams.get('mkt'), 'en-US')
})

test('请求不发送 Cookie 或自定义身份信息', async () => {
  let observed
  const fetchImpl = async (url, options) => {
    observed = { url: String(url), options }
    return new Response('<li class="b_algo"><h2><a href="https://example.com">x</a></h2><p>y</p></li>', { headers: { 'content-type': 'text/html' } })
  }
  await fetchSearchHtml('bing', 'query', config, 5, new AbortController().signal, fetchImpl)
  assert.equal(observed.options.method, 'GET')
  assert.equal(observed.options.redirect, 'manual')
  assert.equal(observed.options.headers.cookie, undefined)
  assert.match(observed.options.headers['user-agent'], /^DSH-Minimal-Free-Search\//)
})

test('拒绝非白名单重定向及过多重定向', async () => {
  const outside = async () => new Response(null, { status: 302, headers: { location: 'https://evil.example/' } })
  await assert.rejects(fetchSearchHtml('bing', 'q', config, 5, new AbortController().signal, outside), { code: 'SEARCH_REDIRECT_BLOCKED' })
  let count = 0
  const looping = async () => {
    count++
    return new Response(null, { status: 302, headers: { location: 'https://www.bing.com/search?q=q' } })
  }
  await assert.rejects(fetchSearchHtml('bing', 'q', config, 5, new AbortController().signal, looping), { code: 'SEARCH_REDIRECT_LIMIT' })
  assert.equal(count, MAX_REDIRECTS + 1)
})

test('严格限制响应体大小且不泄露正文', async () => {
  const bytes = new Uint8Array(MAX_RESPONSE_BYTES + 1)
  const fetchImpl = async () => new Response(bytes, { headers: { 'content-type': 'text/html' } })
  const error = await fetchSearchHtml('bing', 'secret-query', config, 5, new AbortController().signal, fetchImpl).catch(value => value)
  assert.equal(error.code, 'SEARCH_RESPONSE_TOO_LARGE')
  assert.doesNotMatch(error.message, /secret-query/)
})

test('调用方 abort 会终止请求', async () => {
  const controller = new AbortController()
  const fetchImpl = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true })
  })
  const pending = fetchSearchHtml('bing', 'q', config, 5, controller.signal, fetchImpl)
  controller.abort()
  await assert.rejects(pending, { code: 'SEARCH_ABORTED' })
})
