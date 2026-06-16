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

  function decorateMarkdownEditor() {
    Array.prototype.forEach.call(document.querySelectorAll(".CodeMirror"), function (editor) {
      var field = editor.closest('[class*="MarkdownControl"], [class*="ControlContainer"], [class*="EditorControl"]');
      if (!field) return;

      var toolbar = field.querySelector(".editor-toolbar, [class*='toolbar'], [class*='Toolbar']");
      if (!toolbar) return;

      var toolbarHeight = Math.max(96, Math.ceil(toolbar.getBoundingClientRect().height) + 34);
      field.classList.add("admin-markdown-field");
      toolbar.classList.add("admin-markdown-toolbar");
      field.style.setProperty("--admin-toolbar-offset", toolbarHeight + "px");

      [".CodeMirror-scroll", ".CodeMirror-sizer", ".CodeMirror-lines", ".CodeMirror-code"].forEach(function (selector) {
        Array.prototype.forEach.call(field.querySelectorAll(selector), function (part) {
          part.style.setProperty("padding-top", toolbarHeight + "px", "important");
        });
      });
    });
  }

  function decorateAdmin() {
    decorateReviewOrder();
    decorateMarkdownEditor();
  }

  var observer = new MutationObserver(decorateAdmin);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  decorateAdmin();
})();
