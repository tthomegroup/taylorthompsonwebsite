const fs = require('fs');
const path = require('path');

const siteUrl = 'https://taylorthompsonhomegroup.netlify.app';
const root = process.cwd();
const dataPath = path.join(root, 'assets', 'data', 'blog-posts.json');
const outputDir = path.join(root, 'blog');
const nestedRoot = path.join(root, 'tthg');

function escapeHTML(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function slugify(post) {
  return `${post.date || ''}-${post.title || 'post'}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function normalizeBody(body) {
  if (typeof body === 'string') return body;
  if (!Array.isArray(body)) return '';
  return body.map(section => {
    const heading = Array.isArray(section) ? section[0] : section.heading;
    const paragraph = Array.isArray(section) ? section[1] : section.paragraph;
    return `## ${heading || ''}\n\n${paragraph || ''}`.trim();
  }).join('\n\n');
}

function renderInlineMarkdown(value) {
  return escapeHTML(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function renderArticleBody(body) {
  return String(body || '').split(/\n{2,}/).map(block => {
    const text = block.trim();
    if (!text) return '';
    if (text.startsWith('### ')) return `<h3>${renderInlineMarkdown(text.slice(4))}</h3>`;
    if (text.startsWith('## ')) return `<h2>${renderInlineMarkdown(text.slice(3))}</h2>`;
    if (text.startsWith('> ')) return `<blockquote>${renderInlineMarkdown(text.slice(2))}</blockquote>`;
    if (text.split('\n').every(line => line.trim().startsWith('- '))) {
      return `<ul>${text.split('\n').map(line => `<li>${renderInlineMarkdown(line.trim().slice(2))}</li>`).join('')}</ul>`;
    }
    return `<p>${text.split('\n').map(renderInlineMarkdown).join('<br>')}</p>`;
  }).join('\n');
}

function imageUrl(image) {
  if (!image) return `${siteUrl}/assets/images/hero-1.jpg`;
  if (/^https?:\/\//.test(image)) return image;
  return `${siteUrl}/${image.replace(/^\/+/, '')}`;
}

function pageHTML(post) {
  const slug = slugify(post);
  const title = escapeHTML(post.title);
  const description = escapeHTML(post.excerpt);
  const image = imageUrl(post.image);
  const body = renderArticleBody(normalizeBody(post.body));
  const pageUrl = `${siteUrl}/blog/${slug}.html`;
  const localImage = post.image ? `../${post.image.replace(/^\/+/, '')}` : '../assets/images/hero-1.jpg';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<link rel="icon" type="image/png" href="../assets/images/favicon.png">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | Taylor Thompson Home Group</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="article">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${image}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{--tan:#a68068;--tan-light:#c2a894;--cream:#faf6f1;--white:#fff;--dark:#000;--mid:#5a4a40;}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Jost',sans-serif;background:var(--cream);color:var(--dark);}
  nav{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;background:rgba(250,246,241,.96);border-bottom:1px solid rgba(166,128,104,.2);}
  .brand{text-decoration:none;display:flex;flex-direction:column;line-height:1;}
  .brand span:first-child{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:22px;color:var(--tan);}
  .brand span:last-child{font-size:9px;font-weight:500;letter-spacing:.22em;color:var(--mid);text-transform:uppercase;margin-top:2px;}
  .back-link{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--dark);text-decoration:none;border:1px solid rgba(0,0,0,.22);padding:10px 16px;}
  .hero{background:var(--dark);color:var(--white);padding:72px 32px 0;}
  .hero-inner{max-width:980px;margin:0 auto;}
  .kicker{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--tan-light);margin-bottom:16px;}
  h1{font-family:'Cormorant Garamond',serif;font-size:clamp(42px,6vw,76px);font-weight:300;line-height:1.05;max-width:900px;margin-bottom:18px;}
  .meta{display:flex;gap:16px;flex-wrap:wrap;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tan-light);padding-bottom:42px;}
  .hero-image{max-width:980px;margin:0 auto;aspect-ratio:16/9;background:linear-gradient(135deg,#ddcebe,#b5927f);background-image:url("${escapeHTML(localImage)}");background-size:cover;background-position:center;}
  article{max-width:820px;margin:0 auto;padding:56px 32px 86px;}
  .excerpt{font-size:19px;font-weight:300;line-height:1.85;color:var(--mid);margin-bottom:36px;}
  article h2{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:400;margin:40px 0 14px;}
  article h3{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:400;margin:34px 0 12px;}
  article p,article li{font-size:17px;font-weight:300;line-height:1.9;color:var(--mid);margin-bottom:20px;}
  article ul{padding-left:24px;margin-bottom:22px;}
  blockquote{border-left:3px solid var(--tan);padding-left:20px;margin:28px 0;color:var(--mid);}
  footer{background:var(--dark);color:rgba(255,255,255,.5);padding:32px;text-align:center;font-size:12px;}
  @media(max-width:720px){nav{padding:0 22px}.back-link{padding:9px 12px}.hero{padding-top:48px}}
</style>
</head>
<body>
<nav>
  <a class="brand" href="../index.html"><span>Taylor Thompson Home Group</span><span>Keller Williams Realty</span></a>
  <a class="back-link" href="../blog.html">All Blogs</a>
</nav>
<main>
  <section class="hero">
    <div class="hero-inner">
      <p class="kicker">${escapeHTML(post.category)}</p>
      <h1>${title}</h1>
      <div class="meta"><span>${escapeHTML(post.time)}</span><span>${formatDate(post.date)}</span></div>
    </div>
    <div class="hero-image" role="img" aria-label="${escapeHTML(post.imageAlt || post.title)}"></div>
  </section>
  <article>
    <p class="excerpt">${description}</p>
    ${body}
  </article>
</main>
<footer>Taylor Thompson Home Group | Central Valley Real Estate</footer>
</body>
</html>
`;
}

function writePostPages(baseRoot) {
  const baseDataPath = path.join(baseRoot, 'assets', 'data', 'blog-posts.json');
  if (!fs.existsSync(baseDataPath)) return [];
  const raw = fs.readFileSync(baseDataPath, 'utf8').replace(/^\uFEFF/, '');
  const posts = JSON.parse(raw).posts || [];
  const baseOutputDir = path.join(baseRoot, 'blog');
  fs.mkdirSync(baseOutputDir, { recursive: true });
  for (const file of fs.readdirSync(baseOutputDir)) {
    if (file.endsWith('.html')) fs.unlinkSync(path.join(baseOutputDir, file));
  }
  posts.forEach(post => fs.writeFileSync(path.join(baseOutputDir, `${slugify(post)}.html`), pageHTML(post)));
  return posts.map(post => ({ ...post, slug: slugify(post) }));
}

function writeSitemap(posts, baseRoot) {
  const urls = [
    ['', '1.0'],
    ['blog.html', '0.8'],
    ['contact.html', '0.7'],
    ...posts.map(post => [`blog/${post.slug}.html`, '0.7'])
  ];
  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([url, priority]) => `  <url>\n    <loc>${siteUrl}/${url}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(baseRoot, 'sitemap.xml'), xml);
}

const posts = writePostPages(root);
writeSitemap(posts, root);
if (fs.existsSync(nestedRoot)) {
  const nestedPosts = writePostPages(nestedRoot);
  writeSitemap(nestedPosts.length ? nestedPosts : posts, nestedRoot);
}

console.log(`Generated ${posts.length} blog pages.`);
