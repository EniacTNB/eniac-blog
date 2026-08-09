export interface Project {
  title: string;
  summary: string;
  status: string;
  period: string;
  tags: string[];
  href: string;
  external?: boolean;
  action: string;
}

export const projects: Project[] = [
  {
    title: "ENIAC.LOG",
    summary:
      "一个面向长期技术写作的个人博客,关注人工智能、复杂系统、产品工程与知识管理。",
    status: "持续更新",
    period: "2026 —",
    tags: [
      "Astro",
      "TypeScript",
      "Pagefind",
      "GitHub Pages",
    ],
    href: "/",
    action: "访问项目",
  },
  {
    title: "Obsidian Publishing Pipeline",
    summary:
      "将私人 Obsidian Vault 中经过明确授权的文章,自动同步、构建并发布到公开博客的双仓库流水线。",
    status: "运行中",
    period: "2026 —",
    tags: [
      "Obsidian",
      "GitHub Actions",
      "Markdown",
      "Automation",
    ],
    href:
      "https://github.com/EniacTNB/eniac-blog",
    external: true,
    action: "查看源码",
  },
];
