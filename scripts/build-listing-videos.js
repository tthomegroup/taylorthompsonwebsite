const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT_DIR, "content", "listing-videos.json");
const LISTINGS_PAGE = path.join(ROOT_DIR, "listings", "index.html");
const START_MARKER = "<!-- LISTING_VIDEO_SHOWCASE_START -->";
const END_MARKER = "<!-- LISTING_VIDEO_SHOWCASE_END -->";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function httpsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" ? url : null;
  } catch (error) {
    return null;
  }
}

function youtubeId(url) {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  let candidate = "";

  if (host === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] || "";
  if (host.endsWith("youtube.com")) {
    if (url.pathname === "/watch") candidate = url.searchParams.get("v") || "";
    else candidate = (url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/) || [])[1] || "";
  }

  return /^[A-Za-z0-9_-]{6,}$/.test(candidate) ? candidate : "";
}

function mediaFromUrl(value) {
  const url = httpsUrl(value);
  if (!url) return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const ytId = youtubeId(url);
  if (ytId) return { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0` };

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = (url.pathname.match(/\/(?:video\/)?(\d+)/) || [])[1];
    if (id) return { type: "iframe", src: `https://player.vimeo.com/video/${id}` };
  }

  if (host === "instagram.com") {
    const match = url.pathname.match(/^\/(reel|p|tv)\/([^/?]+)/);
    if (match) return { type: "iframe", src: `https://www.instagram.com/${match[1]}/${match[2]}/embed/` };
  }

  if (host === "tiktok.com") {
    const id = (url.pathname.match(/\/video\/(\d+)/) || [])[1];
    if (id) return { type: "iframe", src: `https://www.tiktok.com/player/v1/${id}?autoplay=0` };
  }

  if (/\.(?:mp4|webm|ogg)$/i.test(url.pathname)) return { type: "video", src: url.href };
  return { type: "iframe", src: url.href };
}

function mediaFromEmbed(value) {
  const embed = String(value || "").trim();
  if (!embed) return null;

  const iframe = embed.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);
  if (iframe) return mediaFromUrl(iframe[2]);

  const video = embed.match(/<(?:video|source)\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);
  if (video) {
    const url = httpsUrl(video[2]);
    if (url) return { type: "video", src: url.href };
  }

  return null;
}

function resolveMedia(video) {
  return mediaFromEmbed(video.embedCode) || mediaFromUrl(video.videoUrl);
}

function readShowcase() {
  if (!fs.existsSync(DATA_FILE)) return { videos: [] };

  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return data && typeof data === "object" ? data : { videos: [] };
  } catch (error) {
    throw new Error(`Listing video data is invalid JSON: ${error.message}`);
  }
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

function normalizeVideos(data) {
  return (Array.isArray(data.videos) ? data.videos : [])
    .filter((video) => video && video.visible !== false && video.title)
    .map((video) => ({ ...video, media: resolveMedia(video) }))
    .filter((video) => video.media);
}

function renderCard(video) {
  return `        <article class="listing-video-card" data-listing-video-card>
          <div class="listing-video-card__media">
            ${renderMedia(video.media, video.title)}
          </div>
          <div class="listing-video-card__copy">
            <h3>${escapeHtml(video.title)}</h3>${video.caption ? `
            <p>${escapeHtml(video.caption)}</p>` : ""}
          </div>
        </article>`;
}

function renderShowcase(data) {
  const videos = normalizeVideos(data);
  if (!videos.length) return "";

  const stateClass = videos.length === 1 ? " is-single" : videos.length === 2 ? " is-pair" : "";
  const controls = videos.length > 1 ? `
      <div class="listing-video-showcase__controls" data-listing-video-controls aria-label="Listing video carousel controls">
        <button type="button" data-listing-video-prev aria-label="Previous listing video">&#8592;</button>
        <p aria-live="polite"><span data-listing-video-current>1</span> / ${videos.length}</p>
        <button type="button" data-listing-video-next aria-label="Next listing video">&#8594;</button>
      </div>` : "";

  return `  <section class="listing-video-showcase${stateClass}" id="listing-videos" aria-labelledby="listing-video-title" data-listing-video-carousel>
    <div class="listing-video-showcase__inner">
      <header class="listing-video-showcase__header">
        <p class="section-eyebrow">${escapeHtml(data.eyebrow || "Listing Video Tours")}</p>
        <h2 id="listing-video-title">${escapeHtml(data.heading || "Step Inside Our Featured Listings")}</h2>
        ${data.intro ? `<p>${escapeHtml(data.intro)}</p>` : ""}
      </header>
      <div class="listing-video-showcase__viewport" data-listing-video-viewport tabindex="0" aria-label="Listing videos">
        <div class="listing-video-showcase__track">
${videos.map(renderCard).join("\n")}
        </div>
      </div>${controls}
      <div class="listing-video-showcase__more">
        <a href="https://www.youtube.com/@Soldby.taylor/shorts" target="_blank" rel="noopener noreferrer">See More Videos</a>
      </div>
    </div>
  </section>
  <script>
    (function () {
      document.querySelectorAll("[data-listing-video-carousel]").forEach(function (carousel) {
        var viewport = carousel.querySelector("[data-listing-video-viewport]");
        var cards = Array.prototype.slice.call(carousel.querySelectorAll("[data-listing-video-card]"));
        var previous = carousel.querySelector("[data-listing-video-prev]");
        var next = carousel.querySelector("[data-listing-video-next]");
        var controls = carousel.querySelector("[data-listing-video-controls]");
        var current = carousel.querySelector("[data-listing-video-current]");
        if (!viewport || cards.length < 2 || !previous || !next) return;

        function cardStep() {
          if (cards.length < 2) return cards[0] ? cards[0].getBoundingClientRect().width : 0;
          return cards[1].offsetLeft - cards[0].offsetLeft;
        }

        function update() {
          var maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
          previous.disabled = viewport.scrollLeft <= 4;
          next.disabled = viewport.scrollLeft >= maximum - 4;
          if (controls) controls.hidden = maximum <= 4;
          if (current) current.textContent = String(Math.min(cards.length, Math.round(viewport.scrollLeft / Math.max(1, cardStep())) + 1));
        }

        previous.addEventListener("click", function () {
          viewport.scrollBy({ left: -cardStep(), behavior: "smooth" });
        });
        next.addEventListener("click", function () {
          viewport.scrollBy({ left: cardStep(), behavior: "smooth" });
        });
        viewport.addEventListener("scroll", function () { window.requestAnimationFrame(update); }, { passive: true });
        window.addEventListener("resize", update);
        update();
      });
    }());
  </script>`;
}

function buildListingVideosPage() {
  const data = readShowcase();
  const section = renderShowcase(data);
  const html = fs.readFileSync(LISTINGS_PAGE, "utf8");
  const startIndex = html.indexOf(START_MARKER);
  const endIndex = html.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Listing video showcase markers are missing from listings/index.html");
  }

  const replacement = `${START_MARKER}\n${section}${section ? "\n" : ""}${END_MARKER}`;
  const output = `${html.slice(0, startIndex)}${replacement}${html.slice(endIndex + END_MARKER.length)}`;
  fs.writeFileSync(LISTINGS_PAGE, output);

  const count = normalizeVideos(data).length;
  console.log(`Built listing video showcase with ${count} active video${count === 1 ? "" : "s"}.`);
}

if (require.main === module) buildListingVideosPage();

module.exports = {
  mediaFromUrl,
  normalizeVideos,
  renderShowcase,
};
