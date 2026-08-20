// Every /api response goes through here so `no-store` can never be forgotten —
// clipboards hold whatever people paste, and none of it should sit in a cache.
export function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers,
    },
  });
}
