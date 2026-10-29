import { cookies } from 'next/headers';
import { ACCESS } from './access';
import type { Role } from './types';

export const SUPERVISOR_NAME = process.env.SUPERVISOR_NAME || 'Housekeeping Supervisor';
export const ADMIN_NAME = process.env.ADMIN_NAME || 'HR & Admin';

/** True when the request carries the role's key cookie (or no key is configured). */
export async function hasRole(role: Role): Promise<boolean> {
  const { envKey, cookie } = ACCESS[role];
  const expected = process.env[envKey];
  if (!expected) return true;
  const jar = await cookies();
  return jar.get(cookie)?.value === expected;
}

/** Returns a 403 response unless the caller has at least one of the roles. */
export async function denyUnless(...roles: Role[]): Promise<Response | null> {
  for (const role of roles) {
    if (await hasRole(role)) return null;
  }
  return Response.json({ error: 'Not authorised. Open the link shared with you again.' }, { status: 403 });
}
