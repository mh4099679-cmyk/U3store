import React from "react";
import { getDb, queryOne } from "@/lib/db";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { StoreShell } from "@/components/store/StoreShell";
import { ContactPageClient } from "@/components/store/ContactPageClient";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const lang = await getStorefrontLanguage();
  const db = await getDb();
  const footerSettings = queryOne<any>(db, `SELECT * FROM footer_settings WHERE id = 'default'`);

  return (
    <StoreShell>
      <ContactPageClient lang={lang} footerSettings={footerSettings} />
    </StoreShell>
  );
}
