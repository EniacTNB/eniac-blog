import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const siteURL = new URL(
    `${import.meta.env.BASE_URL}/`.replace(/\/+/g, "/"),
    site
  );

  const sitemapURL = new URL(
    "sitemap-index.xml",
    siteURL
  );

  const content = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${sitemapURL.href}`,
    "",
  ].join("\n");

  return new Response(content, {
    headers: {
      "Content-Type":
        "text/plain; charset=utf-8",
    },
  });
};
