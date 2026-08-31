// api.js

export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "");

if (!API_URL) {
  console.error(
    "VITE_API_URL is not configured. Check your .env file."
  );
}

export async function apiFetch(path, options = {}) {
  if (!API_URL) {
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        error: "API URL is not configured.",
      },
    };
  }

  const url = `${API_URL}${path}`;

  try {
    const requestId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kt:api-start", { detail: { requestId } }));
    }

    const res = await fetch(url, {
      ...options,

      // Required for Render/Vercel cross-origin cookies.
      credentials: "include",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    let data = null;

    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (import.meta.env.DEV) {
      console.log(
        `[API] ${options.method || "GET"} ${path}`,
        res.status,
        data
      );
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kt:api-complete", { detail: { requestId } }));
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (error) {
    console.error(`[API] Network error: ${url}`, error);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kt:api-complete", { detail: { requestId } }));
    }

    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        error: "Unable to connect to the API server.",
      },
      error,
    };
  }
}