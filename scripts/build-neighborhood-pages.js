const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content", "neighborhood-pages");
const DATA_FILE = path.join(ROOT_DIR, "assets", "data", "neighborhood-pages.json");

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

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function assetPath(value) {
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || String(value).charAt(0) === "/") return value;
  return `/${String(value).replace(/^\.?\//, "")}`;
}

function linkHtml(text, href) {
  const cleanHref = String(href || "").trim().replace(/^['"]|['"]$/g, "");
  const isSafeHref = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(cleanHref);
  if (!isSafeHref) return escapeHtml(text);

  const newTab = /^https?:\/\//i.test(cleanHref) ? ' target="_blank" rel="noopener"' : "";
  return `<a href="${escapeHtml(cleanHref)}"${newTab}>${escapeHtml(text)}</a>`;
}

function inlineMarkdown(value) {
  const links = [];
  const tokenPrefix = "\u0000LINK";
  const tokenSuffix = "\u0000";
  const text = String(value || "")
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g, (_, label, href) => {
      links.push(linkHtml(label, href));
      return tokenPrefix + (links.length - 1) + tokenSuffix;
    })
    .replace(/<((?:https?:\/\/|mailto:|tel:)[^>\s]+)>/gi, (_, href) => {
      links.push(linkHtml(href, href));
      return tokenPrefix + (links.length - 1) + tokenSuffix;
    });

  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\u0000LINK(\d+)\u0000/g, (_, index) => links[Number(index)] || "");
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const html = [];
  let listType = null;

  function closeList() {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      return;
    }

    if (/^###\s+/.test(trimmed)) {
      closeList();
      html.push(`<h3>${inlineMarkdown(trimmed.replace(/^###\s+/, ""))}</h3>`);
      return;
    }

    if (/^##\s+/.test(trimmed)) {
      closeList();
      html.push(`<h2>${inlineMarkdown(trimmed.replace(/^##\s+/, ""))}</h2>`);
      return;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inlineMarkdown(trimmed.replace(/^[-*+]\s+/, ""))}</li>`);
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inlineMarkdown(trimmed.replace(/^\d+\.\s+/, ""))}</li>`);
      return;
    }

    closeList();
    html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  });

  closeList();
  return html.join("\n");
}

function readPages() {
  ensureDir(CONTENT_DIR);

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const filePath = path.join(CONTENT_DIR, file);
      const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw);
      if (data.published === false) return null;

      const slug = slugify(data.slug || data.title || path.basename(file, ".json"));
      return {
        ...data,
        slug,
        url: `/${slug}/`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
}

function renderFacts(facts) {
  if (!Array.isArray(facts) || !facts.length) return "";

  return `
    <section class="neighborhood-stats" aria-label="Quick facts">
      ${facts.map((fact) => `
        <div class="stat-card">
          <span>${escapeHtml(fact.label)}</span>
          <strong>${escapeHtml(fact.value)}</strong>
        </div>
      `).join("")}
    </section>
  `;
}

