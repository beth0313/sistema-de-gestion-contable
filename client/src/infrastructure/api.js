const call = async (m, u, b) => {
  const t = localStorage.getItem("token");
  const r = await fetch("/api" + u, {
    method: m,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: "Bearer " + t } : {}),
    },
    body: b ? JSON.stringify(b) : undefined,
  });
  if (r.status === 401 && !u.startsWith("/auth/")) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("logout"));
  }
  if (r.status === 204) return null;
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Error");
  return d;
};
export const api = {
  get: (u) => call("GET", u),
  post: (u, b) => call("POST", u, b),
  put: (u, b) => call("PUT", u, b),
  patch: (u, b) => call("PATCH", u, b),
  del: (u) => call("DELETE", u),
};
