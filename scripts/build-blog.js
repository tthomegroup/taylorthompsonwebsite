const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content", "blog");
const OUTPUT_FILE = path.join(ROOT_DIR, "assets", "data", "blog-posts.json");
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

function slugFromFilename(filePath) {
  return path.basename(filePath, path.extname(filePath)).toLowerCase();
}

function parseValue(value) {
  const trimmed = value.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed === "") return "";

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      return JSON.parse(trimmed.replace(/'/g, '"'));
    } catch (error) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
  }

  return trimmed;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    return {
      data: {},
      body: markdown.trim(),
    };
  }

  const data = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(parseValue(listItem[1]));
      continue;
    }

    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) continue;

    currentKey = keyValue[1];
    const rawValue = keyValue[2];

    if (/^[>|]/.test(rawValue.trim())) {
      const blockLines = [];

      while (index + 1 < lines.length && /^\s+/.test(lines[index + 1])) {
        index += 1;
        blockLines.push(lines[index].replace(/^\s{2,}/, ""));
      }

      data[currentKey] = blockLines.join(rawValue.trim().startsWith(">") ? " " : "\n").trim();
      continue;
    }

    data[currentKey] = rawValue === "" ? [] : parseValue(rawValue);
  }

  return {
    data,
    body: match[2].trim(),
  };
}

function normalizeCategories(categories, category) {
  if (Array.isArray(categories)) return categories.map(normalizeCategory).filter(Boolean);
  if (typeof categories === "string" && categories.trim()) {
    return categories
      .split(",")
      .map((item) => item.trim())
      .map(normalizeCategory)
      .filter(Boolean);
  }
  if (typeof category === "string" && category.trim()) return [normalizeCategory(category)];
  return [];
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

function normalizeFeatured(value) {
  if (value === true) return true;
  if (value === false || value === undefined || value === null) return false;

  const normalized = String(value).trim().toLowerCase();
  return ["true", "yes", "1", "featured"].includes(normalized);
}

function sortByDateDesc(a, b) {
  return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
}

function formatOutput(posts) {
  if (!fs.existsSync(OUTPUT_FILE)) return posts;

  try {
    const current = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));

    if (Array.isArray(current)) return posts;
    if (current && typeof current === "object" && Array.isArray(current.posts)) {
      return {
        ...current,
        posts,
      };
    }
  } catch (error) {
    console.warn(`Could not read existing ${path.relative(ROOT_DIR, OUTPUT_FILE)} shape.`);
  }

  return posts;
}

function readPosts() {
  ensureDir(CONTENT_DIR);

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const filePath = path.join(CONTENT_DIR, file);
      const { data, body } = parseFrontmatter(fs.readFileSync(filePath, "utf8"));
      const slug = data.slug || slugFromFilename(filePath);
      const categories = normalizeCategories(data.categories, data.category);
      const category = normalizeCategory(data.category || categories[0] || "");

      return {
        id: data.id || slug,
        slug,
        title: data.title || slug,
        date: data.date || data.publishDate || "",
        publishDate: data.publishDate || data.date || "",
        readTime: data.readTime || data.read_time || "",
        category,
        categorySlug: slugify(category),
        categories,
        excerpt: data.excerpt || "",
        featuredImage: data.featuredImage || data.featured_image || data.image || "",
        image: data.image || data.featuredImage || data.featured_image || "",
        imageAlt: data.imageAlt || data.image_alt || "",
        featured: normalizeFeatured(data.featured),
        body,
        content: body,
      };
    })
    .sort(sortByDateDesc);
}

function buildBlog() {
  ensureDir(path.dirname(OUTPUT_FILE));

  const posts = readPosts();
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(formatOutput(posts), null, 2)}\n`);

  console.log(`Built ${posts.length} blog post(s) into ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
}

buildBlog();
