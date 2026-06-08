const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content", "reviews");
const ORGANIZER_FILE = path.join(ROOT_DIR, "content", "reviews-organizer.json");
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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeReview(review, placement, order) {
  return {
    id: review.id || slugify(review.title || review.author),
    author: review.author || "",
    text: review.text || review.body || "",
    detail: review.detail || "",
    source: review.source || "Other",
    placement,
    order,
    rating: normalizeRating(review.rating),
  };
}

function readOrganizedReviews() {
  const organizer = JSON.parse(fs.readFileSync(ORGANIZER_FILE, "utf8"));
  const reviews = Array.isArray(organizer.reviews)
    ? organizer.reviews
    : (organizer.featuredReviews || []).concat(organizer.moreReviews || []);

  return reviews.map((review, index) => {
    const placement = index < 3 ? "featured" : "more";
    const order = placement === "featured" ? index + 1 : index - 2;
    return normalizeReview(review, placement, order);
  });
}

function readLegacyReviews() {
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

function readReviews() {
  return fs.existsSync(ORGANIZER_FILE) ? readOrganizedReviews() : readLegacyReviews();
}

function buildReviews() {
  ensureDir(path.dirname(OUTPUT_FILE));
  const reviews = readReviews();
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(reviews, null, 2)}\n`);
  console.log(`Built ${reviews.length} review(s).`);
}

if (require.main === module) buildReviews();

module.exports = {
  ORGANIZER_FILE,
  readLegacyReviews,
};
