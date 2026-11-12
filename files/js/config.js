// Dynamic API Base: automatically uses relative '/api' when hosted or on HTTPS,
// and 'http://localhost:4000/api' when running locally on live-server (e.g. port 5500).
window.CC_CONFIG = {
  API_BASE: (typeof window !== "undefined" && (window.location.protocol === "https:" || !["localhost", "127.0.0.1"].includes(window.location.hostname)))
    ? "/api"
    : "http://localhost:4000/api"
};
