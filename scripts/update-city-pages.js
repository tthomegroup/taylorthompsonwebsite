const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CITY_ROUTES = [
  ["Turlock", "/turlock"],
  ["Modesto", "/modesto"],
  ["Manteca", "/manteca"],
  ["Ceres", "/ceres"],
  ["Ripon", "/ripon"],
  ["Riverbank", "/riverbank"],
  ["Stockton", "/stockton"],
  ["Tracy", "/tracy"],
  ["Lodi", "/lodi"],
  ["Merced", "/merced"],
];

const SKIP_DIRS = new Set([".git", "admin", "assets", "content", "includes", "node_modules", "scripts"]);

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

function cityFromFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();

  return CITY_ROUTES.find(([city, route]) => {
    const slug = route.slice(1);
    return (
      normalized.endsWith(`/${slug}/index.html`) ||
      normalized.endsWith(`/${slug}.html`) ||
      normalized.endsWith(`/areas/${slug}/index.html`) ||
      normalized.endsWith(`/areas/${slug}.html`)
    );
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function linkCities(html) {
  html = unlinkInlineCityText(html);

  for (const [city, route] of CITY_ROUTES) {
    const cityPattern = escapeRegExp(city);

    html = html.replace(
      new RegExp(`(<div\\b[^>]*class=["'][^"']*(?:city|area)[^"']*(?:card|tile|item)[^"']*["'][^>]*>[\\s\\S]*?)(<h[2-4]\\b[^>]*>)${cityPattern}(</h[2-4]>)([\\s\\S]*?</div>)`, "gi"),
      `$1<a href="${route}">$2${city}$3</a>$4`
    );

    html = html.replace(
      new RegExp(`(<a\\b[^>]*href=["'])[^"']*(["'][^>]*>\\s*<h[2-4]\\b[^>]*>)${cityPattern}(</h[2-4]>)`, "gi"),
      `$1${route}$2${city}$3`
    );
  }

  return html;
}

function unlinkInlineCityText(html) {
  for (const [city, route] of CITY_ROUTES) {
    const cityPattern = escapeRegExp(city);
    const routePattern = escapeRegExp(route);

    html = html.replace(
      new RegExp(`<a\\b[^>]*href=["']${routePattern}["'][^>]*>${cityPattern}</a>`, "gi"),
      city
    );
  }

  return html;
}

function normalizeForms(html) {
  html = html.replace(/(<form\b[^>]*\b(?:data-netlify|netlify)\b[^>]*\bname=["'])[^"']*(["'][^>]*>)/gi, "$1home-value-city-form$2");
  html = html.replace(/(<form\b(?=[^>]*\b(?:data-netlify|netlify)\b)(?![^>]*\bname=)[^>]*)(>)/gi, '$1 name="home-value-city-form"$2');
  html = html.replace(/(<input\b[^>]*\bname=["']form-name["'][^>]*\bvalue=["'])[^"']*(["'][^>]*>)/gi, "$1home-value-city-form$2");

  html = html.replace(/<form\b[\s\S]*?<\/form>/gi, (form) => {
    if (!/\bname=["']home-value-city-form["']/i.test(form)) return form;
    if (/<input\b[^>]*\bname=["']form-name["']/i.test(form)) return form;

    return form.replace(/(<form\b[^>]*>)/i, '$1\n  <input type="hidden" name="form-name" value="home-value-city-form">');
  });

  return html.replace(/<form\b[\s\S]*?<\/form>/gi, (form) => {
    if (!/\bname=["']home-value-city-form["']/i.test(form)) return form;

    form = form.replace(/<button\b(?![^>]*\btype=)([^>]*)>/gi, '<button type="submit"$1>');
    form = form.replace(/<button\b([^>]*)\btype=["']button["']([^>]*)>/gi, '<button$1type="submit"$2>');
    form = form.replace(/\sdisabled(?:=["'][^"']*["'])?/gi, "");
    form = form.replace(/\saria-disabled=["']true["']/gi, "");

    return form;
  });
}

function removeCityFromPlaceholders(html, city) {
  const cityPattern = escapeRegExp(city);

  return html.replace(
    new RegExp(`(placeholder=["'][^"']*)\\b${cityPattern}\\b\\s*`, "gi"),
    "$1"
  );
}

function updateFile(filePath) {
  const cityEntry = cityFromFile(filePath);
  if (!cityEntry) return;

  const [city] = cityEntry;
  const original = fs.readFileSync(filePath, "utf8");
  let html = original;

  html = linkCities(html);
  html = normalizeForms(html);
  html = removeCityFromPlaceholders(html, city);

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    console.log(`Updated ${path.relative(ROOT_DIR, filePath)}`);
  }
}

walk(ROOT_DIR).forEach(updateFile);
