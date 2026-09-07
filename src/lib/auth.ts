import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dvs_clinic_default_secret_key_fallback_2026'
);

export type UserRole = 'Doctor' | 'Receptionist' | 'Pharmacy' | 'Admin';

export interface SessionPayload {
  userId: number;
  username: string;
  role: UserRole;
  name: string;
}

export const SESSION_COOKIE_NAME = 'clinic_session';

export function getRoleHome(role: string): string {
  switch (role) {
    case 'Doctor':
      return '/doctor';
    case 'Receptionist':
      return '/bills';
    case 'Pharmacy':
      return '/pharmacy';
    case 'Admin':
      return '/admin';
    default:
      return '/login';
  }
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      userId: payload.userId as number,
      username: payload.username as string,
      role: payload.role as UserRole,
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
