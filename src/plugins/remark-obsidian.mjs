import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const calloutTitles = {
  note: "说明",
  abstract: "摘要",
  summary: "摘要",
  info: "信息",
  todo: "待办",
  tip: "提示",
  hint: "提示",
  important: "重要",
  success: "完成",
  check: "检查",
  done: "完成",
  question: "问题",
  help: "帮助",
  faq: "常见问题",
  warning: "警告",
  caution: "注意",
  attention: "注意",
  failure: "失败",
  fail: "失败",
  missing: "缺失",
  danger: "危险",
  error: "错误",
  bug: "问题",
  example: "示例",
  quote: "引用",
  cite: "引用",
};

function normalizeTarget(value) {
  return value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\.md$/i, "")
    .replace(/\/index$/i, "")
    .toLowerCase();
}

function createPostIndex(postsDirectory) {
  const absoluteDirectory = path.resolve(
    process.cwd(),
    postsDirectory
  );

  const index = new Map();

  if (!fs.existsSync(absoluteDirectory)) {
    return index;
  }

  const directories = fs.readdirSync(
    absoluteDirectory,
    {
      withFileTypes: true,
    }
  );

  for (const directory of directories) {
    if (!directory.isDirectory()) {
      continue;
    }

    const markdownPath = path.join(
      absoluteDirectory,
      directory.name,
      "index.md"
    );

    if (!fs.existsSync(markdownPath)) {
      continue;
    }

    const source = fs.readFileSync(
      markdownPath,
      "utf8"
    );

    const { data } = matter(source);

    if (data.publish !== true) {
      continue;
    }

    const post = {
      slug: directory.name,
      title: data.title ?? directory.name,
    };

    const keys = [
      directory.name,
      data.title,
      `${directory.name}/index`,
    ].filter(Boolean);

    for (const key of keys) {
      index.set(normalizeTarget(key), post);
    }
  }

  return index;
}

function slugifyHeading(value) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s_-]/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolvePost(postIndex, target) {
  const normalized = normalizeTarget(target);

  const directMatch = postIndex.get(normalized);

  if (directMatch) {
    return directMatch;
  }

  const basename = normalized
    .split("/")
    .filter(Boolean)
    .at(-1);

  return basename
    ? postIndex.get(basename)
    : null;
}

function transformWikiText(value, postIndex) {
  const pattern = /(?<!!)\[\[([^\]]+)\]\]/g;

  const nodes = [];
  let lastIndex = 0;
  let matched = false;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    const original = match[0];
    const inside = match[1];

    const pipeIndex = inside.indexOf("|");

    const destination =
      pipeIndex >= 0
        ? inside.slice(0, pipeIndex).trim()
        : inside.trim();

    const alias =
      pipeIndex >= 0
        ? inside.slice(pipeIndex + 1).trim()
        : "";

    const hashIndex = destination.indexOf("#");

    const noteTarget =
      hashIndex >= 0
        ? destination.slice(0, hashIndex).trim()
        : destination;

    const headingTarget =
      hashIndex >= 0
        ? destination.slice(hashIndex + 1).trim()
        : "";

    let href = null;
    let defaultLabel = "";

    if (!noteTarget && headingTarget) {
      href = `#${slugifyHeading(headingTarget)}`;
      defaultLabel = headingTarget;
    } else if (noteTarget) {
      const post = resolvePost(
        postIndex,
        noteTarget
      );

      if (post) {
        href = `../${encodeURIComponent(
          post.slug
        )}/`;

        if (headingTarget) {
          href += `#${slugifyHeading(
            headingTarget
          )}`;
        }

        defaultLabel = headingTarget
          ? `${post.title} · ${headingTarget}`
          : post.title;
      }
    }

    if (!href) {
      continue;
    }

    matched = true;

    if (match.index > lastIndex) {
      nodes.push({
        type: "text",
        value: value.slice(lastIndex, match.index),
      });
    }

    nodes.push({
      type: "link",
      url: href,
      title: null,
      children: [
        {
          type: "text",
          value:
            alias ||
            defaultLabel ||
            noteTarget ||
            original,
        },
      ],
    });

    lastIndex = match.index + original.length;
  }

  if (!matched) {
    return null;
  }

  if (lastIndex < value.length) {
    nodes.push({
      type: "text",
      value: value.slice(lastIndex),
    });
  }

  return nodes;
}

function transformCallout(node) {
  if (node.type !== "blockquote") {
    return;
  }

  const firstParagraph = node.children?.[0];

  if (firstParagraph?.type !== "paragraph") {
    return;
  }

  const firstText = firstParagraph.children?.[0];

  if (firstText?.type !== "text") {
    return;
  }

  const match = firstText.value.match(
    /^\[!([a-zA-Z-]+)\][+-]?[ \t]*([^\n]*)/
  );

  if (!match) {
    return;
  }

  const type = match[1].toLowerCase();

  const title =
    match[2].trim() ||
    calloutTitles[type] ||
    "说明";

  const restOfFirstText = firstText.value
    .slice(match[0].length)
    .replace(/^\n/, "");

  const otherSiblings =
    firstParagraph.children.slice(1);

  firstText.value = title;
  firstParagraph.children = [firstText];

  const bodyChildren = [];

  if (restOfFirstText) {
    bodyChildren.push({
      type: "text",
      value: restOfFirstText,
    });
  }

  bodyChildren.push(...otherSiblings);

  const additionalChildren = [];

  if (bodyChildren.length > 0) {
    additionalChildren.push({
      type: "paragraph",
      children: bodyChildren,
    });
  }

  node.children = [
    firstParagraph,
    ...additionalChildren,
    ...node.children.slice(1),
  ];

  firstParagraph.data = {
    ...(firstParagraph.data ?? {}),
    hName: "div",
    hProperties: {
      className: ["callout-title"],
    },
  };

  node.data = {
    ...(node.data ?? {}),
    hName: "aside",
    hProperties: {
      className: [
        "callout",
        `callout-${type}`,
      ],
    },
  };
}

function walkTree(node, postIndex) {
  if (!node || typeof node !== "object") {
    return;
  }

  transformCallout(node);

  if (
    node.type === "code" ||
    node.type === "inlineCode" ||
    node.type === "link"
  ) {
    return;
  }

  if (!Array.isArray(node.children)) {
    return;
  }

  for (
    let index = 0;
    index < node.children.length;
    index += 1
  ) {
    const child = node.children[index];

    if (child.type === "text") {
      const replacement = transformWikiText(
        child.value,
        postIndex
      );

      if (replacement) {
        node.children.splice(
          index,
          1,
          ...replacement
        );

        index += replacement.length - 1;
      }

      continue;
    }

    walkTree(child, postIndex);
  }
}

export default function remarkObsidian(options = {}) {
  const postsDirectory =
    options.postsDirectory ??
    "./src/content/posts";

  return (tree) => {
    const postIndex =
      createPostIndex(postsDirectory);

    walkTree(tree, postIndex);
  };
}
