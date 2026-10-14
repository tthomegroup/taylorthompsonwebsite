const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content", "blog");

function parseListItem(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^["']/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return trimmed.replace(/^(?:"|')|(?:"|')$/g, "");
    }
  }
  return trimmed;
}

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function normalizeKeywords(values) {
  const original = values.map((value) => String(value || "").trim()).filter(Boolean);
  const split = original.flatMap((value) => value.split(",").map((part) => part.trim()).filter(Boolean));
  const splitPartsAreUseful = split.every((value) => wordCount(value) >= 2);
  const candidates = split.length <= 8 && splitPartsAreUseful
    ? split
    : original.map((value) => value.replace(/\s*,\s*/g, " ").replace(/\s+/g, " ").trim());
  const seen = new Set();

  return candidates.filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function normalizeFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return false;

  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = match[1].split(/\r?\n/);
  const keywordIndex = lines.findIndex((line) => /^seoKeywords:/.test(line));
  if (keywordIndex === -1) return false;

  const inlineValue = lines[keywordIndex].replace(/^seoKeywords:\s*/, "");
  const usesBlockList = !inlineValue;
  let endIndex = keywordIndex + 1;
  let values = [];

  if (usesBlockList) {
    while (endIndex < lines.length && /^\s+-\s+/.test(lines[endIndex])) {
      values.push(parseListItem(lines[endIndex].replace(/^\s+-\s+/, "")));
      endIndex += 1;
    }
  } else {
    try {
      values = JSON.parse(inlineValue);
    } catch (error) {
      return false;
    }
  }

  if (!values.some((value) => String(value).includes(","))) return false;
  const normalized = normalizeKeywords(values);

  if (usesBlockList) {
    lines.splice(
      keywordIndex,
      endIndex - keywordIndex,
      "seoKeywords:",
      ...normalized.map((value) => `  - ${JSON.stringify(value)}`),
    );
  } else {
    lines[keywordIndex] = `seoKeywords: ${JSON.stringify(normalized)}`;
  }

  fs.writeFileSync(filePath, source.replace(match[1], lines.join(eol)));
  return true;
}

const changed = fs.readdirSync(CONTENT_DIR)
  .filter((file) => file.endsWith(".md"))
  .sort()
  .filter((file) => normalizeFile(path.join(CONTENT_DIR, file)));

console.log(`Normalized comma-safe SEO keywords in ${changed.length} blog post(s).`);
