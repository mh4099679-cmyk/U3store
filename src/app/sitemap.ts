import type { MetadataRoute } from "next";
import { getDb, queryAll } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://u3store.kesug.com";
  const db = await getDb();

  const products = queryAll<{ slug: string; updated_at: string }>(
    db,
    `SELECT slug, updated_at FROM products WHERE status = 'ACTIVE'`
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/shop",
    "/collections",
    "/about",
    "/contact",
    "/size-guide",
    "/shipping-policy",
    "/return-policy",
    "/privacy-policy",
    "/terms",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/products/${p.slug}`,
    lastModified: new Date(p.updated_at),
  }));

  return [...staticRoutes, ...productRoutes];
}

