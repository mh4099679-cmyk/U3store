import React from "react";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { getDb, queryOne } from "@/lib/db";
import { StoreShell } from "@/components/store/StoreShell";
import { SizeGuidePageClient } from "@/components/store/SizeGuidePageClient";

export const dynamic = "force-dynamic";

export default async function SizeGuidePage() {
  const lang = await getStorefrontLanguage();
  const db = await getDb();
  const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);
  const visibleCategories = settings?.visible_categories || "BOTH";

  return (
    <StoreShell>
      <SizeGuidePageClient lang={lang} visibleCategories={visibleCategories} />
    </StoreShell>
  );
}
