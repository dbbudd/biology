/* =============================================================
   Who is calling
   -------------------------------------------------------------
   The service trusts the caller's token, never the request body.
   In Azure, the platform has already validated the Entra token and
   hands us `x-ms-client-principal`; locally there is no such thing,
   so a named dev identity can be substituted — and only when the
   DEV_IDENTITY variable is set, which must never be set in
   production.

   The role check is the "faculty only" gate at the API level. The
   page's permissions control who can *see* the form; this controls
   who can *use* it, and they are not the same thing.
   ============================================================= */

export class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function decodeClientPrincipal(headerValue) {
  try {
    const json = Buffer.from(headerValue, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

/**
 * @returns {{id: string, name: string, email: string, roles: string[], source: string}|undefined}
 */
export function identify(headers, env = process.env) {
  const principal = headers['x-ms-client-principal'] || headers['X-MS-CLIENT-PRINCIPAL'];
  if (principal) {
    const decoded = decodeClientPrincipal(principal);
    if (!decoded) return undefined;

    const claims = decoded.claims || [];
    const claim = (type) => {
      const found = claims.find((c) => String(c.typ).endsWith(type));
      return found ? found.val : '';
    };

    return {
      id: decoded.userId || claim('objectidentifier'),
      name: decoded.userDetails || claim('name') || 'Unknown',
      email: claim('emailaddress') || claim('email') || decoded.userDetails || '',
      roles: (decoded.userRoles || []).concat(
        claims.filter((c) => String(c.typ).endsWith('roles')).map((c) => c.val)
      ),
      source: 'entra',
    };
  }

  if (env.DEV_IDENTITY) {
    return {
      id: 'dev',
      name: env.DEV_IDENTITY,
      email: env.DEV_EMAIL || 'dev@example.invalid',
      roles: ['Teacher'],
      source: 'dev',
    };
  }

  return undefined;
}

/**
 * Reject anyone without the teacher role, when a role is configured.
 *
 * Left unset it allows any authenticated caller, which is the right default
 * for a first run in a tenant where the group does not exist yet — but set it
 * before real staff use this.
 */
export function authorise(actor, env = process.env) {
  if (!actor) throw new AuthError(401, 'Not signed in');

  const required = env.TEACHER_ROLE;
  if (!required) return actor;

  if (!(actor.roles || []).includes(required)) {
    throw new AuthError(403, 'You do not have access to request changes');
  }
  return actor;
}
