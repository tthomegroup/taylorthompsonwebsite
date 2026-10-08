const fs = require("fs");
const path = require("path");
const { mediaFromUrl } = require("./build-listing-videos");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT_DIR, "content", "home-videos.json");
const HOME_PAGE = path.join(ROOT_DIR, "index.html");
const START_MARKER = "<!-- HOME_VIDEO_SHOWCASE_START -->";
const END_MARKER = "<!-- HOME_VIDEO_SHOWCASE_END -->";
const REQUIRED_VIDEO_COUNT = 5;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readVideos() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error("Homepage video data is missing: content/home-videos.json");
  }

  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(data.videos) ? data.videos : [];
  } catch (error) {
    throw new Error(`Homepage video data is invalid JSON: ${error.message}`);
  }
}

function normalizeVideos(videos) {
  if (videos.length !== REQUIRED_VIDEO_COUNT) {
    throw new Error(`Homepage video showcase requires exactly ${REQUIRED_VIDEO_COUNT} videos; found ${videos.length}.`);
  }

  return videos.map((video, index) => {
    const title = String(video && video.title || "").trim();
    const media = mediaFromUrl(video && video.videoUrl);

    if (!title) throw new Error(`Homepage video ${index + 1} needs a title.`);
    if (!media) throw new Error(`Homepage video ${index + 1} needs a valid HTTPS video link.`);

    return { title, media };
  });
}

function renderMedia(media, title) {
  if (media.type === "video") {
    return `<video controls playsinline preload="metadata" aria-label="${escapeHtml(title)}">
              <source src="${escapeHtml(media.src)}">
              Your browser does not support embedded video.
            </video>`;
  }

  return `<iframe src="${escapeHtml(media.src)}" title="${escapeHtml(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

function renderCard(video) {
  return `        <article class="home-video-card" data-home-video-card>
          <div class="home-video-card__media">
            ${renderMedia(video.media, video.title)}
          </div>
          <h3>${escapeHtml(video.title)}</h3>
        </article>`;
}

function renderShowcase(videos) {
  return `  <section class="home-video-showcase" id="featured-videos" aria-labelledby="home-video-title" data-home-video-carousel>
    <div class="home-video-showcase__inner">
      <header class="home-video-showcase__header">
        <p class="home-video-showcase__eyebrow">Featured Videos</p>
        <h2 id="home-video-title">Real Estate, Homes &amp; <em>Central Valley Life</em></h2>
      </header>
      <div class="home-video-showcase__viewport" data-home-video-viewport tabindex="0" aria-label="Featured real estate videos">
        <div class="home-video-showcase__track">
${videos.map(renderCard).join("\n")}
        </div>
      </div>
      <div class="home-video-showcase__controls" data-home-video-controls aria-label="Featured video carousel controls">
        <button type="button" data-home-video-prev aria-label="Previous featured video">&#8592;</button>
        <button type="button" data-home-video-next aria-label="Next featured video">&#8594;</button>
      </div>
      <div class="home-video-showcase__channel">
        <a href="https://www.youtube.com/@Soldby.taylor/shorts" target="_blank" rel="noopener noreferrer">See More Videos</a>
      </div>
    </div>
  </section>`;
}

function buildHomeVideos() {
  const videos = normalizeVideos(readVideos());
  const html = fs.readFileSync(HOME_PAGE, "utf8");
  const startIndex = html.indexOf(START_MARKER);
  const endIndex = html.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Homepage video showcase markers are missing from index.html");
  }

  const section = renderShowcase(videos);
  const replacement = `${START_MARKER}\n${section}\n${END_MARKER}`;
  const output = `${html.slice(0, startIndex)}${replacement}${html.slice(endIndex + END_MARKER.length)}`;
  fs.writeFileSync(HOME_PAGE, output);

  console.log(`Built homepage video showcase with ${videos.length} videos.`);
}

if (require.main === module) buildHomeVideos();

module.exports = {
  normalizeVideos,
  renderShowcase,
};
