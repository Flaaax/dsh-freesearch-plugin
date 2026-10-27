import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parseBingResults } from '../lib/engines/bing.js'
import { parseDuckDuckGoResults } from '../lib/engines/duckduckgo.js'

const fixture = name => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

test('解析 Bing fixture 并丢弃危险 URL', async () => {
  const sources = parseBingResults(await fixture('bing.html'), 10)
  assert.deepEqual(sources, [
    { url: 'https://example.com/alpha?x=1', title: 'Alpha & One', snippet: 'First result summary.' },
    { url: 'https://example.org/beta', title: 'Beta', snippet: 'Second result.' },
  ])
})

test('解析 DuckDuckGo Lite fixture 并解开结果链接', async () => {
  const sources = parseDuckDuckGoResults(await fixture('duckduckgo.html'), 10)
  assert.deepEqual(sources, [
    { url: 'https://example.net/one?a=1', title: 'DDG', snippet: 'A useful snippet.' },
    { url: 'https://example.net/two', title: 'Two', snippet: 'Another result.' },
  ])
})

test('反爬、结构变化和空结果可诊断', () => {
  assert.throws(() => parseBingResults('<html>captcha robot check</html>', 5), { code: 'SEARCH_ENGINE_BLOCKED' })
  assert.throws(() => parseBingResults('<html><body>changed</body></html>', 5), { code: 'SEARCH_ENGINE_STRUCTURE_CHANGED' })
  assert.throws(() => parseDuckDuckGoResults('<a class="result-link">missing href</a>', 5), { code: 'SEARCH_ENGINE_EMPTY' })
})
