const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT_DIR = path.resolve(__dirname, "..");
const config = fs.readFileSync(path.join(ROOT_DIR, "admin", "config.yml"), "utf8");
const adminScript = fs.readFileSync(path.join(ROOT_DIR, "admin", "admin-ui.js"), "utf8");
const keywordBlock = config.match(/- label: "SEO & Search Keywords"([\s\S]*?)(?=\n\s+- label: "Author")/);

assert(keywordBlock, "SEO and Search Keywords field is missing");
assert(/widget: "list"/.test(keywordBlock[1]), "SEO keywords must remain a list in saved content");
assert(!/\n\s+field:/.test(keywordBlock[1]), "SEO keywords should use Decap's single comma-separated textbox");

const storage = new Map();
let clickHandler;
let postPublishHandler;
let replacedUrl = "";

const document = {
  body: { appendChild() {} },
  documentElement: {},
  addEventListener(name, handler) {
    if (name === "click") clickHandler = handler;
  },
  createElement() {
    return {
      classList: { add() {} },
      setAttribute() {},
      parentNode: null,
      textContent: "",
    };
  },
  querySelectorAll() {
    return [];
  },
};

const window = {
  CMS: {
    registerEventListener(event) {
      if (event.name === "postPublish") postPublishHandler = event.handler;
    },
    registerPreviewTemplate() {},
  },
  location: {
    hash: "#/collections/blog/new",
    pathname: "/admin/",
    replace(url) {
      replacedUrl = url;
    },
  },
  sessionStorage: {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    removeItem(key) {
      storage.delete(key);
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
  },
  setTimeout(handler) {
    handler();
  },
};

class MutationObserver {
  constructor(handler) {
    this.handler = handler;
  }

  observe() {}
}

vm.runInNewContext(adminScript, {
  console,
  Date,
  document,
  JSON,
  MutationObserver,
  window,
});

assert.strictEqual(typeof clickHandler, "function", "Publish action listener was not registered");
assert.strictEqual(typeof postPublishHandler, "function", "postPublish listener was not registered");

clickHandler({
  target: {
    closest() {
      return { textContent: "Publish and create new" };
    },
  },
});

assert(storage.has("tthg.blogPublishAndCreateNew"), "Publish-and-create-new intent was not recorded");

postPublishHandler({
  entry: {
    get(key) {
      return key === "collection" ? "blog" : undefined;
    },
  },
});

assert(!storage.has("tthg.blogPublishAndCreateNew"), "Publish intent was not cleared after success");
assert.strictEqual(storage.get("tthg.blogPublishAndCreateNewSuccess"), "1", "Publish success was not recorded");
assert(/^\/admin\/\?fresh=\d+#\/collections\/blog\/new$/.test(replacedUrl), "A successful publish did not open a fresh blog editor");

replacedUrl = "";
storage.clear();
window.location.hash = "#/collections/blog/entries/existing-post";

clickHandler({
  target: {
    closest() {
      return { textContent: "Publish and create new" };
    },
  },
});

assert(storage.has("tthg.blogPublishAndCreateNew"), "The action was not recognized while editing an existing blog post");

postPublishHandler({
  entry: {
    get(key) {
      return key === "collection" ? "blog" : undefined;
    },
  },
});

assert(/^\/admin\/\?fresh=\d+#\/collections\/blog\/new$/.test(replacedUrl), "Publishing an edited post did not open a fresh blog editor");

console.log("Validated the blog admin keyword field and publish-and-create-new workflow.");
