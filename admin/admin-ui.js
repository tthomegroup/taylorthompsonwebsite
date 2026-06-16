(function () {
  function decorateReviewOrder() {
    var labels = Array.prototype.filter.call(document.querySelectorAll("label, span"), function (element) {
      return element.textContent.trim() === "Review Order";
    });

    labels.forEach(function (label) {
      var container = label.closest('[class*="ControlContainer"], [class*="EditorControl"]');
      if (!container) return;

      var candidates = Array.prototype.slice.call(container.querySelectorAll('[class*="ListItem"], [class*="listItem"]'));
      var items = candidates.filter(function (item) {
        return !candidates.some(function (other) {
          return other !== item && other.contains(item);
        });
      });

      items.forEach(function (item, index) {
        item.classList.toggle("featured-review-item", index < 3);
        item.classList.toggle("featured-review-boundary", index === 2);
        item.classList.toggle("more-reviews-start", index === 3);
      });
    });
  }

  function decorateMarkdownEditors() {
    var candidates = Array.prototype.filter.call(document.querySelectorAll("div, section"), function (element) {
      var text = element.textContent.replace(/\s+/g, " ").trim();
      return text.indexOf("Rich Text") !== -1 && text.indexOf("Markdown") !== -1;
    });

    candidates.forEach(function (candidate) {
      var toolbar = candidate;
      while (toolbar.parentElement && toolbar.parentElement.textContent.replace(/\s+/g, " ").trim() === candidate.textContent.replace(/\s+/g, " ").trim()) {
        toolbar = toolbar.parentElement;
      }

      var field = toolbar.closest('[class*="MarkdownControl"], [class*="ControlContainer"], [class*="EditorControl"]');
      if (!field) return;

      field.classList.add("admin-markdown-field");
      toolbar.classList.add("admin-markdown-toolbar");
    });
  }

  function decorateAdmin() {
    decorateReviewOrder();
    decorateMarkdownEditors();
  }

  var observer = new MutationObserver(decorateAdmin);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  decorateAdmin();
})();
