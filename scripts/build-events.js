const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content", "events");
const EVENTS_PAGE = path.join(ROOT_DIR, "events.html");
const START_MARKER = "<!-- FEATURED_EVENTS_START -->";
const END_MARKER = "<!-- FEATURED_EVENTS_END -->";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function readEvents() {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left))
    .map((fileName) => {
      const filePath = path.join(CONTENT_DIR, fileName);
      try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (error) {
        console.warn(`Skipping invalid event file: ${fileName}`);
        return null;
      }
    })
    .filter(Boolean)
    .filter((event) => event.image && event.title && event.eventType && event.description)
    .slice(0, 3);
}

function renderEvent(event) {
  const title = escapeHtml(event.title);
  const image = escapeHtml(event.image);

  return `    <article class="type-card fade-up">
      <div class="type-card-img">
        <img src="${image}" alt="${title} event poster" loading="lazy">
      </div>
      <div class="type-card-body">
        <span class="type-card-tag">${escapeHtml(event.eventType)}</span>
        <h3 class="type-card-title">${title}</h3>
        <p class="type-card-desc">${escapeHtml(event.description)}</p>
      </div>
    </article>`;
}

function buildEventsPage() {
  const events = readEvents();
  const html = fs.readFileSync(EVENTS_PAGE, "utf8");
  const startIndex = html.indexOf(START_MARKER);
  const endIndex = html.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Featured event markers are missing from events.html");
  }

  const cards = events.length
    ? events.map(renderEvent).join("\n\n")
    : '    <p class="events-empty">Featured events will appear here after they are added in Admin.</p>';
  const replacement = `${START_MARKER}\n${cards}\n    ${END_MARKER}`;
  const output = `${html.slice(0, startIndex)}${replacement}${html.slice(endIndex + END_MARKER.length)}`;

  fs.writeFileSync(EVENTS_PAGE, output);
  console.log(`Built ${events.length} featured event card${events.length === 1 ? "" : "s"}.`);
}

buildEventsPage();
