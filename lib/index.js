import z from '@deepseek-ai/schemastery'
import {
  CONFIG_LIMITS,
  createSearchProvider,
  createSelectionController,
  PROVIDER_ID,
  readVolatileConfig,
} from './provider.js'

export const name = 'dsh-minimal-free-search-plugin'
export const inject = ['web']

const engine = z.union([z.const('bing'), z.const('duckduckgo')])
const market = z.union([z.const('zh-CN'), z.const('en-US'), z.const('auto')])
const safeSearch = z.union([z.const('off'), z.const('moderate'), z.const('strict')])

export const Config = z.object({
  takeover: z.boolean().default(true).description('启用搜索接管；关闭并保存可撤销本插件的 Search Provider。').volatile(),
  preferredEngine: engine.default('bing').description('首选免费搜索引擎。').volatile(),
  fallback: z.boolean().default(true).description('首选引擎失败时尝试另一个固定引擎。').volatile(),
  market: market.default('auto').description('搜索市场和语言；auto 根据查询语言自动选择，不向 Bing 发送固定市场参数。').volatile(),
  safeSearch: safeSearch.default('moderate').description('安全搜索级别。').volatile(),
  timeoutMs: z.number().min(CONFIG_LIMITS.timeoutMin).max(CONFIG_LIMITS.timeoutMax).step(1).default(10_000).description('单个引擎的请求超时（毫秒）。').volatile(),
  maxResults: z.natural().min(CONFIG_LIMITS.resultsMin).max(CONFIG_LIMITS.resultsMax).default(5).description('单次查询最多返回的结果数。').volatile(),
})

/** 挂载一个最小权限 DSH search provider。 */
export function apply(ctx, config) {
  const lifetime = new AbortController()
  const logger = typeof ctx.logger === 'function' ? ctx.logger('minimal-free-search') : ctx.logger ?? console
  const provider = createSearchProvider({
    getConfig: () => readVolatileConfig(config),
    lifetimeSignal: lifetime.signal,
    onEngineUsed: engineId => logger.info?.(`minimal-free-search: 搜索成功，实际引擎 ${engineId}`),
  })

  ctx.effect(function* () {
    const unregister = ctx.web.registerSearchProvider(provider)
    yield () => {
      lifetime.abort(new Error('plugin disposed'))
      unregister()
    }
  }, 'minimal-free-search: provider')

  ctx.inject(['settings'], (settingsCtx) => {
    const selection = () => settingsCtx.settings.describe({ redactSecrets: true })
      .find(entry => entry.ns === 'web')?.value?.searchProvider
    const controller = createSelectionController({
      readSelection: selection,
      takeoverEnabled: () => readVolatileConfig(config).takeover !== false,
      writeSelection: value => settingsCtx.settings.mutate('web', [{ op: 'set', path: ['searchProvider'], value }]),
      logger,
    })
    void controller.reconcile().catch(error => logger.error?.(`minimal-free-search: provider 选择失败：${error?.message ?? String(error)}`))
    settingsCtx.on('loader/volatile-update', (paths) => {
      if (paths.some(path => path[0] === 'takeover')) {
        void controller.reconcile().catch(error => logger.error?.(`minimal-free-search: provider 撤销失败：${error?.message ?? String(error)}`))
      }
    })
    settingsCtx.effect(() => async () => {
      try { await controller.stop() } catch (error) {
        logger.error?.(`minimal-free-search: provider 恢复失败，请按 README 执行手工恢复：${error?.message ?? String(error)}`)
      }
    }, 'minimal-free-search: provider selection')
  })
}

export { PROVIDER_ID }
