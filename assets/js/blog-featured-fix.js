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

  function findFeaturedPost(posts) {
    return posts
      .filter(function (post) {
        return post.featured === true || post.isFeatured === true || post.featuredPost === true;
      })
      .sort(function (a, b) {
        return postDate(b) - postDate(a);
      })[0];
  }

  function findFeaturedSection() {
    var sections = Array.prototype.slice.call(document.querySelectorAll("section, .featured, .featured-blog, .featured-posts"));

    return sections.find(function (section) {
      var marker = [
        section.id || "",
        section.className || "",
        section.querySelector("h1, h2, h3, p, span") ? section.querySelector("h1, h2, h3, p, span").textContent : "",
      ].join(" ");

      return slugify(marker).indexOf("featured-blog") !== -1 || slugify(marker).indexOf("featured") !== -1;
    });
  }

  function updateText(section, selectors, value) {
    for (var index = 0; index < selectors.length; index += 1) {
      var element = section.querySelector(selectors[index]);
      if (element) {
        element.textContent = value || "";
        return true;
      }
    }

    return false;
  }

  function updateImage(section, post) {
    var image = section.querySelector("img");
    var imageUrl = post.featuredImage || post.image || "";

    if (image && imageUrl) {
      image.src = assetPath(imageUrl);
      image.alt = post.imageAlt || post.title || "";
      return;
    }

    var imageLike = section.querySelector("[style*='background-image']");
    if (imageLike && imageUrl) {
      imageLike.style.backgroundImage = "url('" + assetPath(imageUrl).replace(/'/g, "\\'") + "')";
    }
  }

  function updateLink(section, post) {
    var url = post.url || post.link || post.permalink || "/blog/" + (post.slug || slugify(post.title));
    var links = section.querySelectorAll("a");

    Array.prototype.forEach.call(links, function (link) {
      if (slugify(link.textContent).indexOf("read-full-blog") !== -1 || slugify(link.textContent).indexOf("read-more") !== -1) {
        link.href = url;
      }
    });
  }

  function renderFallback(section, post) {
    var image = post.featuredImage || post.image || "";
    section.innerHTML =
      '<div class="featured-blog-image">' +
        (image ? '<img src="' + escapeHtml(assetPath(image)) + '" alt="' + escapeHtml(post.imageAlt || post.title || "") + '">' : "") +
      "</div>" +
      '<div class="featured-blog-content">' +
        '<p class="featured-blog-label">Featured Blog</p>' +
        "<h2>" + escapeHtml(post.title || "") + "</h2>" +
        "<p>" + escapeHtml(post.excerpt || "") + "</p>" +
        '<div class="featured-blog-meta">' +
          "<span>" + escapeHtml(post.category || "") + "</span>" +
          "<span>" + escapeHtml(post.date || post.publishDate || "") + "</span>" +
        "</div>" +
        '<a href="' + escapeHtml(post.url || "/blog/" + (post.slug || slugify(post.title))) + '">Read Full Blog</a>' +
      "</div>";
  }

  function updateFeaturedSection(post) {
    var section = findFeaturedSection();
    if (!section || !post) return;

    section.dataset.dynamicFeatured = "true";

    updateImage(section, post);

    if (!updateText(section, ["h1", "h2", ".featured-title", ".blog-title"], post.title)) {
      renderFallback(section, post);
      return;
    }

    updateText(section, [".excerpt", ".featured-excerpt", ".blog-excerpt", "p:not(.featured-blog-label)"], post.excerpt);
    updateText(section, [".category", ".blog-category", ".post-category"], post.category);
    updateText(section, [".date", ".blog-date", ".post-date"], post.date || post.publishDate);
    updateLink(section, post);
  }

  fetch("/assets/data/blog-posts.json")
    .then(function (response) { return response.json(); })
    .then(function (data) {
      updateFeaturedSection(findFeaturedPost(postsArray(data)));
    })
    .catch(function () {});
})();
