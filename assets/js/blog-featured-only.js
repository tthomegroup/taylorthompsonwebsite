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

  function findFeaturedLabel() {
    return Array.prototype.find.call(document.querySelectorAll("body *"), function (element) {
      return slugify(directText(element) || element.textContent) === "featured-blog";
    });
  }

  function findFeaturedBlock() {
    var label = findFeaturedLabel();
    var current = label;

    while (current && current.parentElement && current.parentElement !== document.body) {
      var text = slugify(current.textContent || "");

      if (text.indexOf("latest-blogs") !== -1) return null;

      if (
        current.querySelector &&
        current.querySelector("img") &&
        text.indexOf("read-full-blog") !== -1
      ) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  function updateFeatured(post) {
    var block = findFeaturedBlock();
    if (!block || !post) return;

    var image = block.querySelector("img");
    var title = Array.prototype.find.call(block.querySelectorAll("h1, h2, h3"), function (element) {
      return slugify(element.textContent) !== "featured-blog";
    });
    var readLink = Array.prototype.find.call(block.querySelectorAll("a"), function (element) {
      return slugify(element.textContent).indexOf("read-full-blog") !== -1;
    });
    var paragraphs = Array.prototype.filter.call(block.querySelectorAll("p"), function (element) {
      return slugify(element.textContent) !== "featured-blog";
    });

    if (image && (post.featuredImage || post.image)) {
      image.src = assetPath(post.featuredImage || post.image);
      image.alt = post.imageAlt || post.title || "";
    }

    if (title) title.textContent = post.title || "";
    if (paragraphs[0]) paragraphs[0].textContent = post.excerpt || "";
    if (readLink) readLink.href = postUrl(post);

    Array.prototype.forEach.call(block.querySelectorAll("span, .category, .blog-category, .post-category"), function (element) {
      var text = slugify(element.textContent);

      if (text.indexOf("market-updates") !== -1 || text.indexOf("buyer-tips") !== -1 || text.indexOf("seller-tips") !== -1 || text.indexOf("first-time-buyers") !== -1 || text.indexOf("investment") !== -1 || text.indexOf("local-spotlight") !== -1) {
        element.textContent = (post.categoryLabel || post.displayCategory || post.category || "").toUpperCase();
      }
    });
  }

  fetch("/assets/data/blog-posts.json")
    .then(function (response) { return response.json(); })
    .then(function (data) {
      updateFeatured(findFeatured(postsArray(data)));
    })
    .catch(function () {});
})();
