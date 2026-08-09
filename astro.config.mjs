// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import remarkObsidian from "./src/plugins/remark-obsidian.mjs";

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.3n1ac.com',

  integrations: [
    sitemap(),
  ],

  markdown: {
    shikiConfig: {
      theme: "github-light",
      wrap: true,
    },

    processor: unified({
      remarkPlugins: [
        [
          remarkObsidian,
          {
            postsDirectory: "./src/content/posts",
          },
        ],
      ],
    }),
  },
});
