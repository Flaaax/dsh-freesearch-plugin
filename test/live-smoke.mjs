import { createSearchProvider, normalizeConfig } from '../lib/provider.js'

if (process.env.DSH_MINIMAL_SEARCH_LIVE !== '1') {
  console.error('跳过 live smoke：请显式设置 DSH_MINIMAL_SEARCH_LIVE=1。')
  process.exitCode = 2
} else {
  const lifetime = new AbortController()
  let actualEngine = null
  const provider = createSearchProvider({
    getConfig: () => normalizeConfig({ maxResults: 3 }),
    lifetimeSignal: lifetime.signal,
    onEngineUsed: engine => { actualEngine = engine },
  })
  try {
    const result = await provider.search({ query: 'DeepSeek Harness', maxResults: 3 })
    console.log(JSON.stringify({ actualEngine, resultCount: result.sources.length, sources: result.sources }, null, 2))
  } catch (error) {
    console.error(JSON.stringify({ code: error?.code ?? 'UNKNOWN', message: error?.message ?? String(error) }))
    process.exitCode = 1
  }
}