function renderNeighborhoods(items) {
  if (!Array.isArray(items) || !items.length) return "";

  return `
    <section class="content-section">
      <div class="section-header">
        <p class="section-eyebrow">Local Areas</p>
        <h2 class="section-title">Neighborhoods and Areas to <em>Know</em></h2>
      </div>
      <div class="area-grid">
        ${items.map((item) => `
          <article class="area-card">
            <h3>${escapeHtml(item.name)}</h3>
            ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTextSection(eyebrow, heading, text, className = "content-section") {
  const body = markdownToHtml(text);
  if (!heading && !body) return "";

  return `
    <section class="${className}">
      <div class="section-header">
        ${eyebrow ? `<p class="section-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
        ${heading ? `<h2 class="section-title">${inlineMarkdown(heading)}</h2>` : ""}
      </div>
      <div class="rich-text">${body}</div>
    </section>
  `;
}

function renderIdxSection(page) {
  const embed = String(page.idxEmbed || "").trim();

  return `
    <section class="idx-section" id="homes-for-sale">
      <div class="section-header">
        <p class="section-eyebrow">Homes for Sale</p>
        <h2 class="section-title">${escapeHtml(page.idxHeading || `Search ${page.city || "Area"} Homes for Sale`)}</h2>
        ${page.idxIntro ? `<p class="section-body">${escapeHtml(page.idxIntro)}</p>` : ""}
      </div>
      <div class="idx-embed">
        ${embed || `<div class="idx-placeholder">Paste this page's IDX Broker embed code in the admin field to show live listings here.</div>`}
      </div>
    </section>
  `;
}

function pageHtml(page) {
  const title = page.title || `${page.city || "Neighborhood"} Homes for Sale`;
  const description = page.metaDescription || page.heroIntro || `Explore homes for sale and local real estate information for ${page.city || "this Central Valley area"}.`;
  const heroImage = assetPath(page.heroImage || "/assets/images/manteca.jpg");
  const heroAlt = page.heroImageAlt || title;
  const ctaLink = page.ctaButtonLink || "/contact";
  const ctaText = page.ctaButtonText || "Contact Taylor";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Taylor Thompson Home Group</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="icon" href="/assets/images/favicon.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/nav-footer.css">
  <style>
    :root{--cream:#faf6f1;--white:#fff;--ink:#050505;--mid:#765f50;--tan:#a68068;--tan-light:#c2a894;--tan-pale:#ddcebe;--line:#d9cec5;}
    *{box-sizing:border-box;}
    body{margin:0;background:var(--cream);color:var(--ink);font-family:'Jost',sans-serif;line-height:1.75;overflow-x:hidden;}
    a{color:inherit;}
    .landing-hero{display:grid;grid-template-columns:minmax(0,1.02fr) minmax(320px,.98fr);min-height:650px;background:#000;color:#fff;}
    .landing-hero__copy{display:flex;flex-direction:column;justify-content:center;padding:clamp(60px,7vw,100px) clamp(28px,6vw,84px);}
    .landing-hero__image{min-height:420px;background:linear-gradient(135deg,rgba(0,0,0,.16),rgba(0,0,0,.05)),url("${escapeHtml(heroImage)}") center/cover no-repeat;}
    .section-eyebrow{margin:0 0 16px;color:var(--tan-light);font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;}
    .hero-title,.section-title{font-family:'Cormorant Garamond',serif;font-weight:300;line-height:1.08;}
    .hero-title{max-width:760px;margin:0 0 22px;font-size:clamp(46px,6vw,78px);}
    .hero-title em,.section-title em{color:var(--tan-light);font-style:italic;}
    .hero-intro{max-width:620px;margin:0 0 34px;color:rgba(255,255,255,.72);font-size:17px;font-weight:300;}
    .hero-actions{display:flex;flex-wrap:wrap;gap:14px;}
    .btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 26px;background:var(--tan);border:1px solid var(--tan);color:#fff;font-size:12px;font-weight:800;letter-spacing:.14em;text-decoration:none;text-transform:uppercase;}
    .btn--light{background:transparent;border-color:rgba(255,255,255,.38);color:#fff;}
    .neighborhood-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--line);}
    .stat-card{background:#fff;padding:28px 24px;text-align:center;}
    .stat-card span{display:block;margin-bottom:8px;color:var(--mid);font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;}
    .stat-card strong{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:400;color:var(--ink);}
    .content-section,.idx-section,.cta-section{padding:clamp(64px,8vw,104px) clamp(24px,6vw,80px);}
    .content-section{background:var(--cream);}
    .content-section:nth-of-type(even){background:#fff;}
    .section-header{max-width:760px;margin:0 auto 36px;text-align:center;}
    .section-title{margin:0;color:var(--ink);font-size:clamp(34px,4vw,52px);}
    .section-body{max-width:640px;margin:14px auto 0;color:var(--mid);font-size:15px;font-weight:300;}
    .rich-text{max-width:860px;margin:0 auto;color:var(--mid);font-size:16px;font-weight:300;}
    .rich-text h2,.rich-text h3{font-family:'Cormorant Garamond',serif;color:var(--ink);font-weight:400;line-height:1.15;}
    .rich-text h2{font-size:34px;margin:38px 0 14px;}
    .rich-text h3{font-size:28px;margin:30px 0 12px;}
    .rich-text p,.rich-text li{margin:0 0 18px;}
    .rich-text ul,.rich-text ol{padding-left:24px;margin:0 0 22px;}
    .idx-section{background:#000;color:#fff;}
    .idx-section .section-title{color:#fff;}
    .idx-embed{width:min(1280px,100%);margin:0 auto;background:#fff;border:1px solid rgba(255,255,255,.14);color:var(--ink);min-height:260px;padding:24px;}
    .idx-placeholder{display:flex;align-items:center;justify-content:center;min-height:220px;border:1px dashed var(--tan-pale);color:var(--mid);text-align:center;}
    .area-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;max-width:1120px;margin:0 auto;}
    .area-card{background:#fff;border-top:3px solid var(--tan);padding:30px 28px;}
    .area-card h3{margin:0 0 10px;font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:400;}
    .area-card p{margin:0;color:var(--mid);font-weight:300;}
    .cta-section{background:var(--tan-pale);text-align:center;}
    .cta-section .section-title{margin-bottom:14px;}
    .cta-section p{max-width:620px;margin:0 auto 28px;color:var(--mid);}
    @media(max-width:920px){.landing-hero{grid-template-columns:1fr;}.landing-hero__image{min-height:340px;order:-1}.neighborhood-stats{grid-template-columns:repeat(2,minmax(0,1fr));}.area-grid{grid-template-columns:1fr;}.idx-embed{padding:14px;}}
    @media(max-width:560px){.landing-hero__copy{padding:46px 24px}.hero-actions .btn{width:100%;}.neighborhood-stats{grid-template-columns:1fr;}.content-section,.idx-section,.cta-section{padding:52px 22px;}.idx-embed{margin:0 -6px;width:calc(100% + 12px);}}
  </style>
</head>
<body>
  <div data-include="/includes/header.html"></div>
  <main>
    <section class="landing-hero">
      <div class="landing-hero__copy">
        <p class="section-eyebrow">${escapeHtml(page.eyebrow || "Central Valley Homes")}</p>
        <h1 class="hero-title">${inlineMarkdown(page.heroTitle || title)}</h1>
        <p class="hero-intro">${escapeHtml(page.heroIntro || description)}</p>
        <div class="hero-actions">
          <a class="btn" href="#homes-for-sale">Search Homes</a>
          <a class="btn btn--light" href="${escapeHtml(ctaLink)}">${escapeHtml(ctaText)}</a>
        </div>
      </div>
      <div class="landing-hero__image" role="img" aria-label="${escapeHtml(heroAlt)}"></div>
    </section>
    ${renderFacts(page.quickFacts)}
    ${renderTextSection("Area Guide", page.introHeading || `Living in ${page.city || "This Area"}`, page.introText)}
    ${renderIdxSection(page)}
    ${renderNeighborhoods(page.neighborhoods)}
    ${renderTextSection("Lifestyle", page.lifestyleHeading, page.lifestyleText)}
    ${renderTextSection("Market Notes", page.marketHeading, page.marketText)}
    <section class="cta-section">
      <h2 class="section-title">${inlineMarkdown(page.ctaHeading || "Thinking About Buying or Selling Here?")}</h2>
      ${page.ctaText ? `<p>${escapeHtml(page.ctaText)}</p>` : ""}
      <a class="btn" href="${escapeHtml(ctaLink)}">${escapeHtml(ctaText)}</a>
    </section>
  </main>
  <div data-include="/includes/footer.html"></div>
  <script src="/assets/js/includes.js" defer></script>
  <script src="//code.tidio.co/hhc4vboniih3fkjzb7pz1uksqe22ywym.js" async></script>
</body>
</html>
`;
}

function removeOldPage(slug) {
  const routeDir = path.join(ROOT_DIR, slug);
  const routeFile = path.join(ROOT_DIR, `${slug}.html`);

  if (fs.existsSync(routeFile)) fs.unlinkSync(routeFile);
  ensureDir(routeDir);
}

function buildNeighborhoodPages() {
  ensureDir(CONTENT_DIR);
  ensureDir(path.dirname(DATA_FILE));

  const pages = readPages();
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(pages.map(({ idxEmbed, ...page }) => page), null, 2)}\n`);

  pages.forEach((page) => {
    removeOldPage(page.slug);
    const routeDir = path.join(ROOT_DIR, page.slug);
    fs.writeFileSync(path.join(routeDir, "index.html"), pageHtml(page));
  });

  console.log(`Built ${pages.length} neighborhood page(s).`);
}

buildNeighborhoodPages();
