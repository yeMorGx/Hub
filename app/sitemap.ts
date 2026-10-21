import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://hub-one-azure.vercel.app/site",
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://hub-one-azure.vercel.app/download",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: "https://hub-one-azure.vercel.app/privacy",
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
