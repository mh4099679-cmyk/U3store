import { NextResponse } from "next/server";
import { getDb, queryOne, runSql, persistDb } from "@/lib/db";
import { hashPasswordSync, verifyPasswordSync } from "@/lib/db/seed-data";
import {
  createAdminAuthSession,
  destroyAdminSession,
  getCurrentAdmin,
  logAdminAction,
} from "@/lib/auth/session";

export async function GET() {
  const admin = await getCurrentAdmin();
  return NextResponse.json(
    { ok: true, admin },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === "login") {
      const identifier = String(body.username || body.usernameOrEmail || body.email || "")
        .trim()
        .toLowerCase();
      const password = String(body.password || "");
      const db = await getDb();

      const adminRow = queryOne<any>(
        db,
        `SELECT * FROM admin_users WHERE LOWER(username) = ? OR LOWER(email) = ?`,
        [identifier, identifier]
      );
      if (!adminRow || !verifyPasswordSync(password, adminRow.password_hash)) {
        return NextResponse.json(
          { ok: false, error: "Invalid admin username or password." },
          { status: 401 }
        );
      }
      if (adminRow.status !== "ACTIVE") {
        return NextResponse.json(
          { ok: false, error: "Admin account is disabled." },
          { status: 403 }
        );
      }

      await createAdminAuthSession(adminRow.id);
      const admin = await getCurrentAdmin();
      await logAdminAction(admin, "ADMIN_LOGIN", "ADMIN_USER", adminRow.id, {
        identifier,
      });

      return NextResponse.json(
        { ok: true, admin },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (action === "update_my_credentials") {
      const admin = await getCurrentAdmin();
      if (!admin) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
      const db = await getDb();
      const currentPassword = String(body.currentPassword || "");
      const newUsername = String(body.newUsername || admin.username)
        .trim()
        .toLowerCase();
      const newEmail = String(body.newEmail || admin.email)
        .trim()
        .toLowerCase();
      const newPassword = String(body.newPassword || "");

      const adminRow = queryOne<any>(
        db,
        `SELECT * FROM admin_users WHERE id = ?`,
        [admin.id]
      );
      if (!adminRow || !verifyPasswordSync(currentPassword, adminRow.password_hash)) {
        return NextResponse.json(
          { ok: false, error: "Current password is incorrect." },
          { status: 400 }
        );
      }

      if (!newUsername || !newEmail) {
        return NextResponse.json(
          { ok: false, error: "Username and Email cannot be empty." },
          { status: 400 }
        );
      }

      const nextHash =
        newPassword && newPassword.length >= 6
          ? hashPasswordSync(newPassword)
          : adminRow.password_hash;

      runSql(
        db,
        `UPDATE admin_users SET username = ?, email = ?, password_hash = ? WHERE id = ?`,
        [newUsername, newEmail, nextHash, admin.id]
      );
      persistDb(db);

      await logAdminAction(admin, "UPDATE_ADMIN_CREDENTIALS", "ADMIN_USER", admin.id, {
        newUsername,
        newEmail,
        passwordChanged: Boolean(newPassword && newPassword.length >= 6),
      });

      const updatedAdmin = await getCurrentAdmin();
      return NextResponse.json({ ok: true, admin: updatedAdmin });
    }

    if (action === "logout") {
      const admin = await getCurrentAdmin();
      if (admin) {
        await logAdminAction(admin, "ADMIN_LOGOUT", "ADMIN_USER", admin.id, {});
      }
      await destroyAdminSession();
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
