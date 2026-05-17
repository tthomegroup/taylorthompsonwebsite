const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content", "blog");
const OUTPUT_FILE = path.join(ROOT_DIR, "assets", "data", "blog-posts.json");

const CATEGORIES = {
  "market-updates": "Market Updates",
  "buyer-tips": "Buyer Tips",
  "seller-tips": "Seller Tips",
  "first-time-buyers": "First-Time Buyers",
  investment: "Investment",
  "local-spotlight": "Local Spotlight",
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

function parseValue(value) {
  const trimmed = value.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
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
      return [];
    }
  }

  return trimmed;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: markdown.trim() };

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

  return { data, body: match[2].trim() };
}

function normalizeCategory(value) {
  const slug = slugify(value);
  return CATEGORIES[slug] || String(value || "").trim();
}

function normalizeFeatured(value) {
  if (value === true) return true;
  if (value === false || value === undefined || value === null) return false;
  return ["true", "yes", "1", "featured"].includes(String(value).trim().toLowerCase());
}

function fileUpdatedAt(filePath) {
  try {
    const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
    const timestamp = execSync(`git log -1 --format=%ct -- "${relativePath}"`, {
      cwd: ROOT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return Number(timestamp) || 0;
  } catch (error) {
    return 0;
  }
}

function readPosts() {
  ensureDir(CONTENT_DIR);

  const posts = fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const filePath = path.join(CONTENT_DIR, file);
      const { data, body } = parseFrontmatter(fs.readFileSync(filePath, "utf8"));

      if (data.published !== true) return null;

      const slug = data.slug || path.basename(file, ".md");
      const category = normalizeCategory(data.category);
      const featured = normalizeFeatured(data.featured);

      return {
        id: slug,
        slug,
        url: `/blog/${slug}`,
        link: `/blog/${slug}`,
        permalink: `/blog/${slug}`,
        title: data.title || slug,
        date: data.date || "",
        publishDate: data.date || "",
        readTime: data.readTime || "",
        category,
        categories: category ? [category] : [],
        categorySlug: slugify(category),
        excerpt: data.excerpt || "",
        featuredImage: data.featuredImage || "",
        image: data.featuredImage || "",
        imageAlt: data.imageAlt || "",
        featured,
        isFeatured: featured,
        featuredPost: featured,
        body,
        content: body,
        sourceFile: filePath,
        updatedAt: fileUpdatedAt(filePath),
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const featuredPost = posts
    .filter((post) => post.featured)
    .sort((a, b) => {
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    })[0];

  posts.forEach((post) => {
    const isWinner = Boolean(featuredPost && post.slug === featuredPost.slug);
    post.featured = isWinner;
    post.isFeatured = isWinner;
    post.featuredPost = isWinner;
    delete post.sourceFile;
    delete post.updatedAt;
  });

  return posts;
}

function buildBlog() {
  ensureDir(path.dirname(OUTPUT_FILE));
  const posts = readPosts();
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(posts, null, 2)}\n`);
  console.log(`Built ${posts.length} blog post(s).`);
}

buildBlog();
