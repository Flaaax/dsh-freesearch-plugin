import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

async function runtimeSource() {
  const root = new URL('../lib/', import.meta.url)
  const files = []
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
      if (entry.isDirectory()) await visit(target)
      else if (entry.name.endsWith('.js')) files.push(await readFile(target, 'utf8'))
    }
  }
  await visit(root)
  return files.join('\n')
}

test('运行时代码不包含高权限能力', async () => {
  const source = await runtimeSource()
  for (const forbidden of [
    /node:child_process/, /node:fs/, /node:sqlite/, /node:vm/, /new\s+Function\s*\(/,
    /eval\s*\(/, /createServer\s*\(/, /process\.env/, /registerFetchProvider/,
    /register\s*\(\s*defineTool/, /puppeteer/i, /playwright/i, /--no-sandbox/,
  ]) assert.doesNotMatch(source, forbidden)
})

test('运行时 URL 字面量只属于两个固定搜索站点', async () => {
  const source = await runtimeSource()
  const urls = [...source.matchAll(/https:\/\/[^'"`)\s]+/g)].map(match => match[0])
  assert.deepEqual([...new Set(urls)].sort(), [
    'https://lite.duckduckgo.com',
    'https://lite.duckduckgo.com/lite/',
    'https://www.bing.com/search',
  ])
})
