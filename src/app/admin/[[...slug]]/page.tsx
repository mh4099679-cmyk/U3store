import React from "react";
import type { Metadata } from "next";
import { getCurrentAdmin, getAdminLanguage } from "@/lib/auth/session";
import { AdminPortalClient } from "@/components/admin/AdminPortalClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "U3 STORE ADMIN",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

const SLUG_TO_SECTION: Record<string, string> = {
  products: "products",
  categories: "categories",
  collections: "collections",
  inventory: "inventory",
  orders: "orders",
  customers: "customers",
  shipping: "shipping",
  payments: "payments",
  invoices: "invoices",
  returns: "returns",
  discounts: "discounts",
  content: "homepage",
  pages: "pages",
  media: "media",
  translations: "translations",
  notifications: "notifications",
  reports: "reports",
  users: "users",
  permissions: "users",
  "activity-logs": "activity-logs",
  settings: "settings",
};

export default async function AdminSubRoutePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const firstSegment = slug?.[0] || "dashboard";
  const initialSection = SLUG_TO_SECTION[firstSegment] || "dashboard";

  const admin = await getCurrentAdmin();
  const lang = await getAdminLanguage();

  return (
    <AdminPortalClient
      initialAdmin={admin}
      initialLang={lang}
      initialSection={initialSection}
    />
  );
}

