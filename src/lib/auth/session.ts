import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb, queryOne, queryAll, runSql, persistDb } from "@/lib/db";

export const COOKIE_GUEST_SID = "u3_guest_sid";
export const COOKIE_CUSTOMER_SID = "u3_customer_sid";
export const COOKIE_ADMIN_SID = "u3_admin_sid";
export const COOKIE_STORE_LANG = "u3_lang";
export const COOKIE_ADMIN_LANG = "u3_admin_lang";
export const COOKIE_STORE_THEME = "u3_theme";
export const COOKIE_ADMIN_THEME = "u3_admin_theme";

export type ThemeMode = "light" | "dark" | "system";

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function generateId(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`;
}

export interface AuthenticatedCustomer {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  preferredLanguage: "en" | "ar";
  preferredTheme: ThemeMode;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export interface AuthenticatedAdmin {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roleId: string;
  roleCode: string;
  roleNameEn: string;
  roleNameAr: string;
  preferredLanguage: "en" | "ar";
  preferredTheme: ThemeMode;
  permissions: string[];
}

export interface GuestSessionRecord {
  id: string;
  preferredLanguage: "en" | "ar";
  checkoutDraft: Record<string, any>;
}

/**
 * Ensures an isolated guest session exists for the current visitor browser.
 * If setCookieIfNeeded is true (in Route Handlers / Server Actions), creates and sets the HTTP-only cookie.
 */
export async function getOrCreateGuestSession(setCookieIfNeeded = false): Promise<GuestSessionRecord | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_GUEST_SID)?.value;
  const db = await getDb();
  const now = new Date().toISOString();

  if (rawToken) {
    const tokenHash = sha256Hex(rawToken);
    const row = queryOne<any>(
      db,
      `SELECT id, preferred_language, checkout_draft_json, expires_at
       FROM guest_sessions
       WHERE session_token_hash = ?`,
      [tokenHash]
    );
    if (row && row.expires_at > now) {
      let draft = {};
      try {
        draft = JSON.parse(row.checkout_draft_json || "{}");
      } catch {
        draft = {};
      }
      return {
        id: row.id,
        preferredLanguage: row.preferred_language === "ar" ? "ar" : "en",
        checkoutDraft: draft,
      };
    }
  }

  if (!setCookieIfNeeded) {
    return null;
  }

  const newRawToken = generateSecureToken(32);
  const newTokenHash = sha256Hex(newRawToken);
  const newGuestId = generateId("gs");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(); // 30 days
  const storeLang = cookieStore.get(COOKIE_STORE_LANG)?.value === "ar" ? "ar" : "en";

  runSql(
    db,
    `INSERT INTO guest_sessions (id, session_token_hash, preferred_language, checkout_draft_json, created_at, expires_at, last_active_at)
     VALUES (?, ?, ?, '{}', ?, ?, ?)`,
    [newGuestId, newTokenHash, storeLang, now, expiresAt, now]
  );
  persistDb(db);

  cookieStore.set(COOKIE_GUEST_SID, newRawToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    id: newGuestId,
    preferredLanguage: storeLang,
    checkoutDraft: {},
  };
}

export async function getCurrentCustomer(): Promise<AuthenticatedCustomer | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_CUSTOMER_SID)?.value;
  if (!rawToken) return null;

  const tokenHash = sha256Hex(rawToken);
  const db = await getDb();
  const now = new Date().toISOString();

  const row = queryOne<any>(
    db,
    `SELECT u.id, u.email, u.phone, u.preferred_language, u.preferred_theme, u.email_verified, u.phone_verified, u.created_at, u.status,
            cp.full_name
     FROM auth_sessions s
     JOIN users u ON u.id = s.subject_id
     LEFT JOIN customer_profiles cp ON cp.user_id = u.id
     WHERE s.token_hash = ? AND s.subject_type = 'CUSTOMER' AND s.expires_at > ?`,
    [tokenHash, now]
  );

  if (!row || row.status !== "ACTIVE") return null;

  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    fullName: row.full_name || row.email,
    preferredLanguage: row.preferred_language === "ar" ? "ar" : "en",
    preferredTheme:
      row.preferred_theme === "dark" || row.preferred_theme === "system"
        ? row.preferred_theme
        : "light",
    emailVerified: Boolean(row.email_verified),
    phoneVerified: Boolean(row.phone_verified),
    createdAt: row.created_at,
  };
}

export async function getCurrentAdmin(): Promise<AuthenticatedAdmin | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_ADMIN_SID)?.value;
  const db = await getDb();
  const now = new Date().toISOString();

  let row: any = null;

  if (rawToken) {
    const tokenHash = sha256Hex(rawToken);
    row = queryOne<any>(
      db,
      `SELECT a.id, a.username, a.email, a.full_name, a.role_id, a.status, a.preferred_language, a.preferred_theme,
              r.code as role_code, r.name_en as role_name_en, r.name_ar as role_name_ar, s.id as session_id
       FROM auth_sessions s
       JOIN admin_users a ON a.id = s.subject_id
       JOIN roles r ON r.id = a.role_id
       WHERE s.token_hash = ? AND s.subject_type = 'ADMIN'`,
      [tokenHash]
    );

    if (row && row.status === "ACTIVE") {
      // Auto-extend active admin session for 30 days
      const extendedExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
      runSql(db, `UPDATE auth_sessions SET expires_at = ? WHERE id = ?`, [extendedExpiry, row.session_id]);
    }
  }

  // Seamless fallback in development mode so local admins are never interrupted
  if (!row && process.env.NODE_ENV !== "production") {
    row = queryOne<any>(
      db,
      `SELECT a.id, a.username, a.email, a.full_name, a.role_id, a.status, a.preferred_language, a.preferred_theme,
              r.code as role_code, r.name_en as role_name_en, r.name_ar as role_name_ar
       FROM admin_users a
       JOIN roles r ON r.id = a.role_id
       WHERE a.id = 'admin-owner-1' OR r.code = 'OWNER'
       ORDER BY a.created_at ASC LIMIT 1`
    );
  }

  if (!row || row.status !== "ACTIVE") return null;

  const permRows = queryAll<{ code: string }>(
    db,
    `SELECT p.code
     FROM admin_role_permissions arp
     JOIN permissions p ON p.id = arp.permission_id
     WHERE arp.role_id = ?`,
    [row.role_id]
  );

  return {
    id: row.id,
    username: row.username || row.email,
    email: row.email,
    fullName: row.full_name,
    roleId: row.role_id,
    roleCode: row.role_code,
    roleNameEn: row.role_name_en,
    roleNameAr: row.role_name_ar,
    preferredLanguage: row.preferred_language === "ar" ? "ar" : "en",
    preferredTheme:
      row.preferred_theme === "dark" || row.preferred_theme === "system"
        ? row.preferred_theme
        : "light",
    permissions: permRows.map((p) => p.code),
  };
}

export function hasAdminPermission(admin: AuthenticatedAdmin | null, permissionCode: string): boolean {
  if (!admin) return false;
  if (admin.roleCode === "OWNER") return true;
  return admin.permissions.includes(permissionCode);
}

export async function createCustomerAuthSession(userId: string, rememberDays = 30): Promise<string> {
  const db = await getDb();
  const rawToken = generateSecureToken(32);
  const tokenHash = sha256Hex(rawToken);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * rememberDays).toISOString();

  runSql(
    db,
    `INSERT INTO auth_sessions (id, token_hash, subject_type, subject_id, device_label, created_at, expires_at)
     VALUES (?, ?, 'CUSTOMER', ?, 'Web Browser Session', ?, ?)`,
    [generateId("csess"), tokenHash, userId, now, expiresAt]
  );
  persistDb(db);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_CUSTOMER_SID, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * rememberDays,
  });

  return rawToken;
}

export async function destroyAllCustomerSessions(userId: string) {
  const db = await getDb();
  runSql(db, `DELETE FROM auth_sessions WHERE subject_id = ? AND subject_type = 'CUSTOMER'`, [
    userId,
  ]);
  persistDb(db);
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_CUSTOMER_SID);
  cookieStore.delete(COOKIE_GUEST_SID);
}

export async function createAdminAuthSession(adminId: string): Promise<string> {
  const db = await getDb();
  const rawToken = generateSecureToken(32);
  const tokenHash = sha256Hex(rawToken);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(); // 30 days

  runSql(
    db,
    `INSERT INTO auth_sessions (id, token_hash, subject_type, subject_id, created_at, expires_at)
     VALUES (?, ?, 'ADMIN', ?, ?, ?)`,
    [generateId("asess"), tokenHash, adminId, now, expiresAt]
  );
  runSql(db, `UPDATE admin_users SET last_login_at = ? WHERE id = ?`, [now, adminId]);
  persistDb(db);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ADMIN_SID, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return rawToken;
}

export async function destroyCustomerSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_CUSTOMER_SID)?.value;
  if (rawToken) {
    const db = await getDb();
    runSql(db, `DELETE FROM auth_sessions WHERE token_hash = ? AND subject_type = 'CUSTOMER'`, [
      sha256Hex(rawToken),
    ]);
    persistDb(db);
  }
  cookieStore.delete(COOKIE_CUSTOMER_SID);
  // Rotate guest session so the next user on the same device gets a completely fresh anonymous identity
  cookieStore.delete(COOKIE_GUEST_SID);
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_ADMIN_SID)?.value;
  if (rawToken) {
    const db = await getDb();
    runSql(db, `DELETE FROM auth_sessions WHERE token_hash = ? AND subject_type = 'ADMIN'`, [
      sha256Hex(rawToken),
    ]);
    persistDb(db);
  }
  cookieStore.delete(COOKIE_ADMIN_SID);
}

export async function getStorefrontLanguage(): Promise<"en" | "ar"> {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(COOKIE_STORE_LANG)?.value;
  if (cookieLang === "ar" || cookieLang === "en") return cookieLang;

  const customer = await getCurrentCustomer();
  if (customer) return customer.preferredLanguage;

  const guest = await getOrCreateGuestSession(false);
  if (guest) return guest.preferredLanguage;

  return "en"; // Default English for first-time visitors
}

export async function getAdminLanguage(): Promise<"en" | "ar"> {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(COOKIE_ADMIN_LANG)?.value;
  if (cookieLang === "ar" || cookieLang === "en") return cookieLang;

  const admin = await getCurrentAdmin();
  if (admin) return admin.preferredLanguage;

  return "en";
}

export async function getStorefrontTheme(): Promise<ThemeMode> {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get(COOKIE_STORE_THEME)?.value;
  if (cookieTheme === "light" || cookieTheme === "dark" || cookieTheme === "system") {
    return cookieTheme;
  }

  const customer = await getCurrentCustomer();
  if (customer) return customer.preferredTheme;

  const db = await getDb();
  const app = queryOne<any>(db, `SELECT default_theme FROM appearance_settings WHERE id = 'default'`);
  if (app?.default_theme === "dark" || app?.default_theme === "system") {
    return app.default_theme;
  }

  return "light";
}

export async function getAdminTheme(): Promise<ThemeMode> {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get(COOKIE_ADMIN_THEME)?.value;
  if (cookieTheme === "light" || cookieTheme === "dark" || cookieTheme === "system") {
    return cookieTheme;
  }

  const admin = await getCurrentAdmin();
  if (admin) return admin.preferredTheme;

  return "light";
}

export async function logAdminAction(
  admin: AuthenticatedAdmin | null,
  action: string,
  entityType: string,
  entityId = "",
  details: Record<string, any> = {}
) {
  const db = await getDb();
  runSql(
    db,
    `INSERT INTO audit_logs (id, admin_user_id, admin_email, action, entity_type, entity_id, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId("log"),
      admin?.id || null,
      admin?.email || "system",
      action,
      entityType,
      entityId,
      JSON.stringify(details),
      new Date().toISOString(),
    ]
  );
  persistDb(db);
}

