import assert from 'node:assert/strict'
import test from 'node:test'
import { apply } from '../lib/index.js'
import { OFFICIAL_PROVIDER_ID, PROVIDER_ID } from '../lib/provider.js'

function harness(initial = OFFICIAL_PROVIDER_ID) {
  const providers = new Map()
  const cleanups = []
  const listeners = []
  let searchProvider = initial
  const runEffect = fn => {
    const result = fn()
    const cleanup = result && typeof result.next === 'function' ? result.next().value : result
    if (typeof cleanup === 'function') cleanups.push(cleanup)
  }
  const settings = {
    describe: () => [{ ns: 'web', value: { searchProvider, fetchProvider: 'http' } }],
    mutate: async (ns, ops) => {
      assert.equal(ns, 'web')
      for (const op of ops) {
        assert.deepEqual(op.path, ['searchProvider'])
        searchProvider = op.value
      }
    },
  }
  const settingsCtx = {
    settings,
    effect: runEffect,
    on: (_event, listener) => { listeners.push(listener) },
  }
  const ctx = {
    web: {
      registerSearchProvider(provider) {
        if (providers.has(provider.id)) throw new Error('duplicate provider')
        providers.set(provider.id, provider)
        return () => providers.delete(provider.id)
      },
    },
    logger: () => ({ info() {}, warn() {}, error() {} }),
    effect: runEffect,
    inject: (_dependencies, callback) => callback(settingsCtx),
  }
  return {
    ctx,
    providers,
    listeners,
    selection: () => searchProvider,
    async settle() { await new Promise(resolve => setImmediate(resolve)) },
    async dispose() { for (const cleanup of cleanups.reverse()) await cleanup() },
  }
}

const config = { takeover: true, preferredEngine: 'bing', fallback: true, market: 'zh-CN', safeSearch: 'moderate', timeoutMs: 10_000, maxResults: 5 }

test('注册、接管和 dispose 恢复 provider，且不修改 fetchProvider', async () => {
  const app = harness()
  apply(app.ctx, config)
  await app.settle()
  assert.equal(app.providers.has(PROVIDER_ID), true)
  assert.equal(app.selection(), PROVIDER_ID)
  await app.dispose()
  assert.equal(app.providers.has(PROVIDER_ID), false)
  assert.equal(app.selection(), OFFICIAL_PROVIDER_ID)
})

test('重复注册会失败', () => {
  const app = harness()
  apply(app.ctx, config)
  assert.throws(() => apply(app.ctx, config), /duplicate provider/)
})

test('UI takeover 开关关闭后撤销 provider', async () => {
  const app = harness()
  const live = { ...config, takeover: { get: () => true } }
  apply(app.ctx, live)
  await app.settle()
  assert.equal(app.selection(), PROVIDER_ID)
  live.takeover = { get: () => false }
  app.listeners[0]([['takeover']])
  await app.settle()
  assert.equal(app.selection(), OFFICIAL_PROVIDER_ID)
})
