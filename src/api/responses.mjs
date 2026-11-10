export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body ?? {}), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export async function readJson(request, maxLength) {
  const text = await request.text();
  if (text.length > maxLength) return { tooLarge: true };
  if (!text) return {};
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { invalid: true };
    return body;
  } catch {
    return { invalid: true };
  }
}

export async function callHandler(handler, { method, authorization, query, body }) {
  const res = {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    setHeader() {
      return this;
    },
  };
  await handler(
    {
      method,
      headers: { authorization },
      query: query ?? {},
      body,
    },
    res,
  );
  return json(res.payload, res.statusCode);
}
