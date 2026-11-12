// Single place where the frontend talks to the backend. Every call returns a Promise.
window.CC_API = (() => {
  const TOKEN_KEY = "cc_token";

  function getBaseUrl() {
    // If on HTTPS or any hosted domain (Render, custom domain), always use relative /api
    if (typeof window !== "undefined" && (window.location.protocol === "https:" || !["localhost", "127.0.0.1"].includes(window.location.hostname))) {
      return "/api";
    }
    if (typeof window !== "undefined" && window.CC_CONFIG && window.CC_CONFIG.API_BASE) {
      return window.CC_CONFIG.API_BASE;
    }
    return "/api";
  }

  async function request(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem(TOKEN_KEY);
    if (auth && token) headers.Authorization = "Bearer " + token;

    let res;
    try {
      const baseUrl = getBaseUrl().replace(/\/+$/, "");
      const cleanPath = path.startsWith("/") ? path : "/" + path;
      res = await fetch(baseUrl + cleanPath, {
        method, headers, body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw new Error("Cannot reach the server. Please check that the backend is running.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  return {
    setToken: (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
    isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),

    health:          () => request("/health", { auth: false }),
    register:        (b) => request("/auth/register", { method: "POST", body: b, auth: false }),
    login:           (b) => request("/auth/login", { method: "POST", body: b, auth: false }),
    me:              () => request("/auth/me"),
    getInitiatives:  () => request("/initiatives", { auth: false }),
    submitComplaint: (b) => request("/complaints", { method: "POST", body: b }),
    myComplaints:    () => request("/complaints/mine"),
    trackComplaint:  (ref) => request("/complaints/track/" + encodeURIComponent(ref), { auth: false }),
    sendFeedback:    (b) => request("/feedback", { method: "POST", body: b, auth: false }),
    getStats:        () => request("/stats", { auth: false })
  };
})();
