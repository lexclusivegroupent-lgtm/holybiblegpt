import { secretsMatch } from './secureCompare.mjs';

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` only when that env
// var is set. Missing secret used to let anyone trigger the daily push.
// Fail closed: no secret, or a secret that does not match, does no work.
export function authorizeCron(authorization, secret) {
  if (typeof secret !== 'string' || secret.length === 0) {
    return { ok: false, status: 503, error: 'CRON_SECRET is not configured.' };
  }
  const actual = typeof authorization === 'string' ? authorization : '';
  if (!secretsMatch(actual, `Bearer ${secret}`)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}
