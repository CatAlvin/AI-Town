export const DEFAULT_NETWORK_TIMEOUT_MS = 1900;

export function createRequestGate() {
  const active = new Set();
  return {
    isActive(key) {
      return active.has(key);
    },
    async run(key, task) {
      if (active.has(key)) {
        return {
          ok: false,
          code: "duplicate",
          message: "请求正在进行中，请稍候。",
        };
      }
      active.add(key);
      try {
        return { ok: true, value: await task() };
      } catch (error) {
        return {
          ok: false,
          code: classifyNetworkError(error),
          message: toNetworkMessage(error),
          error,
        };
      } finally {
        active.delete(key);
      }
    },
  };
}

export async function fetchJsonWithTimeout(url, options = {}, config = {}) {
  const timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : DEFAULT_NETWORK_TIMEOUT_MS;
  const fetchImpl = config.fetchImpl || fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.name = "HttpError";
      error.status = response.status;
      throw error;
    }
    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(`请求超过 ${timeoutMs}ms`);
      timeoutError.name = "TimeoutError";
      timeoutError.cause = error;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function classifyNetworkError(error) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return "timeout";
  if (error?.name === "HttpError") return "http";
  return "network";
}

export function toNetworkMessage(error) {
  const code = classifyNetworkError(error);
  if (code === "timeout") return "网络响应变慢，已使用本地内容。";
  if (code === "http") return "服务端暂时不可用，已使用本地内容。";
  return "网络暂时不可用，已使用本地内容。";
}
