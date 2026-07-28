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

  function fieldLabelText(field) {
    if (!field) return "";
    var label = field.querySelector("label");
    return (label ? label.textContent : field.textContent || "").toLowerCase();
  }

  function isBodyMarkdownPasteTarget(target) {
    if (!target || !target.closest) return false;

    var field = target.closest('[class*="MarkdownControl"], [class*="ControlContainer"], [class*="EditorControl"]');
    if (!field) return false;

    var isRawEditor =
      target.tagName === "TEXTAREA" ||
      target.tagName === "INPUT" ||
      Boolean(target.closest(".CodeMirror"));

    if (!isRawEditor) return false;

    var label = fieldLabelText(field);
    return label.indexOf("body") !== -1 || label.indexOf("content") !== -1;
  }

  function cleanPastedText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n?/g, "\n")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
  }

  function plainBulletsToMarkdown(value) {
    return cleanPastedText(value)
      .split("\n")
      .map(function (line) {
        return line
          .replace(/^(\s*)[•‣◦⁃]\s+/, "$1- ")
          .replace(/^(\s*)[–—]\s+/, "$1- ");
      })
      .join("\n");
  }

  function elementText(element) {
    return cleanPastedText(element.textContent || "").replace(/\s+/g, " ").trim();
  }

  function htmlNodeToMarkdown(node, depth, output) {
    if (!node) return;

    if (node.nodeType === 3) {
      var text = cleanPastedText(node.nodeValue).trim();
      if (text) output.push(text);
      return;
    }

    if (node.nodeType !== 1) return;

    var tag = node.tagName.toLowerCase();

    if (tag === "ul" || tag === "ol") {
      Array.prototype.forEach.call(node.children, function (child, index) {
        if (child.tagName && child.tagName.toLowerCase() === "li") {
          htmlNodeToMarkdown(child, depth, output, tag === "ol" ? index + 1 : null);
        }
      });
      output.push("");
      return;
    }

    if (tag === "li") {
      var nestedLists = Array.prototype.slice.call(node.querySelectorAll(":scope > ul, :scope > ol"));
      nestedLists.forEach(function (list) {
        list.parentNode.removeChild(list);
      });

      var bullet = arguments.length > 3 && arguments[3] ? arguments[3] + ". " : "- ";
      var indent = new Array(depth + 1).join("  ");
      var text = elementText(node);
      if (text) output.push(indent + bullet + text);

      nestedLists.forEach(function (list) {
        htmlNodeToMarkdown(list, depth + 1, output);
      });
      return;
    }

    if (tag === "br") {
      output.push("");
      return;
    }

    if (/^h[1-6]$/.test(tag)) {
      var level = Math.min(3, Math.max(2, Number(tag.charAt(1))));
      var heading = elementText(node);
      if (heading) output.push(new Array(level + 1).join("#") + " " + heading, "");
      return;
    }

    if (tag === "p" || tag === "div") {
      var paragraph = elementText(node);
      if (paragraph) output.push(plainBulletsToMarkdown(paragraph), "");
      return;
    }

    Array.prototype.forEach.call(node.childNodes, function (child) {
      htmlNodeToMarkdown(child, depth, output);
    });
  }

  function htmlToMarkdown(value) {
    if (!value || value.indexOf("<") === -1) return "";

    var doc;
    try {
      doc = new DOMParser().parseFromString(value, "text/html");
    } catch (error) {
      return "";
    }

    if (!doc.querySelector("li, ul, ol")) return "";

    var output = [];
    Array.prototype.forEach.call(doc.body.childNodes, function (node) {
      htmlNodeToMarkdown(node, 0, output);
    });

    return output
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function insertMarkdownAtTarget(target, value) {
    var text = cleanPastedText(value);
    if (!text) return;

    if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) {
      var start = target.selectionStart || 0;
      var end = target.selectionEnd || 0;
      target.value = target.value.slice(0, start) + text + target.value.slice(end);
      target.selectionStart = target.selectionEnd = start + text.length;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (document.queryCommandSupported && document.queryCommandSupported("insertText")) {
      document.execCommand("insertText", false, text);
      var active = document.activeElement;
      if (active) {
        active.dispatchEvent(new Event("input", { bubbles: true }));
        active.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  function normalizeBodyPaste(event) {
    if (!isBodyMarkdownPasteTarget(event.target)) return;

    var clipboard = event.clipboardData || window.clipboardData;
    if (!clipboard) return;

    var html = clipboard.getData("text/html");
    var plain = clipboard.getData("text/plain");
    var markdown = htmlToMarkdown(html) || plainBulletsToMarkdown(plain);

    if (!markdown || markdown === plain) return;

    event.preventDefault();
    insertMarkdownAtTarget(event.target, markdown);
  }

  function decorateAdmin() {
    decorateReviewOrder();
    decorateMarkdownEditor();
  }

  document.addEventListener("paste", normalizeBodyPaste, true);

  var observer = new MutationObserver(decorateAdmin);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  decorateAdmin();
})();
