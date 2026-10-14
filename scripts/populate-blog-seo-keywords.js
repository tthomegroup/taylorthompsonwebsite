const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content", "blog");

const CATEGORY_TERMS = {
  "market updates": ["Central Valley real estate market", "California housing market update"],
  "buyer tips": ["Central Valley home buying tips", "buying a home in California"],
  "seller tips": ["Central Valley home selling tips", "selling a home in California"],
  "first-time buyers": ["first-time home buyer tips", "Central Valley first-time home buyers"],
  investment: ["Central Valley real estate investing", "California investment property"],
  "local spotlight": ["Central Valley local guide", "living in California's Central Valley"],
  "homeowner tips": ["Central Valley homeowner tips", "home maintenance tips"],
};

const CITY_NAMES = [
  "Modesto",
  "Turlock",
  "Manteca",
  "Ceres",
  "Ripon",
  "Riverbank",
  "Salida",
  "Los Banos",
  "Denair",
  "Stockton",
  "Patterson",
  "Lathrop",
  "Atwater",
];

const TOPIC_RULES = [
  [/home maintenance/i, ["seasonal home maintenance checklist", "home maintenance for Central Valley homeowners"]],
  [/renovat|remodel|improvement/i, ["home improvements before selling", "renovations that help home value"]],
  [/new construction/i, ["new construction homes Central Valley", "buying a new construction home"]],
  [/escrow/i, ["California escrow process", "what happens during escrow"]],
  [/upfront cost|monthly payment|hidden cost|waiting to buy/i, ["home buying costs", "mortgage payment planning"]],
  [/first home|first.time home/i, ["first-time home buyer guide", "buying your first home in the Central Valley"]],
  [/multiple offer|highest offer|offer stand out/i, ["multiple offer real estate strategy", "competitive home offer tips"]],
  [/sell|selling|home sale|listing/i, ["selling a home in the Central Valley", "Central Valley home sellers"]],
  [/buy|buyer|home search|purchas/i, ["buying a home in the Central Valley", "Central Valley home buyers"]],
  [/\b(?:housing|real estate) market\b|\bquarter\b|\bq[1-4]\b|mid.year real estate recap/i, ["Central Valley housing market", "2026 real estate market update"]],
  [/living|moving|neighborhood|calling.+home/i, ["moving to the Central Valley", "Central Valley communities"]],
  [/school/i, ["Modesto schools", "homes near Modesto schools"]],
  [/restaurant|coffee|date night|pumpkin|farmers market|event|things to do|bucket list/i, ["things to do in the Central Valley", "Central Valley lifestyle guide"]],
  [/review|realtor|real estate business|ranked/i, ["Central Valley Realtor", "Taylor Thompson Home Group"]],
];

function cleanValue(value) {
  return String(value || "")
    .trim()
    .replace(/^(["'])([\s\S]*)\1$/, "$2")
    .replace(/[^\p{L}\p{N}&'’.,:()?!\-\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseScalarFields(frontmatter) {
  const data = {};
  const lines = frontmatter.split(/\r?\n/);
  let currentKey = "";

  lines.forEach((line) => {
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyValue) {
      currentKey = keyValue[1];
      data[currentKey] = keyValue[2];
      return;
    }

    if (currentKey && /^\s+\S/.test(line) && !/^\s+-\s+/.test(line)) {
      data[currentKey] = `${data[currentKey]} ${line.trim()}`.trim();
    }
  });

  Object.keys(data).forEach((key) => {
    data[key] = cleanValue(data[key]);
  });
  return data;
}

function addUnique(target, values) {
  values.forEach((value) => {
    const clean = cleanValue(value);
    if (!clean) return;
    if (target.some((existing) => existing.toLowerCase() === clean.toLowerCase())) return;
    target.push(clean);
  });
}

function keywordsFor(data) {
  const title = cleanValue(data.title);
  const category = cleanValue(data.category).toLowerCase();
  const context = [title, data.seoTitle, data.excerpt, data.metaDescription].join(" ");
  const keywords = [];

  addUnique(keywords, [title, data.seoTitle]);
  addUnique(keywords, CATEGORY_TERMS[category] || ["Central Valley real estate", "California real estate advice"]);

  CITY_NAMES.forEach((city) => {
    if (new RegExp(`\\b${city.replace(/\s+/g, "\\s+")}\\b`, "i").test(context)) {
      addUnique(keywords, [`${city} California`, `${city} real estate`]);
    }
  });

  TOPIC_RULES.forEach(([pattern, terms]) => {
    if (pattern.test(context)) addUnique(keywords, terms);
  });

  addUnique(keywords, ["Central Valley real estate", "Taylor Thompson Home Group"]);
  return keywords.slice(0, 8);
}

function updatePost(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`Missing frontmatter: ${path.relative(ROOT_DIR, filePath)}`);
  const force = process.argv.includes("--force");
  if (/^seoKeywords:/m.test(match[1]) && !force) return { skipped: true, recategorized: false };

  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const fields = parseScalarFields(match[1]);
  const isMaintenancePost = /home maintenance/i.test(fields.title || "");
  const category = isMaintenancePost ? "Homeowner Tips" : fields.category;
  const keywords = keywordsFor({ ...fields, category });

  if (keywords.length < 4) {
    throw new Error(`Not enough keywords for ${path.relative(ROOT_DIR, filePath)}`);
  }

  const lines = match[1].split(/\r?\n/);
  const categoryIndex = lines.findIndex((line) => /^category:/.test(line));
  const keywordsIndex = lines.findIndex((line) => /^seoKeywords:/.test(line));
  if (categoryIndex === -1) throw new Error(`Missing category: ${path.relative(ROOT_DIR, filePath)}`);

  if (isMaintenancePost) lines[categoryIndex] = "category: Homeowner Tips";
  if (keywordsIndex >= 0) lines[keywordsIndex] = `seoKeywords: ${JSON.stringify(keywords)}`;
  else lines.splice(categoryIndex + 1, 0, `seoKeywords: ${JSON.stringify(keywords)}`);

  const nextFrontmatter = lines.join(eol);
  const output = source.replace(match[1], nextFrontmatter);
  fs.writeFileSync(filePath, output);
  return { skipped: false, recategorized: isMaintenancePost };
}

function run() {
  const files = fs.readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();
  let updated = 0;
  let skipped = 0;
  let recategorized = 0;

  files.forEach((file) => {
    const result = updatePost(path.join(CONTENT_DIR, file));
    if (result.skipped) skipped += 1;
    else updated += 1;
    if (result.recategorized) recategorized += 1;
  });

  console.log(`Added SEO and search keywords to ${updated} post(s); skipped ${skipped}; moved ${recategorized} maintenance post(s) to Homeowner Tips.`);
}

run();
