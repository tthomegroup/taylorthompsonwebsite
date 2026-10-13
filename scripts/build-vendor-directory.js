const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT_DIR, "content", "vendor-directory.json");
const VENDOR_PAGE = path.join(ROOT_DIR, "vendorlist", "index.html");
const START_MARKER = "<!-- VENDOR_DIRECTORY_START -->";
const END_MARKER = "<!-- VENDOR_DIRECTORY_END -->";
const DEFAULT_IMAGE = "/assets/images/vendorlist-california-farmhouse.jpg";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function uniqueId(value, usedIds) {
  const base = slugify(value) || "vendor-category";
  let candidate = base;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function safeWebsiteUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch (error) {
    return null;
  }
}

function safeImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_IMAGE;
  if (raw.startsWith("/assets/images/")) return raw;

  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.href : DEFAULT_IMAGE;
  } catch (error) {
    return DEFAULT_IMAGE;
  }
}

function cssImageUrl(value) {
  return encodeURI(safeImageUrl(value))
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function phoneHref(value) {
  const display = String(value || "").trim();
  if (!display) return null;

  const extensionMatch = display.match(/(?:ext\.?|extension|x)\s*(\d+)/i);
  const extension = extensionMatch ? extensionMatch[1] : "";
  const mainNumber = display
    .replace(/(?:ext\.?|extension|x)\s*\d+/i, "")
    .replace(/[^+\d]/g, "");
  const digits = mainNumber.replace(/\D/g, "");

  if (digits.length < 7) return null;

  let dialNumber = mainNumber;
  if (!dialNumber.startsWith("+")) {
    if (digits.length === 10) dialNumber = `+1${digits}`;
    else if (digits.length === 11 && digits.startsWith("1")) dialNumber = `+${digits}`;
    else dialNumber = digits;
  }

  return `tel:${dialNumber}${extension ? `;ext=${extension}` : ""}`;
}

function normalizeDirectory(data) {
  const usedIds = new Set();
  const categories = Array.isArray(data && data.categories) ? data.categories : [];

  return categories
    .filter((category) => category && String(category.title || "").trim())
    .map((category) => {
      const companies = (Array.isArray(category.companies) ? category.companies : [])
        .filter((company) => company && String(company.name || "").trim())
        .map((company) => ({
          name: String(company.name).trim(),
          phone: String(company.phone || "").trim(),
          url: String(company.url || "").trim(),
        }));

      return {
        id: uniqueId(category.id || category.title, usedIds),
        title: String(category.title).trim(),
        image: safeImageUrl(category.image),
        companies,
      };
    })
    .filter((category) => category.companies.length > 0);
}

function renderCompany(company) {
  const website = safeWebsiteUrl(company.url);
  const name = escapeHtml(company.name);
  const nameMarkup = website
    ? `<a class="vendor-entry__name vendor-entry__name--link" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">${name}</a>`
    : `<span class="vendor-entry__name">${name}</span>`;
  const phone = escapeHtml(company.phone);
  const dialUrl = phoneHref(company.phone);
  const phoneMarkup = company.phone
    ? dialUrl
      ? `<a class="vendor-entry__phone" href="${escapeHtml(dialUrl)}">${phone}</a>`
      : `<span class="vendor-entry__phone">${phone}</span>`
    : "";

  return `              <div class="vendor-entry">${nameMarkup}${phoneMarkup}</div>`;
}

function renderCategory(category, index) {
  const number = String(index + 1).padStart(2, "0");
  const companies = category.companies.map(renderCompany).join("\n");

  return `          <article class="vendor-card" id="${escapeHtml(category.id)}" style="--vendor-card-image:url('${cssImageUrl(category.image)}');">
            <header class="vendor-card__header"><span class="vendor-card__number">${number}</span><h3>${escapeHtml(category.title)}</h3></header>
            <div class="vendor-card__list">
${companies}
            </div>
          </article>`;
}

function readDirectory() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error("Vendor directory data is missing: content/vendor-directory.json");
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    throw new Error(`Vendor directory data is invalid JSON: ${error.message}`);
  }
}

function buildVendorDirectory() {
  const categories = normalizeDirectory(readDirectory());
  const html = fs.readFileSync(VENDOR_PAGE, "utf8");
  const startIndex = html.indexOf(START_MARKER);
  const endIndex = html.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Vendor directory markers are missing from vendorlist/index.html");
  }

  const cards = categories.map(renderCategory).join("\n\n");
  const replacement = `${START_MARKER}\n${cards}\n          ${END_MARKER}`;
  const output = `${html.slice(0, startIndex)}${replacement}${html.slice(endIndex + END_MARKER.length)}`;

  fs.writeFileSync(VENDOR_PAGE, output);

  const companyCount = categories.reduce((total, category) => total + category.companies.length, 0);
  console.log(`Built ${categories.length} vendor categor${categories.length === 1 ? "y" : "ies"} with ${companyCount} compan${companyCount === 1 ? "y" : "ies"}.`);
}

if (require.main === module) buildVendorDirectory();

module.exports = {
  normalizeDirectory,
  phoneHref,
  renderCompany,
  safeWebsiteUrl,
};
