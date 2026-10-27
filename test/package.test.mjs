import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('npm pack dry-run 只包含发布白名单', () => {
  const npmCli = process.env.npm_execpath
  assert.ok(npmCli, 'npm_execpath 未设置')
  const result = spawnSync(process.execPath, [npmCli, 'pack', '--dry-run', '--json'], { cwd: new URL('../', import.meta.url), encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)[0]
  const files = report.files.map(file => file.path)
  for (const required of ['package.json', 'lib/index.js', 'cordis.patch.yml', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    assert.ok(files.includes(required), `tarball 缺少 ${required}`)
  }
  assert.equal(files.some(file => file.startsWith('_references/') || file.startsWith('test/') || file.endsWith('.log')), false)
})
