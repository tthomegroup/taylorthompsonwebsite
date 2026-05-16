(function () {
  var categories = [
    "MARKET UPDATES",
    "BUYER TIPS",
    "SELLER TIPS",
    "FIRST-TIME BUYERS",
    "INVESTMENT",
    "LOCAL SPOTLIGHT",
  ];

  var allPosts = [];
  var activeCategory = "ALL";
  var searchTerm = "";

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeCategory(value) {
    var slug = slugify(value);

    if (slug === "all") return "ALL";

    for (var index = 0; index < categories.length; index += 1) {
      if (slugify(categories[index]) === slug) return categories[index];
    }

    return String(value || "").trim().toUpperCase();
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

  function postUrl(post) {
    return post.url || post.link || post.permalink || "/blog/" + (post.slug || slugify(post.title));
  }

  function postCategory(post) {
    return normalizeCategory(post.category || (post.categories && post.categories[0]) || "");
  }

  function postDate(post) {
    return new Date(post.date || post.publishDate || 0).getTime();
  }

  function ownText(element) {
    return Array.prototype.map.call(element.childNodes || [], function (node) {
      return node.nodeType === Node.TEXT_NODE ? node.textContent : "";
    }).join(" ").replace(/\s+/g, " ").trim();
  }

  function isCategoryButton(element) {
    return element && normalizeCategory(element.textContent) === activeCategory;
  }

  function getCategoryButtons() {
    return Array.prototype.filter.call(document.querySelectorAll("button, a, [role='button']"), function (button) {
      var value = normalizeCategory(button.textContent);
      return value === "ALL" || categories.indexOf(value) !== -1;
    });
  }

  function findCategoryLabels() {
    return Array.prototype.filter.call(document.querySelectorAll("body *"), function (element) {
      if (element.children.length > 1) return false;
      return categories.indexOf(normalizeCategory(ownText(element) || element.textContent)) !== -1;
    });
  }

  function cardFromLabel(label) {
    var current = label;

    while (current && current.parentElement && current.parentElement !== document.body) {
      var siblingLabels = Array.prototype.filter.call(current.parentElement.querySelectorAll("*"), function (element) {
        return element !== label && categories.indexOf(normalizeCategory(ownText(element) || element.textContent)) !== -1;
      });

      if (siblingLabels.length > 0) return current;

      current = current.parentElement;
    }

    return label.closest("article, .blog-card, .post-card, .card") || null;
  }

  function existingCards() {
    var cards = [];

    findCategoryLabels().forEach(function (label) {
      var card = cardFromLabel(label);
      if (card && cards.indexOf(card) === -1) cards.push(card);
    });

    return cards.filter(function (card) {
      return slugify(card.textContent).indexOf("featured-blog") === -1;
    });
  }

  function gridParent() {
    var cards = existingCards();
    return cards.length ? cards[0].parentElement : null;
  }

  function cardHtml(post) {
    var image = post.featuredImage || post.image || "";
    var category = postCategory(post);

    return (
      '<article class="blog-card">' +
        (image ? '<img src="' + escapeHtml(assetPath(image)) + '" alt="' + escapeHtml(post.imageAlt || post.title || "") + '">' : "") +
        '<div class="blog-card-body">' +
          '<p class="blog-card-category">' + escapeHtml(category) + '</p>' +
          '<h3>' + escapeHtml(post.title || "") + '</h3>' +
          '<p>' + escapeHtml(post.excerpt || "") + '</p>' +
          '<a class="blog-card-link" href="' + escapeHtml(postUrl(post)) + '">Read Full Blog</a>' +
        '</div>' +
      '</article>'
    );
  }

  function updateActiveButtons() {
    getCategoryButtons().forEach(function (button) {
      var isActive = normalizeCategory(button.textContent) === activeCategory;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function filteredPosts() {
    var searchSlug = slugify(searchTerm);

    return allPosts.filter(function (post) {
      var categoryMatches = activeCategory === "ALL" || postCategory(post) === activeCategory;
      var searchMatches = !searchSlug || slugify([post.title, post.excerpt, postCategory(post)].join(" ")).indexOf(searchSlug) !== -1;

      return categoryMatches && searchMatches;
    });
  }

  function renderGrid() {
    var parent = gridParent();
    if (!parent) return;

    parent.innerHTML = filteredPosts().map(cardHtml).join("");
    updateActiveButtons();
  }

  function findFeaturedPost() {
    return allPosts
      .filter(function (post) {
        return post.featured === true || post.isFeatured === true || post.featuredPost === true;
      })
      .sort(function (a, b) {
        return postDate(b) - postDate(a);
      })[0];
  }

  function featuredSection() {
    var labels = Array.prototype.filter.call(document.querySelectorAll("body *"), function (element) {
      return slugify(ownText(element) || element.textContent) === "featured-blog";
    });

    if (!labels.length) return null;

    var current = labels[0];
    while (current && current.parentElement && current.parentElement !== document.body) {
      if (current.querySelector && current.querySelector("img") && slugify(current.textContent).indexOf("read-full-blog") !== -1) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  function renderFeatured() {
    var post = findFeaturedPost();
    var section = featuredSection();
    if (!post || !section) return;

    var image = post.featuredImage || post.image || "";

    section.innerHTML =
      '<div class="featured-blog-image">' +
        (image ? '<img src="' + escapeHtml(assetPath(image)) + '" alt="' + escapeHtml(post.imageAlt || post.title || "") + '">' : "") +
      '</div>' +
      '<div class="featured-blog-content">' +
        '<p class="featured-blog-label">Featured Blog</p>' +
        '<h2>' + escapeHtml(post.title || "") + '</h2>' +
        '<p>' + escapeHtml(post.excerpt || "") + '</p>' +
        '<div class="featured-blog-meta">' +
          '<span>' + escapeHtml(postCategory(post)) + '</span>' +
          '<span>' + escapeHtml(post.date || post.publishDate || "") + '</span>' +
        '</div>' +
        '<a href="' + escapeHtml(postUrl(post)) + '">Read Full Blog</a>' +
      '</div>';
  }

  function wireControls() {
    document.addEventListener("click", function (event) {
      var button = event.target.closest && event.target.closest("button, a, [role='button']");
      if (!button) return;

      var category = normalizeCategory(button.textContent);
      if (category !== "ALL" && categories.indexOf(category) === -1) return;

      event.preventDefault();
      activeCategory = category;
      renderGrid();
    });

    var search = document.querySelector("input[type='search'], input[placeholder*='Search blog'], input[placeholder*='Search Blog']");
    if (search) {
      search.addEventListener("input", function () {
        searchTerm = search.value || "";
        renderGrid();
      });
    }
  }

  fetch("/assets/data/blog-posts.json")
    .then(function (response) { return response.json(); })
    .then(function (data) {
      allPosts = postsArray(data).sort(function (a, b) {
        return postDate(b) - postDate(a);
      });
      renderFeatured();
      renderGrid();
      wireControls();
    });
})();
