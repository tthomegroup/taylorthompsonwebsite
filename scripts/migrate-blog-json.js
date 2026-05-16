const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const SOURCE_FILE = path.join(ROOT_DIR, "assets", "data", "blog-posts.json");
const CONTENT_DIR = path.join(ROOT_DIR, "content", "blog");
const CATEGORY_LABELS = {
  "market-updates": "MARKET UPDATES",
  "buyer-tips": "BUYER TIPS",
  "seller-tips": "SELLER TIPS",
  "first-time-buyers": "FIRST-TIME BUYERS",
  investment: "INVESTMENT",
  "local-spotlight": "LOCAL SPOTLIGHT",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCategory(value) {
  const slug = slugify(value);
  return CATEGORY_LABELS[slug] || String(value || "").trim().toUpperCase();
}

function yamlString(value) {
  if (value === undefined || value === null) return '""';
  return JSON.stringify(String(value));
}

function yamlArray(values) {
  if (!Array.isArray(values) || values.length === 0) return "[]";
  return `[${values.map((value) => yamlString(value)).join(", ")}]`;
}

function normalizeCategories(post) {
  if (Array.isArray(post.categories)) return post.categories.map(normalizeCategory).filter(Boolean);
  if (typeof post.categories === "string" && post.categories.trim()) {
    return post.categories
      .split(",")
      .map((item) => item.trim())
      .map(normalizeCategory)
      .filter(Boolean);
  }
  if (typeof post.category === "string" && post.category.trim()) return [normalizeCategory(post.category)];
  return [];
}

function postToMarkdown(post) {
  const slug = post.slug || slugify(post.title || post.id || "untitled-post");
  const categories = normalizeCategories(post);
  const category = normalizeCategory(post.category || categories[0] || "");
  const body = post.body || post.content || "";

  return {
    slug,
    markdown: `---
title: ${yamlString(post.title || "")}
date: ${yamlString(post.date || post.publishDate || "")}
readTime: ${yamlString(post.readTime || "")}
category: ${yamlString(category)}
excerpt: ${yamlString(post.excerpt || "")}
featuredImage: ${yamlString(post.featuredImage || post.image || "")}
imageAlt: ${yamlString(post.imageAlt || "")}
featured: ${post.featured ? "true" : "false"}
---

${body.trim()}
`,
  };
}

function migrate() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.log(`No existing ${path.relative(ROOT_DIR, SOURCE_FILE)} found. Nothing to migrate.`);
    return;
  }

  ensureDir(CONTENT_DIR);

  const source = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"));
  const posts = Array.isArray(source) ? source : source.posts || [];

  for (const post of posts) {
    const { slug, markdown } = postToMarkdown(post);
    const outputFile = path.join(CONTENT_DIR, `${slug}.md`);

    if (fs.existsSync(outputFile)) {
      console.log(`Skipped existing post: ${path.relative(ROOT_DIR, outputFile)}`);
      continue;
    }

    fs.writeFileSync(outputFile, markdown);
    console.log(`Created ${path.relative(ROOT_DIR, outputFile)}`);
  }
}

migrate();
