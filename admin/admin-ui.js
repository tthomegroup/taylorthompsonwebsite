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
    var candidates = Array.prototype.filter.call(document.querySelectorAll("div, section, nav"), function (element) {
      var text = element.textContent.replace(/\s+/g, " ").trim();
      if (text.indexOf("Rich Text") === -1 || text.indexOf("Markdown") === -1) return false;
      return Boolean(element.querySelector("button, a, [role='button'], input"));
    }).filter(function (element, index, all) {
      return !all.some(function (other) {
        return other !== element && element.contains(other);
      });
    });

    candidates.forEach(function (candidate) {
      var toolbar = candidate;
      var field = toolbar.closest('[class*="MarkdownControl"], [class*="ControlContainer"], [class*="EditorControl"], [class*="Widget"]');
      if (!field) return;

      var editor = field.querySelector(".CodeMirror, textarea, [contenteditable='true']");
      if (editor && toolbar.parentElement !== field) {
        field.insertBefore(toolbar, editor);
      } else if (editor && toolbar.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_PRECEDING) {
        field.insertBefore(toolbar, editor);
      }

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
