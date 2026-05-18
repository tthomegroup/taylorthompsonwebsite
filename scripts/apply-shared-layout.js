const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set([".git", "admin", "assets", "content", "includes", "node_modules", "scripts"]);
const SHARED_CSS = '<link rel="stylesheet" href="/assets/css/nav-footer.css">';
const SHARED_JS = '<script src="/assets/js/includes.js" defer></script>';
const HEADER_INCLUDE = '<div data-include="/includes/header.html"></div>';
const FOOTER_INCLUDE = '<div data-include="/includes/footer.html"></div>';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) return [];
      return walk(fullPath);
    }

    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function replaceFirstNav(html) {
  if (html.includes('data-include="/includes/header.html"')) return html;

  const navMatch = html.match(/<nav\b[\s\S]*?<\/nav>/i);
  if (navMatch) return html.replace(navMatch[0], HEADER_INCLUDE);

  return html.replace(/<body([^>]*)>/i, `<body$1>\n  ${HEADER_INCLUDE}`);
}

function replaceFooter(html) {
  if (html.includes('data-include="/includes/footer.html"')) return html;

  const footerMatch = html.match(/<footer\b[\s\S]*?<\/footer>/i);
  if (footerMatch) return html.replace(footerMatch[0], FOOTER_INCLUDE);

  return html.replace(/<\/body>/i, `  ${FOOTER_INCLUDE}\n</body>`);
}

function ensureCss(html) {
  if (html.includes("/assets/css/nav-footer.css")) return html;
  return html.replace(/<\/head>/i, `  ${SHARED_CSS}\n</head>`);
}

function ensureJs(html) {
  if (html.includes("/assets/js/includes.js")) return html;
  return html.replace(/<\/body>/i, `  ${SHARED_JS}\n</body>`);
}

function updateFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  let html = original;

  html = ensureCss(html);
  html = replaceFirstNav(html);
  html = replaceFooter(html);
  html = ensureJs(html);

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    console.log(`Updated ${path.relative(ROOT_DIR, filePath)}`);
  }
}

walk(ROOT_DIR).forEach(updateFile);
