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
  var observerStarted = false;

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

  function ownText(element) {
    return Array.prototype.map
      .call(element.childNodes || [], function (node) {
        return node.nodeType === Node.TEXT_NODE ? node.textContent : "";
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isCategoryText(value) {
    var normalized = normalizeCategory(value);
    return normalized === "ALL" || categories.indexOf(normalized) !== -1;
  }

  function closestCategoryButton(element) {
    if (!element || !element.closest) return null;

    var button = element.closest("button, a, [role='button']");
    if (!button || !isCategoryText(button.textContent)) return null;

    return button;
  }

  function getCategoryButtons() {
    return Array.prototype.filter.call(document.querySelectorAll("button, a, [role='button']"), function (button) {
      return isCategoryText(button.textContent);
    });
  }

  function hasFeaturedAncestor(element) {
    if (element.closest("[data-dynamic-featured='true']")) return true;

    var section = element.closest("section, .featured, .featured-posts, .featured-blog, .featured-blogs");
    if (!section) return false;

    var marker = [
      section.id || "",
      section.className || "",
      section.querySelector("h1, h2, h3, p, span") ? section.querySelector("h1, h2, h3, p, span").textContent : "",
    ].join(" ");

    return slugify(marker).indexOf("featured") !== -1;
  }

  function categoryLabelElements() {
    return Array.prototype.filter.call(document.querySelectorAll("body *"), function (element) {
      if (element.children.length > 1) return false;
      if (hasFeaturedAncestor(element)) return false;

      return categories.indexOf(normalizeCategory(ownText(element) || element.textContent)) !== -1;
    });
  }

  function containsAnotherCategoryLabel(card, originalLabel) {
    return categoryLabelElements().some(function (label) {
      return label !== originalLabel && card.contains(label);
    });
  }

  function cardFromLabel(label) {
    var current = label;

    while (current && current !== document.body) {
      var hasImage = Boolean(current.querySelector && current.querySelector("img, [style*='background-image']"));
      var hasTitle = Boolean(current.querySelector && current.querySelector("h1, h2, h3, a"));
      var hasReadLink = slugify(current.textContent).indexOf("read-full-blog") !== -1;

      if ((hasImage && hasTitle) || hasReadLink) {
        if (!containsAnotherCategoryLabel(current, label)) return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  function uniqueCards(cards) {
    var unique = [];

    cards.forEach(function (card) {
      if (card && unique.indexOf(card) === -1) unique.push(card);
    });

    return unique;
  }

  function findCards() {
    return uniqueCards(categoryLabelElements().map(cardFromLabel));
  }

  function cardCategory(card) {
    var labels = categoryLabelElements().filter(function (label) {
      return card.contains(label);
    });

    return labels.length ? normalizeCategory(ownText(labels[0]) || labels[0].textContent) : "";
  }

  function applyActiveStyles() {
    getCategoryButtons().forEach(function (button) {
      var isActive = normalizeCategory(button.textContent) === activeCategory;

      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function applyFilters() {
    var searchSlug = slugify(searchTerm);
    var cards = findCards();

    cards.forEach(function (card) {
      var categoryMatches =
        activeCategory === "ALL" || cardCategory(card) === activeCategory;
      var searchMatches = !searchSlug || slugify(card.textContent || "").indexOf(searchSlug) !== -1;
      var shouldShow = categoryMatches && searchMatches;

      card.hidden = !shouldShow;
      card.style.display = shouldShow ? "" : "none";
    });

    applyActiveStyles();
  }

  function wireCategoryButtons() {
    document.addEventListener(
      "click",
      function (event) {
        var button = closestCategoryButton(event.target);

        if (!button) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        activeCategory = normalizeCategory(button.textContent);
        applyFilters();
        window.setTimeout(applyFilters, 0);
        window.setTimeout(applyFilters, 100);
      },
      true
    );
  }

  function wireSearch() {
    var input = document.querySelector(
      "input[type='search'], input[placeholder*='Search blog'], input[placeholder*='Search Blog']"
    );

    if (!input) return;

    input.addEventListener("input", function () {
      searchTerm = input.value || "";
      applyFilters();
    });
  }

  function init() {
    wireCategoryButtons();
    wireSearch();
    applyFilters();

    if (observerStarted) return;

    observerStarted = true;
    new MutationObserver(function () {
      window.requestAnimationFrame(applyFilters);
    }).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
