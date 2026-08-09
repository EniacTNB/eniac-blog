import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import matter from "gray-matter";

const projectRoot = process.cwd();

const imageExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

const ignoredDirectories = new Set([
  ".git",
  ".obsidian",
  ".trash",
  "node_modules",
]);

function expandHome(value) {
  if (!value) return null;

  if (value === "~") {
    return os.homedir();
  }

  if (value.startsWith("~/")) {
    return path.join(os.homedir(), value.slice(2));
  }

  return path.resolve(value);
}

function findPostsRoot() {
  const candidates = [
    process.env.OBSIDIAN_PATH,
    path.join(
      os.homedir(),
      "Documents",
      "艾AA",
      "2-Area",
      "博客写作",
      "Posts"
    ),
    path.join(
      projectRoot,
      "obsidian",
      "2-Area",
      "博客写作",
      "Posts"
    ),
  ]
    .filter(Boolean)
    .map(expandHome);

  const found = candidates.find(
    (candidate) =>
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isDirectory()
  );

  if (!found) {
    console.error("❌ 没有找到 Obsidian 博客目录。");
    console.error("已检查：");

    for (const candidate of candidates) {
      console.error(`  - ${candidate}`);
    }

    console.error(
      "\n可以通过 OBSIDIAN_PATH 指定 Posts 目录。"
    );

    process.exit(1);
  }

  return found;
}

function findVaultRoot(postsRoot) {
  let current = postsRoot;

  while (true) {
    const hasObsidian = fs.existsSync(
      path.join(current, ".obsidian")
    );

    const hasGit = fs.existsSync(
      path.join(current, ".git")
    );

    if (hasObsidian || hasGit) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  return path.resolve(postsRoot, "../../..");
}

function walkImages(directory, result = new Map()) {
  if (!fs.existsSync(directory)) {
    return result;
  }

  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      ignoredDirectories.has(entry.name)
    ) {
      continue;
    }

    const absolutePath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      walkImages(absolutePath, result);
      continue;
    }

    const extension = path.extname(
      entry.name
    ).toLowerCase();

    if (!imageExtensions.has(extension)) {
      continue;
    }

    const key = entry.name.toLowerCase();
    const existing = result.get(key) ?? [];

    existing.push(absolutePath);
    result.set(key, existing);
  }

  return result;
}

function isImagePath(value) {
  return imageExtensions.has(
    path.extname(value).toLowerCase()
  );
}

function resolveImage({
  target,
  articleDirectory,
  vaultRoot,
  imageIndex,
}) {
  const normalizedTarget = target
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");

  const candidates = [
    path.resolve(articleDirectory, normalizedTarget),
    path.resolve(vaultRoot, normalizedTarget),
  ];

  for (const candidate of candidates) {
    if (
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile()
    ) {
      return candidate;
    }
  }

  const basename = path
    .basename(normalizedTarget)
    .toLowerCase();

  const matches = imageIndex.get(basename) ?? [];

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    const suffixMatches = matches.filter((candidate) =>
      candidate
        .replaceAll("\\", "/")
        .endsWith(normalizedTarget)
    );

    if (suffixMatches.length === 1) {
      return suffixMatches[0];
    }

    throw new Error(
      [
        `图片名称存在重复，无法判断应该使用哪一张：${target}`,
        ...matches.map((item) => `  - ${item}`),
        "请在 Obsidian 中使用包含目录的链接，或修改重复文件名。",
      ].join("\n")
    );
  }

  return null;
}

function safeAssetName(sourcePath, vaultRoot) {
  const extension = path
    .extname(sourcePath)
    .toLowerCase();

  const originalStem = path.basename(
    sourcePath,
    path.extname(sourcePath)
  );

  const safeStem =
    originalStem
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";

  const relativeSource = path.relative(
    vaultRoot,
    sourcePath
  );

  const hash = crypto
    .createHash("sha1")
    .update(relativeSource)
    .digest("hex")
    .slice(0, 8);

  return `${safeStem}-${hash}${extension}`;
}

function escapeMarkdownAlt(value) {
  return value
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]");
}

