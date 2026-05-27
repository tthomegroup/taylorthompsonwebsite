const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content", "reviews");
const OUTPUT_FILE = path.join(ROOT_DIR, "assets", "data", "reviews.json");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
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

  return trimmed;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: markdown.trim() };

  const data = {};
  const lines = match[1].split(/\r?\n/);

  lines.forEach((line) => {
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) return;
    data[keyValue[1]] = parseValue(keyValue[2]);
  });

  return { data, body: match[2].trim() };
}

function normalizeRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return 5;
  return Math.min(5, Math.max(1, Math.round(rating)));
}

function readReviews() {
  ensureDir(CONTENT_DIR);

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const markdown = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      const { data, body } = parseFrontmatter(markdown);

      if (data.published === false) return null;

      return {
        id: path.basename(file, ".md"),
        author: data.author || "",
        text: body,
        detail: data.detail || "",
        source: data.source || "Other",
        placement: data.placement === "featured" ? "featured" : "more",
        order: Number(data.order) || 999,
        rating: normalizeRating(data.rating),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.placement !== b.placement) return a.placement === "featured" ? -1 : 1;
      return a.order - b.order;
    });
}

ensureDir(path.dirname(OUTPUT_FILE));
const reviews = readReviews();
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(reviews, null, 2)}\n`);
console.log(`Built ${reviews.length} review(s).`);
