/** 插件对外使用的稳定错误类型。 */
export class SearchPluginError extends Error {
  constructor(message, code, options = {}) {
    super(message, options)
    this.name = 'SearchPluginError'
    this.code = code
  }
}

/** 判断失败是否来自调用方或生命周期取消。 */
export function isAbortFailure(error, signal) {
  return signal?.aborted === true || error?.name === 'AbortError' || error?.code === 'SEARCH_ABORTED'
}