function transformObsidianImages({
  markdown,
  articleDirectory,
  outputDirectory,
  vaultRoot,
  imageIndex,
}) {
  const copiedAssets = new Map();
  const missingImages = [];

  const transformed = markdown.replace(
    /!\[\[([^\]]+)\]\]/g,
    (original, embedValue) => {
      const parts = embedValue
        .split("|")
        .map((part) => part.trim());

      const target = parts[0]
        .split("#")[0]
        .trim();

      if (!isImagePath(target)) {
        return original;
      }

      const displayValue = parts
        .slice(1)
        .join("|")
        .trim();

      const isSizeValue =
        /^\d+(?:x\d+)?$/i.test(displayValue);

      const defaultAlt = path.basename(
        target,
        path.extname(target)
      );

      const alt =
        displayValue && !isSizeValue
          ? displayValue
          : defaultAlt;

      const sourceImage = resolveImage({
        target,
        articleDirectory,
        vaultRoot,
        imageIndex,
      });

      if (!sourceImage) {
        missingImages.push(target);
        return original;
      }

      let outputName = copiedAssets.get(sourceImage);

      if (!outputName) {
        outputName = safeAssetName(
          sourceImage,
          vaultRoot
        );

        const assetsDirectory = path.join(
          outputDirectory,
          "assets"
        );

        fs.mkdirSync(assetsDirectory, {
          recursive: true,
        });

        fs.copyFileSync(
          sourceImage,
          path.join(assetsDirectory, outputName)
        );

        copiedAssets.set(sourceImage, outputName);
      }

      return `![${escapeMarkdownAlt(
        alt
      )}](./assets/${outputName})`;
    }
  );

  if (missingImages.length > 0) {
    throw new Error(
      [
        "以下 Obsidian 图片没有找到：",
        ...missingImages.map(
          (item) => `  - ${item}`
        ),
        `文章目录：${articleDirectory}`,
      ].join("\n")
    );
  }

  return {
    markdown: transformed,
    copiedCount: copiedAssets.size,
  };
}

const postsRoot = findPostsRoot();
const vaultRoot = findVaultRoot(postsRoot);

const targetRoot = path.join(
  projectRoot,
  "src",
  "content",
  "posts"
);

console.log(`📚 Posts：${postsRoot}`);
console.log(`🗄️ Vault：${vaultRoot}`);
console.log(`🎯 输出：${targetRoot}`);

const imageIndex = walkImages(vaultRoot);

console.log(
  `🖼️ 已索引 ${Array.from(imageIndex.values()).reduce(
    (total, items) => total + items.length,
    0
  )} 个图片文件`
);

fs.rmSync(targetRoot, {
  recursive: true,
  force: true,
});

fs.mkdirSync(targetRoot, {
  recursive: true,
});

fs.writeFileSync(path.join(targetRoot, ".gitkeep"), "");

const articleDirectories = fs
  .readdirSync(postsRoot, {
    withFileTypes: true,
  })
  .filter((entry) => entry.isDirectory())
  .sort((a, b) =>
    a.name.localeCompare(b.name, "zh-CN")
  );

let publishedCount = 0;
let skippedCount = 0;
let copiedImageCount = 0;

for (const directory of articleDirectories) {
  const articleDirectory = path.join(
    postsRoot,
    directory.name
  );

  const sourceIndex = path.join(
    articleDirectory,
    "index.md"
  );

  if (!fs.existsSync(sourceIndex)) {
    skippedCount += 1;
    console.log(
      `⏭️ 跳过 ${directory.name}：没有 index.md`
    );
    continue;
  }

  const sourceMarkdown = fs.readFileSync(
    sourceIndex,
    "utf8"
  );

  const { data } = matter(sourceMarkdown);

  if (data.publish !== true) {
    skippedCount += 1;
    console.log(
      `🔒 跳过 ${directory.name}：publish 不是 true`
    );
    continue;
  }

  if (!data.title) {
    throw new Error(
      `${sourceIndex} 缺少必填字段 title`
    );
  }

  if (!data.date) {
    throw new Error(
      `${sourceIndex} 缺少必填字段 date`
    );
  }

  const outputDirectory = path.join(
    targetRoot,
    directory.name
  );

  fs.cpSync(articleDirectory, outputDirectory, {
    recursive: true,
  });

  const transformed = transformObsidianImages({
    markdown: sourceMarkdown,
    articleDirectory,
    outputDirectory,
    vaultRoot,
    imageIndex,
  });

  fs.writeFileSync(
    path.join(outputDirectory, "index.md"),
    transformed.markdown,
    "utf8"
  );

  publishedCount += 1;
  copiedImageCount += transformed.copiedCount;

  console.log(
    `✅ ${directory.name}：同步完成，复制 ${transformed.copiedCount} 张 Obsidian 图片`
  );
}

console.log("");
console.log(`🎉 已同步 ${publishedCount} 篇公开文章`);
console.log(`🖼️ 已处理 ${copiedImageCount} 张 Obsidian 图片`);
console.log(`⏭️ 已跳过 ${skippedCount} 个目录`);
