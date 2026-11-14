import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getDb, queryOne } from "@/lib/db";
import { getCurrentAdmin, getCurrentCustomer, getOrCreateGuestSession } from "@/lib/auth/session";
import { verifyOrderAccess } from "@/lib/services/commerce";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const submissionId = (searchParams.get("submissionId") || "").trim();
  const accessToken = (searchParams.get("token") || "").trim();

  if (!submissionId) {
    return NextResponse.json({ ok: false, error: "Submission ID required" }, { status: 400 });
  }

  const db = await getDb();
  const sub = queryOne<any>(db, `SELECT * FROM payment_submissions WHERE id = ?`, [submissionId]);
  if (!sub || !sub.receipt_file_path) {
    return NextResponse.json({ ok: false, error: "Receipt not found" }, { status: 404 });
  }

  const order = queryOne<any>(db, `SELECT * FROM orders WHERE id = ?`, [sub.order_id]);
  const admin = await getCurrentAdmin();
  const customer = await getCurrentCustomer();
  const guest = await getOrCreateGuestSession(false);

  if (!verifyOrderAccess(db, order, customer, admin, guest, accessToken)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const safeName = path.basename(sub.receipt_file_path);
  const fullPath = path.join(process.cwd(), "data", "receipts", safeName);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ ok: false, error: "Receipt file missing" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(fullPath);
  const ext = path.extname(safeName).toLowerCase();
  const mimeType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, no-store",
    },
  });
}
