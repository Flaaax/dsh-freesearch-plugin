import { build } from 'esbuild'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

await mkdir(join(root, 'lib'), { recursive: true })

await build({
  entryPoints: [join(root, 'src', 'client', 'index.jsx')],
  outfile: join(root, 'lib', '_client.cjs'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: ['@deepseek-ai/*', 'react', 'react-dom', 'react/jsx-runtime'],
})

const client = await readFile(join(root, 'lib', '_client.cjs'), 'utf8')
await rm(join(root, 'lib', '_client.cjs'))
await writeFile(join(root, 'lib', 'client.js'), [
  '/* 由 scripts/build.mjs 生成，请勿手工编辑。 */',
  'window.__ModuleLoader__.load({',
  `  id: ${JSON.stringify(pkg.name)},`,
  '  factory: (require) => {',
  '    var module = { exports: {} };',
  '    var exports = module.exports;',
  client,
  '    return module.exports;',
  '  }',
  '});',
  '',
].join('\n'))

const browser = await readFile(join(root, 'lib', 'client.js'), 'utf8')
for (const exported of ['name', 'inject', 'apply']) {
  if (!browser.includes(exported)) throw new Error(`Client bundle 缺少导出：${exported}`)
}
if (!browser.includes('window.__ModuleLoader__.load')) throw new Error('Client bundle 缺少模块加载包装。')

console.log('构建完成：lib/client.js')
