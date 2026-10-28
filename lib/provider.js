import { SearchPluginError, isAbortFailure } from './errors.js'
import { fetchSearchHtml } from './network.js'
import { bingAdapter } from './engines/bing.js'
import { duckDuckGoAdapter } from './engines/duckduckgo.js'
import { looksRelevant } from './relevance.js'

export const PROVIDER_ID = 'minimal-free-search'
export const OFFICIAL_PROVIDER_ID = 'deepseek-official'
export const MAX_QUERY_CHARACTERS = 500
export const CONFIG_LIMITS = Object.freeze({ timeoutMin: 1_000, timeoutMax: 20_000, resultsMin: 1, resultsMax: 10 })

const ADAPTERS = Object.freeze({ bing: bingAdapter, duckduckgo: duckDuckGoAdapter })

/** 校验并补齐测试或非 Schemastery 调用传入的配置。 */
export function normalizeConfig(input = {}) {
  const config = {
    takeover: input.takeover ?? true,
    preferredEngine: input.preferredEngine ?? 'bing',
    fallback: input.fallback ?? true,
    market: input.market ?? 'auto',
    safeSearch: input.safeSearch ?? 'moderate',
    timeoutMs: input.timeoutMs ?? 10_000,
    maxResults: input.maxResults ?? 5,
  }
  if (typeof config.takeover !== 'boolean' || typeof config.fallback !== 'boolean') throw invalidConfig()
  if (!['bing', 'duckduckgo'].includes(config.preferredEngine)) throw invalidConfig()
  if (!['zh-CN', 'en-US', 'auto'].includes(config.market)) throw invalidConfig()
  if (!['off', 'moderate', 'strict'].includes(config.safeSearch)) throw invalidConfig()
  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < CONFIG_LIMITS.timeoutMin || config.timeoutMs > CONFIG_LIMITS.timeoutMax) throw invalidConfig()
  if (!Number.isInteger(config.maxResults) || config.maxResults < CONFIG_LIMITS.resultsMin || config.maxResults > CONFIG_LIMITS.resultsMax) throw invalidConfig()
  return Object.freeze(config)
}

function invalidConfig() {
  return new SearchPluginError('搜索插件配置无效。', 'SEARCH_CONFIG_INVALID')
}

function requestLimit(request, config) {
  const asked = request.maxResults === undefined ? config.maxResults : Number(request.maxResults)
  if (!Number.isFinite(asked) || asked <= 0) throw new SearchPluginError('搜索结果数量无效。', 'SEARCH_REQUEST_INVALID')
  return Math.min(Math.floor(asked), config.maxResults, CONFIG_LIMITS.resultsMax)
}

function queryText(request) {
  const query = String(request.query ?? '').trim()
  if (!query) throw new SearchPluginError('搜索查询不能为空。', 'SEARCH_REQUEST_INVALID')
  if (Array.from(query).length > MAX_QUERY_CHARACTERS) throw new SearchPluginError('搜索查询过长。', 'SEARCH_QUERY_TOO_LONG')
  return query
}

/** 创建 DSH WebSearchProvider。 */
export function createSearchProvider({ getConfig, fetchImpl = globalThis.fetch, lifetimeSignal, onEngineUsed = () => {} }) {
  return {
    id: PROVIDER_ID,
    available: () => !lifetimeSignal.aborted,
    async search(request, callerSignal) {
      const config = normalizeConfig(getConfig())
      const query = queryText(request)
      const maxResults = requestLimit(request, config)
      const signal = callerSignal ? AbortSignal.any([callerSignal, lifetimeSignal]) : lifetimeSignal
      const engines = config.fallback
        ? [config.preferredEngine, config.preferredEngine === 'bing' ? 'duckduckgo' : 'bing']
        : [config.preferredEngine]
      const failures = []
      for (const engine of engines) {
        if (signal.aborted) throw new SearchPluginError('搜索已取消。', 'SEARCH_ABORTED')
        let sources
        try {
          const html = await fetchSearchHtml(engine, query, config, maxResults, signal, fetchImpl)
          sources = ADAPTERS[engine].parse(html, maxResults)
        } catch (error) {
          if (isAbortFailure(error, signal)) throw new SearchPluginError('搜索已取消。', 'SEARCH_ABORTED', { cause: error })
          failures.push(error?.code ?? 'SEARCH_ENGINE_FAILED')
          continue
        }
        if (!looksRelevant(query, sources)) {
          failures.push('SEARCH_ENGINE_IRRELEVANT')
          continue
        }
        onEngineUsed(engine)
        return { sources, truncated: false }
      }
      throw new SearchPluginError(`搜索引擎均不可用（${failures.join('、')}）。`, 'SEARCH_ALL_ENGINES_FAILED')
    },
  }
}

/** 读取 Schemastery volatile 配置引用。 */
export function readVolatileConfig(config) {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [key, typeof value?.get === 'function' ? value.get() : value]))
}

/** 创建可串行化的 provider 选择控制器。 */
export function createSelectionController({ readSelection, writeSelection, takeoverEnabled, logger = {} }) {
  let pending = Promise.resolve()
  let stopped = false
  const enqueue = (operation) => {
    pending = pending.then(operation, operation)
    return pending
  }
  const reconcile = () => enqueue(async () => {
    if (stopped) return
    const current = readSelection()
    if (takeoverEnabled()) {
      if (current === undefined || current === OFFICIAL_PROVIDER_ID) {
        await writeSelection(PROVIDER_ID)
        logger.info?.(`minimal-free-search: search provider 已切换为 ${PROVIDER_ID}`)
      } else if (current !== PROVIDER_ID) {
        logger.warn?.(`minimal-free-search: 保留用户显式选择的 search provider ${JSON.stringify(current)}`)
      }
    } else if (current === PROVIDER_ID) {
      await writeSelection(OFFICIAL_PROVIDER_ID)
      logger.info?.(`minimal-free-search: search provider 已恢复为 ${OFFICIAL_PROVIDER_ID}`)
    }
  })
  const stop = () => enqueue(async () => {
    stopped = true
    if (readSelection() === PROVIDER_ID) await writeSelection(OFFICIAL_PROVIDER_ID)
  })
  return { reconcile, stop, settled: () => pending }
}