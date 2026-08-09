import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({
    pattern: "**/index.md",
    base: "./src/content/posts",
  }),

  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    publish: z.boolean().default(false),

    description: z.string().optional(),
    tags: z.preprocess(
      (value) => {
        if (!Array.isArray(value)) return [];
        return value.filter(
          (v): v is string => typeof v === "string" && v.length > 0
        );
      },
      z.array(z.string()).default([])
    ),
    featured: z.boolean().default(false),
  }),
});

export const collections = {
  posts,
};
