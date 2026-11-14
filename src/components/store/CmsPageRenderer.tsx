import React from "react";
import { getDb, queryOne } from "@/lib/db";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { StoreShell } from "./StoreShell";

export async function renderStaticCmsPage(slug: string) {
  const lang = await getStorefrontLanguage();
  const db = await getDb();
  const page = queryOne<any>(db, `SELECT * FROM website_pages WHERE slug = ?`, [slug]);

  const title =
    lang === "ar"
      ? page?.title_ar || page?.title_en || slug
      : page?.title_en || slug;
  const content =
    lang === "ar"
      ? page?.content_ar || page?.content_en || ""
      : page?.content_en || "";

  return (
    <StoreShell>
      <div className="bg-jet text-offwhite py-12 border-b border-darkgray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.25em] text-silver mb-2">
            U3 STORE — LIVE YOURS.
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">{title}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-silver/60 p-8 sm:p-12">
          <p className="text-sm sm:text-base text-darkgray leading-relaxed whitespace-pre-line">
            {content}
          </p>
        </div>
      </div>
    </StoreShell>
  );
}

