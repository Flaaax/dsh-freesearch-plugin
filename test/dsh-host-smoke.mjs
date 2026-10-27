import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as ToolWeb from '@deepseek-ai/dsh-tool-web'
import WebRuntime from '@deepseek-ai/dsh-web'
import * as MinimalFreeSearch from '../lib/index.js'
import { PROVIDER_ID } from '../lib/provider.js'

if (process.env.DSH_MINIMAL_SEARCH_HOST_LIVE !== '1') {
  console.error('跳过 Host smoke：请显式设置 DSH_MINIMAL_SEARCH_HOST_LIVE=1。')
  process.exitCode = 2
} else {
  const ctx = new Context()
  try {
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(WebRuntime, { searchProvider: PROVIDER_ID, fetchProvider: 'http' })
    await ctx.plugin(MinimalFreeSearch, {
      takeover: false,
      preferredEngine: 'bing',
      fallback: true,
      market: 'zh-CN',
      safeSearch: 'moderate',
      timeoutMs: 10_000,
      maxResults: 3,
    })
    await ctx.plugin(ToolWeb, { search: true, fetch: false, searchMaxResults: 3, searchMaxQueries: 1 })
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('minimal-free-search-host-smoke'),
      name: 'web_search',
      arguments: { queries: ['DeepSeek Harness'] },
    })
    const text = result.content.map(block => block.type === 'text' ? block.text : '').join('\n')
    if (result.isError || !text.includes('External web content follows') || !text.includes('http')) {
      throw new Error(`正式 web_search 返回异常：${text.slice(0, 500)}`)
    }
    console.log(JSON.stringify({ provider: PROVIDER_ID, isError: result.isError, preview: text.slice(0, 800) }, null, 2))
  } finally {
    await ctx.fiber.dispose()
  }
}
