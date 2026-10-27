import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const patch = await readFile(new URL('cordis.patch.yml', root), 'utf8')

test('package 是直接可加载的 Node.js ESM 插件', () => {
  assert.equal(manifest.type, 'module')
  assert.equal(manifest.main, './lib/index.js')
  assert.equal(manifest.exports, './lib/index.js')
  assert.equal(manifest.dsh.bundle.patch, 'cordis.patch.yml')
  assert.equal(manifest.dsh.compatibility.dshReleases['0.2.1-rc.3'], 'compatible')
  assert.equal(manifest.scripts.preinstall, undefined)
  assert.equal(manifest.scripts.install, undefined)
  assert.equal(manifest.scripts.postinstall, undefined)
})

test('bundle patch 只挂载一个插件 row，不覆盖 web row', () => {
  assert.match(patch, /id:\s*web-search-minimal-free/)
  assert.match(patch, /name:\s*dsh-minimal-free-search-plugin/)
  assert.doesNotMatch(patch, /^\s*-\s*id:\s*web\s*$/m)
  assert.equal((patch.match(/id:\s*web-search-minimal-free/g) ?? []).length, 1)
})

test('入口可独立导入并导出 Cordis 插件接口', async () => {
  const plugin = await import('../lib/index.js')
  assert.equal(plugin.name, 'dsh-minimal-free-search-plugin')
  assert.equal(typeof plugin.apply, 'function')
  assert.equal(typeof plugin.Config, 'function')
})
