const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set([".git", "admin", "assets", "content", "includes", "node_modules", "scripts"]);
const SHARED_CSS = '<link rel="stylesheet" href="/assets/css/nav-footer.css">';
const SHARED_JS = '<script src="/assets/js/includes.js" defer></script>';
const FAVICON = '<link rel="icon" href="/assets/images/favicon.png" type="image/png">';
const NETLIFY_IDENTITY_WIDGET = '<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>';
const NETLIFY_IDENTITY_REDIRECT = `<script>
  if (window.netlifyIdentity) {
    window.netlifyIdentity.on('init', user => {
      if (!user) {
        window.netlifyIdentity.on('login', () => {
          document.location.href = '/admin/';
        });
      }
    });
  }
</script>`;
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

function ensureFavicon(html) {
  if (/<link[^>]+rel=["'](?:shortcut icon|icon)["']/i.test(html)) return html;
  return html.replace(/<\/head>/i, `  ${FAVICON}\n</head>`);
}

function ensureJs(html) {
  if (html.includes("/assets/js/includes.js")) return html;
  return html.replace(/<\/body>/i, `  ${SHARED_JS}\n</body>`);
}

function removeTidioPlaceholders(html) {
  return html
    .replace(/<!--\s*tidio[\s\S]*?placeholder[\s\S]*?-->/gi, "")
    .replace(/<!--\s*placeholder[\s\S]*?tidio[\s\S]*?-->/gi, "")
    .replace(/<[^>]+(?:id|class)=["'][^"']*(?:tidio-placeholder|chat-placeholder)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, "");
}

function findTidioSnippet(files) {
  for (const filePath of files) {
    const html = fs.readFileSync(filePath, "utf8");
    const match = html.match(/<script\b[^>]*\bsrc=["'](?:https?:)?\/\/code\.tidio\.co\/[^"']+["'][^>]*>\s*<\/script>/i);

    if (match) return match[0];
  }

  return "";
}

function ensureTidio(html, tidioSnippet) {
  if (!tidioSnippet || html.includes("code.tidio.co")) return html;
  return html.replace(/<\/body>/i, `  ${tidioSnippet}\n</body>`);
}

function ensureNetlifyIdentity(html) {
  if (!html.includes("identity.netlify.com/v1/netlify-identity-widget.js")) {
    html = html.replace(/<\/body>/i, `  ${NETLIFY_IDENTITY_WIDGET}\n</body>`);
  }

  if (!html.includes("window.netlifyIdentity.on('init'")) {
    html = html.replace(/<\/body>/i, `  ${NETLIFY_IDENTITY_REDIRECT}\n</body>`);
  }

  return html;
}

function updateFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  let html = original;

  html = removeTidioPlaceholders(html);
  html = ensureFavicon(html);
  html = ensureCss(html);
  html = replaceFirstNav(html);
  html = replaceFooter(html);
  html = ensureJs(html);
  html = ensureTidio(html, updateFile.tidioSnippet);
  html = ensureNetlifyIdentity(html);

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    console.log(`Updated ${path.relative(ROOT_DIR, filePath)}`);
  }
}

const files = walk(ROOT_DIR);
updateFile.tidioSnippet = findTidioSnippet(files);

if (!updateFile.tidioSnippet) {
  console.warn("No existing Tidio script was found. Add the real code.tidio.co script to one HTML page or includes/footer.html, then run the build again.");
}

files.forEach(updateFile);
