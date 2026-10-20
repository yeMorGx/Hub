import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/site", "/download", "/privacy", "/marketing/"],
      disallow: [
        "/api/",
        "/auth/",
        "/invite",
        "/login",
        "/mfa",
        "/reset-password",
        "/demo",
        "/offline.html",
      ],
    },
    sitemap: "https://hub-one-azure.vercel.app/sitemap.xml",
  };
}
