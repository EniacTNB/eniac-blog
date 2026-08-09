import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

function postSlug(id) {
  return id
    .replace(/\/index\.md$/, "")
    .replace(/\/index$/, "");
}

export async function GET(context) {
  const posts = (
    await getCollection(
      "posts",
      ({ data }) => data.publish
    )
  ).sort(
    (a, b) =>
      b.data.date.getTime() -
      a.data.date.getTime()
  );

  const siteURL = new URL(
    `${import.meta.env.BASE_URL}/`.replace(/\/+/g, "/"),
    context.site
  );

  return rss({
    title: "ENIAC.LOG",
    description:
      "关于人工智能、复杂系统与产品工程的技术博客",
    site: siteURL,

    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,

      description:
        post.data.description ??
        `${post.data.title} - ENIAC.LOG`,

      categories: post.data.tags,

      link: `posts/${postSlug(post.id)}/`,
    })),

    customData: [
      "<language>zh-CN</language>",
      "<generator>Astro</generator>",
    ].join(""),
  });
}
