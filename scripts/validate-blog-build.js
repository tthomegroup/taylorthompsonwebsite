const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const SITE_URL = "https://taylorthompsonhomegroup.com";
const posts = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "assets", "data", "blog-posts.json"), "utf8"));
const sitemap = fs.readFileSync(path.join(ROOT_DIR, "sitemap.xml"), "utf8");
const errors = [];
let staticCount = 0;

posts.forEach((post) => {
  if (!post.isReady) return;
  staticCount += 1;

  const pagePath = path.join(ROOT_DIR, "blog", post.slug, "index.html");
  if (!fs.existsSync(pagePath)) {
    errors.push(`${post.slug}: static page is missing`);
    return;
  }

  const html = fs.readFileSync(pagePath, "utf8");
  const expectedUrl = `${SITE_URL}/blog/${post.slug}/`;
  const required = [
    [/<h1>[^<]+<\/h1>/, "h1"],
    [/<meta name="description" content="[^"]+">/, "meta description"],
    [new RegExp(`<link rel="canonical" href="${expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`), "canonical URL"],
    [/<script type="application\/ld\+json">[\s\S]*"@type": "BlogPosting"/, "BlogPosting schema"],
    [/<div class="post-content">[\s\S]+<p class="post-byline">/, "static body content"],
  ];

  required.forEach(([pattern, label]) => {
    if (!pattern.test(html)) errors.push(`${post.slug}: missing ${label}`);
  });

  const schemaMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  if (schemaMatch) {
    try {
      const schema = JSON.parse(schemaMatch[1]);
      if (schema.headline !== post.title) errors.push(`${post.slug}: schema headline does not match the post title`);
    } catch (error) {
      errors.push(`${post.slug}: BlogPosting schema is not valid JSON`);
    }
  }

  if (/fetch\(["']\/assets\/data\/blog-posts\.json/.test(html)) {
    errors.push(`${post.slug}: still depends on the client-side blog JSON fetch`);
  }
  if (!sitemap.includes(`<loc>${expectedUrl}</loc>`)) {
    errors.push(`${post.slug}: missing from sitemap`);
  }
  if (post.featuredImage && post.featuredImage.startsWith("/")) {
    const imagePath = path.join(ROOT_DIR, post.featuredImage.replace(/^\/+/, ""));
    if (!fs.existsSync(imagePath)) errors.push(`${post.slug}: featured image is missing (${post.featuredImage})`);
  }
});

if (sitemap.includes("taylorthompsonhomegroup.netlify.app")) {
  errors.push("sitemap still contains the old Netlify domain");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${staticCount} static blog page(s), metadata, images, schema, and sitemap entries.`);
}
