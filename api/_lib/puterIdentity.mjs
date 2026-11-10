// Server-side check that the caller is the Puter account named by userId.
// puter.js exposes the session on `puter.authToken`. Puter's API resolves it
// at GET https://api.puter.com/whoami (Authorization: Bearer). The username
// in that response is the only id we will use for KV keys.
export const PUTER_WHOAMI_URL = 'https://api.puter.com/whoami';

// Puter usernames are a single path segment. Reject anything else so a
// client cannot aim a KV key at `user:<other>:data`.
export const USERNAME_RE = /^[A-Za-z0-9_-]{1,64}$/;

const MAX_TOKEN_LENGTH = 8192;

export function headerValue(value) {
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
}

export function bearerToken(authorization) {
  if (typeof authorization !== 'string') return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization);
  if (!match) return null;
  const token = match[1];
  if (token === 'undefined' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  return token;
}

export async function verifyPuterIdentity(authorization, requestedUserId, fetchImpl = fetch) {
  const token = bearerToken(authorization);
  if (!token) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }
  if (typeof requestedUserId !== 'string' || !USERNAME_RE.test(requestedUserId)) {
    return { ok: false, status: 400, error: 'Missing userId' };
  }

  let response;
  try {
    response = await fetchImpl(PUTER_WHOAMI_URL, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
  } catch {
    return { ok: false, status: 503, error: 'Could not verify identity.' };
  }

  // Do not follow redirects. A redirect would risk sending the bearer token
  // to a different host.
  if (response.status >= 300 && response.status < 400) {
    return { ok: false, status: 503, error: 'Could not verify identity.' };
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }
  if (!response.ok) {
    return { ok: false, status: 503, error: 'Could not verify identity.' };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: 503, error: 'Could not verify identity.' };
  }

  const username = body && typeof body.username === 'string' ? body.username : '';
  if (!USERNAME_RE.test(username)) {
    return { ok: false, status: 503, error: 'Could not verify identity.' };
  }
  if (username !== requestedUserId) {
    return { ok: false, status: 403, error: 'You can only access your own account.' };
  }
  return { ok: true, username };
}
