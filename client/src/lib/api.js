// The Worker serves this SPA and the API from the same origin, so /api is relative.
// There is deliberately no VITE_SERVER_URL escape hatch — a split origin would mean
// CORS and a second deploy target for no benefit.

async function request(path, options) {
  const response = await fetch(`/api${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `request failed (${response.status})`);
  return body;
}

export const createClipboard = () => request("/clipboard", { method: "POST" });

export const getEntries = (slug) => request(`/c/${slug}`);

export const addEntry = (slug, content, ttl) =>
  request(`/c/${slug}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content, ttl }),
  });

export const deleteEntry = (slug, id) => request(`/c/${slug}/${id}`, { method: "DELETE" });
