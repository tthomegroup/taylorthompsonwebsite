(function () {
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
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function assetPath(value) {
    if (!value) return "";
    if (/^(https?:)?\/\//.test(value) || value.charAt(0) === "/") return value;
    return "/" + value.replace(/^\.?\//, "");
  }

  function postsArray(data) {
    return Array.isArray(data) ? data : data.posts || [];
  }

  function postDate(post) {
    return new Date(post.date || post.publishDate || 0).getTime();
  }

  function postUrl(post) {
    return post.url || post.link || post.permalink || "/blog/" + (post.slug || slugify(post.title));
  }

  function isFeatured(post) {
    return post.featured === true || post.isFeatured === true || post.featuredPost === true;
  }

  function findFeatured(posts) {
    return posts.filter(isFeatured).sort(function (a, b) {
      return postDate(b) - postDate(a);
    })[0];
  }

  function directText(element) {
    return Array.prototype.map.call(element.childNodes || [], function (node) {
      return node.nodeType === Node.TEXT_NODE ? node.textContent : "";
    }).join(" ").replace(/\s+/g, " ").trim();
  }

  function findOldFeaturedBlock() {
    var label = Array.prototype.find.call(document.querySelectorAll("body *"), function (element) {
      return slugify(directText(element) || element.textContent) === "featured-blog";
    });

    var current = label;

    while (current && current.parentElement && current.parentElement !== document.body) {
      var text = slugify(current.textContent || "");
      var hasImage = Boolean(current.querySelector && current.querySelector("img"));
      var hasReadLink = text.indexOf("read-full-blog") !== -1;
      var containsLatest = text.indexOf("latest-blogs") !== -1;

      if (hasImage && hasReadLink && !containsLatest) return current;

      current = current.parentElement;
    }

    return null;
  }

  function ensureFeaturedMount(oldBlock) {
    var existing = document.getElementById("cms-featured-blog");
    if (existing) return existing;

    var mount = document.createElement("section");
    mount.id = "cms-featured-blog";
    mount.className = "featured-blog cms-featured-blog";

    if (oldBlock && oldBlock.parentElement) {
      oldBlock.parentElement.insertBefore(mount, oldBlock);
    } else {
      var latestHeading = Array.prototype.find.call(document.querySelectorAll("h1, h2"), function (heading) {
        return slugify(heading.textContent).indexOf("latest-blogs") !== -1;
      });

      if (latestHeading && latestHeading.parentElement) {
        latestHeading.parentElement.insertBefore(mount, latestHeading);
      } else {
        document.body.insertBefore(mount, document.body.firstChild);
      }
    }

    return mount;
  }

  function renderFeatured(post) {
    var oldBlock = findOldFeaturedBlock();
    var mount = ensureFeaturedMount(oldBlock);
    var image = post.featuredImage || post.image || "";
    var category = post.categoryLabel || post.displayCategory || post.category || "";
    var date = post.date || post.publishDate || "";

    mount.innerHTML =
      '<div class="featured-blog-media">' +
        (image ? '<img src="' + escapeHtml(assetPath(image)) + '" alt="' + escapeHtml(post.imageAlt || post.title || "") + '">' : "") +
      '</div>' +
      '<div class="featured-blog-copy">' +
        '<p class="featured-blog-eyebrow">Featured Blog</p>' +
        '<h2>' + escapeHtml(post.title || "") + '</h2>' +
        '<p class="featured-blog-excerpt">' + escapeHtml(post.excerpt || "") + '</p>' +
        '<div class="featured-blog-meta">' +
          '<span>' + escapeHtml(String(category).toUpperCase()) + '</span>' +
          '<span>' + escapeHtml(date) + '</span>' +
        '</div>' +
        '<a class="featured-blog-button" href="' + escapeHtml(postUrl(post)) + '">Read Full Blog</a>' +
      '</div>';

    if (oldBlock) oldBlock.hidden = true;
  }

  function injectStyles() {
    if (document.getElementById("cms-featured-blog-styles")) return;

    var style = document.createElement("style");
    style.id = "cms-featured-blog-styles";
    style.textContent =
      '#cms-featured-blog{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.86fr);gap:clamp(36px,5vw,64px);align-items:center;margin:0 auto clamp(56px,7vw,92px);max-width:1120px;padding:clamp(40px,6vw,72px) 0;border-bottom:1px solid rgba(120,95,80,.22)}' +
      '#cms-featured-blog img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}' +
      '#cms-featured-blog .featured-blog-eyebrow,#cms-featured-blog .featured-blog-meta{color:#a77e67;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}' +
      '#cms-featured-blog h2{margin:14px 0 22px;font-family:Georgia,Times New Roman,serif;font-size:clamp(38px,5vw,58px);font-weight:400;line-height:1.12}' +
      '#cms-featured-blog .featured-blog-excerpt{margin:0 0 28px;line-height:1.8;color:#765f50}' +
      '#cms-featured-blog .featured-blog-meta{display:flex;gap:28px;margin-bottom:24px}' +
      '#cms-featured-blog .featured-blog-button{display:inline-block;background:#000;color:#fff;padding:14px 28px;font-size:12px;font-weight:800;letter-spacing:.14em;text-decoration:none;text-transform:uppercase}' +
      '@media(max-width:760px){#cms-featured-blog{grid-template-columns:1fr;padding-left:20px;padding-right:20px}}';
    document.head.appendChild(style);
  }

  fetch("/assets/data/blog-posts.json")
    .then(function (response) { return response.json(); })
    .then(function (data) {
      var post = findFeatured(postsArray(data));
      if (!post) return;

      injectStyles();
      renderFeatured(post);
    })
    .catch(function () {});
})();
