const DEFAULT_API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000)
const FETCH_TIMEOUT_WRAPPED = Symbol.for('sms.fetchTimeoutWrapped')

export const createApiTimeoutError = (timeoutMs, url) => {
  const seconds = Math.max(1, Math.ceil(timeoutMs / 1000))
  const error = new Error(`Something went wrong!. Please try again.`)
  error.name = 'TimeoutError'
  error.code = 'API_TIMEOUT'
  error.timeoutMs = timeoutMs
  error.url = url
  return error
}

export const isApiTimeoutError = (error) => (
  error?.code === 'API_TIMEOUT' || error?.name === 'TimeoutError'
)

export const getApiErrorMessage = (error, fallbackText = 'Request failed. Please try again.') => {
  if (isApiTimeoutError(error)) {
    return error.message
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message
  }

  return fallbackText
}

export const installFetchTimeout = (timeoutMs = DEFAULT_API_TIMEOUT_MS) => {
  if (typeof globalThis.fetch !== 'function') {
    return
  }

  if (globalThis.fetch[FETCH_TIMEOUT_WRAPPED]) {
    return
  }

  const originalFetch = globalThis.fetch.bind(globalThis)

  const fetchWithTimeout = async (input, init = {}) => {
    const controller = new AbortController()
    const requestSignal = init?.signal
    let didTimeout = false

    const cleanupAbortListener = requestSignal
      ? (() => {
          const handleAbort = () => controller.abort(requestSignal.reason)

          if (requestSignal.aborted) {
            handleAbort()
            return () => {}
          }

          requestSignal.addEventListener('abort', handleAbort, { once: true })
          return () => requestSignal.removeEventListener('abort', handleAbort)
        })()
      : () => {}

    const timeoutId = setTimeout(() => {
      didTimeout = true
      controller.abort()
    }, timeoutMs)

    try {
      return await originalFetch(input, {
        ...init,
        signal: controller.signal,
      })
    } catch (error) {
      if (didTimeout) {
        const url = typeof input === 'string' ? input : input?.url
        throw createApiTimeoutError(timeoutMs, url)
      }

      throw error
    } finally {
      clearTimeout(timeoutId)
      cleanupAbortListener()
    }
  }

  Object.defineProperty(fetchWithTimeout, FETCH_TIMEOUT_WRAPPED, {
    value: true,
    enumerable: false,
  })

  globalThis.fetch = fetchWithTimeout
}
