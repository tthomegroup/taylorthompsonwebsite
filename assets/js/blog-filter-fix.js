(function () {
  var categories = [
    "MARKET UPDATES",
    "BUYER TIPS",
    "SELLER TIPS",
    "FIRST-TIME BUYERS",
    "INVESTMENT",
    "LOCAL SPOTLIGHT",
  ];

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
    for (var index = 0; index < categories.length; index += 1) {
      if (slugify(categories[index]) === slug) return categories[index];
    }
    return String(value || "").trim().toUpperCase();
  }

  function controlText(element) {
    return normalizeCategory(element.textContent || "");
  }

  function isCategoryControl(element) {
    if (!element || !element.textContent) return false;

    var text = controlText(element);
    return text === "ALL" || categories.indexOf(text) !== -1;
  }

  function getCategoryControls() {
    return Array.prototype.filter.call(
      document.querySelectorAll("button, a, [role='button']"),
      isCategoryControl
    );
  }

  function closestCard(element) {
    return element.closest(
      "article, .blog-card, .post-card, .blog-post-card, .blog-item, .post-item, .card"
    );
  }

  function isInsideFeaturedSection(element) {
    if (element.closest("[data-dynamic-featured='true']")) return true;

    var section = element.closest("section, .featured, .featured-posts, .featured-blog, .featured-blogs");
    if (!section) return false;

    var marker = [
      section.id || "",
      section.className || "",
      section.querySelector("h1, h2, h3") ? section.querySelector("h1, h2, h3").textContent : "",
    ].join(" ");

    return slugify(marker).indexOf("featured") !== -1;
  }

  function findCards() {
    var matches = [];
    var controls = getCategoryControls();
    var firstControl = controls.length ? controls[0] : null;
    var allElements = document.querySelectorAll("article, .blog-card, .post-card, .blog-post-card, .blog-item, .post-item, .card");

    Array.prototype.forEach.call(allElements, function (element) {
      var text = element.textContent || "";
      var hasCategory = categories.some(function (category) {
        return slugify(text).indexOf(slugify(category)) !== -1;
      });

      if (!hasCategory) return;
      if (isInsideFeaturedSection(element)) return;
      if (firstControl && firstControl.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) {
        return;
      }

      matches.push(element);
    });

    return matches;
  }

  function cardCategory(card) {
    var text = card.textContent || "";
    var found = categories.find(function (category) {
      return slugify(text).indexOf(slugify(category)) !== -1;
    });

    return found || "";
  }

  function applyActiveStyles() {
    getCategoryControls().forEach(function (control) {
      var isActive = controlText(control) === activeCategory;
      control.classList.toggle("active", isActive);
      control.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function applyFilters() {
    var activeSlug = slugify(activeCategory);
    var searchSlug = slugify(searchTerm);

    findCards().forEach(function (card) {
      var categoryMatches =
        activeCategory === "ALL" || slugify(cardCategory(card)) === activeSlug;
      var searchMatches = !searchSlug || slugify(card.textContent || "").indexOf(searchSlug) !== -1;

      card.hidden = !(categoryMatches && searchMatches);
    });

    applyActiveStyles();
  }

  function wireCategoryControls() {
    getCategoryControls().forEach(function (control) {
      control.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopImmediatePropagation();
          activeCategory = controlText(control);
          applyFilters();
        },
        true
      );
    });
  }

  function wireSearch() {
    var searchInput = document.querySelector(
      "input[type='search'], input[placeholder*='Search blog'], input[placeholder*='Search Blog']"
    );

    if (!searchInput) return;

    searchInput.addEventListener("input", function () {
      searchTerm = searchInput.value || "";
      applyFilters();
    });
  }

  function init() {
    wireCategoryControls();
    wireSearch();
    applyFilters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
