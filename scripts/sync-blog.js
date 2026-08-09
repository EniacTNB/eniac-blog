import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const projectRoot = process.cwd();

const localPath = path.join(
  process.env.HOME ?? "",
  "Documents",
  "艾AA",
  "2-Area",
  "博客写作",
  "Posts"
);

const ciPath = path.join(
  projectRoot,
  "obsidian",
  "2-Area",
  "博客写作",
  "Posts"
);

const source = process.env.OBSIDIAN_PATH
  ? path.resolve(process.env.OBSIDIAN_PATH)
  : fs.existsSync(localPath)
    ? localPath
    : ciPath;

const target = path.join(
  projectRoot,
  "src",
  "content",
  "posts"
);

console.log("Sync source:", source);
console.log("Sync target:", target);

if (!fs.existsSync(source)) {
  throw new Error(`Obsidian blog directory not found: ${source}`);
}

const articleDirectories = fs
  .readdirSync(source, { withFileTypes: true })
  .filter((entry) => entry.isDirectory());

const publishedArticles = [];

for (const entry of articleDirectories) {
  const articleDirectory = path.join(source, entry.name);
  const indexFile = path.join(articleDirectory, "index.md");

  if (!fs.existsSync(indexFile)) {
    console.log(`Skipped ${entry.name}: index.md not found`);
    continue;
  }

  const markdown = fs.readFileSync(indexFile, "utf8");
  const { data } = matter(markdown);

  if (data.publish !== true) {
    console.log(`Skipped ${entry.name}: publish is not true`);
    continue;
  }

  if (!data.title) {
    throw new Error(
      `Published article "${entry.name}" is missing title`
    );
  }

  if (!data.date) {
    throw new Error(
      `Published article "${entry.name}" is missing date`
    );
  }

  publishedArticles.push({
    name: entry.name,
    source: articleDirectory,
  });
}

fs.rmSync(target, {
  recursive: true,
  force: true,
});

fs.mkdirSync(target, {
  recursive: true,
});

fs.writeFileSync(path.join(target, ".gitkeep"), "");

for (const article of publishedArticles) {
  const articleTarget = path.join(target, article.name);

  fs.cpSync(article.source, articleTarget, {
    recursive: true,
  });

  console.log(`Published: ${article.name}`);
}

console.log(
  `Blog synced successfully: ${publishedArticles.length} article(s)`
);
