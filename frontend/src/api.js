export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export async function apiFetch(path, options = {}) {
  if (!API_URL) {
    return { ok: false, status: 0, data: { success: false, error: "API URL is not configured." } };
  }

  const url = `${API_URL}${path}`;
  const requestId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const timeoutMs = Number(options.timeoutMs || 30000);
  const callerSignal = options.signal;
  const { timeoutMs: _timeoutMs, signal: _signal, ...fetchOptions } = options;

  async function doFetch(requestUrl, requestOptions, requestIdValue) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort(callerSignal?.reason);
    if (callerSignal) {
      if (callerSignal.aborted) abortFromCaller();
      else callerSignal.addEventListener("abort", abortFromCaller, { once: true });
    }

    try {
      const isFormData = typeof FormData !== "undefined" && requestOptions.body instanceof FormData;
      const headers = {
        Accept: "application/json",
        "X-Request-ID": requestIdValue,
        ...(requestOptions.headers || {}),
      };
      if (!isFormData && requestOptions.body != null) headers["Content-Type"] = "application/json";

      const res = await fetch(requestUrl, {
        ...requestOptions,
        credentials: "include",
        headers,
        signal: controller.signal,
      });

      let data = null;
      try { data = await res.json(); } catch { /* non-JSON response */ }

      if (import.meta.env.DEV) {
        console.debug(`[API] ${requestOptions.method || "GET"} ${path} → ${res.status}`);
      }
      return { ok: res.ok, status: res.status, data };
    } catch (error) {
      const message = error?.name === "AbortError"
        ? "The request timed out. Please try again."
        : "Unable to connect to the API server.";
      if (import.meta.env.DEV) console.debug(`[API] ${path} → ${message}`);
      return { ok: false, status: 0, data: { success: false, error: message }, error };
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kt:api-start", { detail: { requestId } }));
  }

  try {
    let result = await doFetch(url, fetchOptions, requestId);

    // Transparently rotate an expired access token once. Authentication endpoints
    // other than /me are not retried, preventing login/OTP errors from triggering refresh.
    const method = String(fetchOptions.method || "GET").toUpperCase();
    const shouldTryRefresh =
      path === "/api/auth/me" ||
      (!path.startsWith("/api/auth/") && method !== "OPTIONS");
    if (result.status === 401 && shouldTryRefresh) {
      const refreshId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const refresh = await doFetch(`${API_URL}/api/auth/refresh`, { method: "POST" }, refreshId);
      if (refresh.ok) result = await doFetch(url, fetchOptions, requestId);
    }

    return result;
  } finally {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kt:api-complete", { detail: { requestId } }));
    }
  }
}
