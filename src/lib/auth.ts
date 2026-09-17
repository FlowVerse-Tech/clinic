import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dvs_clinic_default_secret_key_fallback_2026'
);

export type UserRole = 'Doctor' | 'Receptionist' | 'Pharmacy' | 'Admin';

export const VALID_ROLES: UserRole[] = ['Doctor', 'Receptionist', 'Pharmacy', 'Admin'];

export interface SessionPayload {
  userId: number;
  username: string;
  role: string;
  roles?: UserRole[];
  name: string;
}

export const SESSION_COOKIE_NAME = 'clinic_session';

export function parseRoles(roleStringOrArray?: string | string[] | null): UserRole[] {
  if (!roleStringOrArray) return [];
  if (Array.isArray(roleStringOrArray)) {
    return roleStringOrArray
      .map((r) => r.trim())
      .filter((r): r is UserRole => VALID_ROLES.includes(r as UserRole));
  }
  return roleStringOrArray
    .split(',')
    .map((r) => r.trim())
    .filter((r): r is UserRole => VALID_ROLES.includes(r as UserRole));
}

export function formatRoles(roles: (string | UserRole)[]): string {
  const parsed = parseRoles(roles);
  // Sort in conventional order
  const order: Record<UserRole, number> = {
    Admin: 1,
    Doctor: 2,
    Receptionist: 3,
    Pharmacy: 4,
  };
  parsed.sort((a, b) => (order[a] || 99) - (order[b] || 99));
  return parsed.join(', ');
}

export function hasRole(
  userRoleStringOrArray?: string | string[] | null,
  targetRole?: UserRole | UserRole[]
): boolean {
  const roles = parseRoles(userRoleStringOrArray);
  if (roles.includes('Admin')) return true; // Admin has universal access
  if (!targetRole) return false;
  if (Array.isArray(targetRole)) {
    return targetRole.some((r) => roles.includes(r));
  }
  return roles.includes(targetRole);
}

export function getRoleHome(role?: string | string[] | null): string {
  const roles = parseRoles(role);
  if (roles.includes('Admin')) return '/admin';
  if (roles.includes('Doctor')) return '/doctor';
  if (roles.includes('Receptionist')) return '/bills';
  if (roles.includes('Pharmacy')) return '/pharmacy';
  return '/login';
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const roles = parseRoles(payload.role || payload.roles);
  const roleString = payload.role || roles.join(', ');

  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
    role: roleString,
    name: payload.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const roleStr = (payload.role as string) || '';
    return {
      userId: payload.userId as number,
      username: payload.username as string,
      role: roleStr,
      roles: parseRoles(roleStr),
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;
  return verifySessionToken(sessionToken);
}
