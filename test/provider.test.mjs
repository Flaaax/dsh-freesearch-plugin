import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createSearchProvider, MAX_QUERY_CHARACTERS, normalizeConfig } from '../lib/provider.js'

const bing = await readFile(new URL('./fixtures/bing.html', import.meta.url), 'utf8')
const duckduckgo = await readFile(new URL('./fixtures/duckduckgo.html', import.meta.url), 'utf8')

function provider(overrides = {}, fetchImpl, used = []) {
  return createSearchProvider({
    getConfig: () => normalizeConfig(overrides),
    fetchImpl,
    lifetimeSignal: new AbortController().signal,
    onEngineUsed: engine => used.push(engine),
  })
}

test('首选成功时不请求备用引擎', async () => {
  const calls = []
  const search = provider({}, async url => {
    calls.push(new URL(url).hostname)
    return new Response(bing, { headers: { 'content-type': 'text/html' } })
  })
  const result = await search.search({ query: 'hello', maxResults: 1 })
  assert.equal(result.sources.length, 1)
  assert.deepEqual(calls, ['www.bing.com'])
})

test('首选失败时只请求另一个固定引擎并记录实际引擎', async () => {
  const calls = []
  const used = []
  const search = provider({}, async url => {
    const host = new URL(url).hostname
    calls.push(host)
    if (host === 'www.bing.com') return new Response('blocked captcha', { headers: { 'content-type': 'text/html' } })
    return new Response(duckduckgo, { headers: { 'content-type': 'text/html' } })
  }, used)
  const result = await search.search({ query: 'hello', maxResults: 2 })
  assert.equal(result.sources.length, 2)
  assert.deepEqual(calls, ['www.bing.com', 'lite.duckduckgo.com'])
  assert.deepEqual(used, ['duckduckgo'])
})

test('关闭 fallback 后只请求首选引擎', async () => {
  let calls = 0
  const search = provider({ fallback: false }, async () => {
    calls++
    return new Response('no results', { headers: { 'content-type': 'text/html' } })
  })
  await assert.rejects(search.search({ query: 'hello' }), { code: 'SEARCH_ALL_ENGINES_FAILED' })
  assert.equal(calls, 1)
})

test('两个引擎都失败时错误稳定且不泄露正文或查询', async () => {
  const search = provider({}, async () => new Response('secret-body captcha', { headers: { 'content-type': 'text/html' } }))
  const error = await search.search({ query: 'private query' }).catch(value => value)
  assert.equal(error.code, 'SEARCH_ALL_ENGINES_FAILED')
  assert.doesNotMatch(error.message, /secret-body|private query/)
})

test('用户取消不触发回退', async () => {
  const controller = new AbortController()
  let calls = 0
  const search = provider({}, async (_url, options) => {
    calls++
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }))
  })
  const pending = search.search({ query: 'hello' }, controller.signal)
  controller.abort()
  await assert.rejects(pending, { code: 'SEARCH_ABORTED' })
  assert.equal(calls, 1)
})

test('限制查询长度和结果数', async () => {
  const search = provider({ maxResults: 1 }, async () => new Response(bing, { headers: { 'content-type': 'text/html' } }))
  await assert.rejects(search.search({ query: 'x'.repeat(MAX_QUERY_CHARACTERS + 1) }), { code: 'SEARCH_QUERY_TOO_LONG' })
  const result = await search.search({ query: 'hello', maxResults: 9 })
  assert.equal(result.sources.length, 1)
})

test('配置枚举和数值上下界有效', () => {
  for (const value of [
    { preferredEngine: 'google' }, { market: 'any' }, { safeSearch: 'unknown' },
    { timeoutMs: 999 }, { timeoutMs: 20_001 }, { maxResults: 0 }, { maxResults: 11 },
  ]) assert.throws(() => normalizeConfig(value), { code: 'SEARCH_CONFIG_INVALID' })
})
