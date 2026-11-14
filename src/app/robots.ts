import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/shop", "/collections", "/products", "/about", "/contact", "/size-guide", "/shipping-policy", "/return-policy", "/privacy-policy", "/terms"],
      disallow: ["/admin", "/account", "/checkout", "/cart", "/order-confirmation", "/track-order", "/api"],
    },
    sitemap: "https://u3store.kesug.com/sitemap.xml",
  };
}

