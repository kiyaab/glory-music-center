export const ADMIN_CREDENTIALS: {
  email: string;
  password: string;
  userId: string;
  fullName: string;
} = {
  email: "admin@glory.com",
  password: "admin1234",
  userId: "a574c5c2-335b-47ca-8f52-fe1c0d4d9041",
  fullName: "Glory Administrator",
};

export const ADMIN_AUTH_TOKEN = "glory-admin-auth-token-a574c5c2-335b-47ca-8f52-fe1c0d4d9041";
export const ADMIN_STORAGE_KEY = "glory_admin_session";

export type AdminUserSession = {
  id: string;
  email: string;
  fullName: string;
  role: "admin";
  token: string;
};

export function isMasterAdminToken(token?: string | null): boolean {
  if (!token) return false;
  const clean = token.replace(/^Bearer\s+/i, "").trim();
  return clean === ADMIN_AUTH_TOKEN;
}

export function isMasterAdminId(id?: string | null): boolean {
  return id === ADMIN_CREDENTIALS.userId;
}

export function getClientAdminSession(): AdminUserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminUserSession;
  } catch {
    return null;
  }
}

export function setClientAdminSession(): AdminUserSession {
  const session: AdminUserSession = {
    id: ADMIN_CREDENTIALS.userId,
    email: ADMIN_CREDENTIALS.email,
    fullName: ADMIN_CREDENTIALS.fullName,
    role: "admin",
    token: ADMIN_AUTH_TOKEN,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function clearClientAdminSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
}
