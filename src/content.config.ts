import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({
    pattern: "**/index.md",
    base: "./src/content/posts",
  }),

  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      publish: z.boolean().default(false),

      description: z.string().optional(),

      tags: z.preprocess(
        (value) => {
          if (!Array.isArray(value)) return [];

          return value.filter(
            (v): v is string =>
              typeof v === "string" &&
              v.length > 0
          );
        },
        z.array(z.string()).default([])
      ),

      featured: z.boolean().default(false),

      cover: z.preprocess(
        (v) => {
          if (
            v === null ||
            v === undefined ||
            (typeof v === "string" &&
              v.trim() === "")
          ) {
            return undefined;
          }

          return v;
        },
        image().optional()
      ),
      coverAlt: z
        .string()
        .trim()
        .min(1)
        .optional(),
      coverFocus: z
        .string()
        .default("50% 50%"),
    }),
});

export const collections = {
  posts,
};
