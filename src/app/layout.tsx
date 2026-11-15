import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getStorefrontLanguage, getStorefrontTheme } from "@/lib/auth/session";
import { getDb, queryOne } from "@/lib/db";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getStorefrontLanguage();
  const db = await getDb();
  const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);

  const title =
    lang === "ar"
      ? settings?.seo_title_ar || "U3 STORE | LIVE YOURS. أحذية فاخرة في مصر"
      : settings?.seo_title_en || "U3 STORE | LIVE YOURS. Premium Footwear Egypt";

  const description =
    lang === "ar"
      ? settings?.seo_description_ar || "U3 STORE — علامة الأحذية الفاخرة والعصرية في مصر."
      : settings?.seo_description_en || "U3 STORE — Premium Streetwear & Modern Footwear in Egypt.";

  return {
    title,
    description,
    icons: {
      icon: [
        { url: "/icon.png", type: "image/png" },
        { url: "/favicon.ico" },
      ],
      shortcut: "/icon.png",
      apple: "/apple-icon.png",
    },
    openGraph: {
      title,
      description,
      images: ["/logo.png"],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getStorefrontLanguage();
  const theme = await getStorefrontTheme();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const themeInitScript = `
    (function() {
      try {
        var isAdmin = window.location.pathname.startsWith('/admin');
        var cookieName = isAdmin ? 'u3_admin_theme=' : 'u3_theme=';
        var match = document.cookie.split('; ').find(function(row) { return row.startsWith(cookieName); });
        var mode = match ? decodeURIComponent(match.split('=')[1]) : '${theme}';
        var isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {}
    })();
  `;

  return (
    <html
      lang={lang}
      dir={dir}
      suppressHydrationWarning
      className={theme === "dark" ? "dark" : ""}
    >
      <head>
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${
          lang === "ar" ? "font-arabic" : "font-sans"
        } antialiased min-w-[320px] max-w-full overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
