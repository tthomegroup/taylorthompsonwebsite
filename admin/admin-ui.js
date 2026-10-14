(function () {
  var PUBLISH_AND_NEW_INTENT_KEY = "tthg.blogPublishAndCreateNew";
  var PUBLISH_AND_NEW_SUCCESS_KEY = "tthg.blogPublishAndCreateNewSuccess";
  var PUBLISH_AND_NEW_MAX_AGE = 5 * 60 * 1000;

  function readSessionValue(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeSessionValue(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      // Publishing still works when storage is unavailable; only the reset helper is skipped.
    }
  }

  function removeSessionValue(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      // Ignore storage restrictions in private or locked-down browser sessions.
    }
  }

  function isBlogEntryRoute() {
    return /^#\/collections\/blog\/(?:new(?:[/?]|$)|entries\/)/.test(window.location.hash || "");
  }

  function actionLabel(target) {
    if (!target || typeof target.closest !== "function") return "";
    var action = target.closest("button, [role='button'], [role='menuitem']");
    return action ? action.textContent.replace(/\s+/g, " ").trim().toLowerCase() : "";
  }

  function openFreshBlogEditor() {
    var basePath = (window.location.pathname || "/admin/").replace(/\/?$/, "/");
    window.location.replace(basePath + "?fresh=" + Date.now() + "#/collections/blog/new");
  }

  function showPublishSuccessNotice() {
    if (!readSessionValue(PUBLISH_AND_NEW_SUCCESS_KEY)) return;
    removeSessionValue(PUBLISH_AND_NEW_SUCCESS_KEY);

    var notice = document.createElement("div");
    notice.className = "admin-publish-success";
    notice.setAttribute("role", "status");
    notice.textContent = "Published successfully. A new blank blog post is ready.";
    document.body.appendChild(notice);

    window.setTimeout(function () {
      notice.classList.add("admin-publish-success--leaving");
      window.setTimeout(function () {
        if (notice.parentNode) notice.parentNode.removeChild(notice);
      }, 250);
    }, 7000);
  }

  function registerPublishAndCreateNewFix() {
    if (!window.CMS || window.__tthgPublishAndCreateNewRegistered) return;
    window.__tthgPublishAndCreateNewRegistered = true;

    document.addEventListener("click", function (event) {
      var label = actionLabel(event.target);

      if (label.indexOf("publish and create new") !== -1 && isBlogEntryRoute()) {
        writeSessionValue(PUBLISH_AND_NEW_INTENT_KEY, JSON.stringify({
          collection: "blog",
          createdAt: Date.now()
        }));
        return;
      }

      if (label.indexOf("publish now") !== -1 || label.indexOf("publish and duplicate") !== -1) {
        removeSessionValue(PUBLISH_AND_NEW_INTENT_KEY);
      }
    }, true);

    window.CMS.registerEventListener({
      name: "postPublish",
      handler: function (event) {
        var rawIntent = readSessionValue(PUBLISH_AND_NEW_INTENT_KEY);
        if (!rawIntent) return;

        var intent;
        try {
          intent = JSON.parse(rawIntent);
        } catch (error) {
          removeSessionValue(PUBLISH_AND_NEW_INTENT_KEY);
          return;
        }

        var isRecent = intent.createdAt && Date.now() - intent.createdAt < PUBLISH_AND_NEW_MAX_AGE;
        var entry = event && event.entry;
        var publishedCollection = entry && typeof entry.get === "function" ? entry.get("collection") : "";
        var publishedCollectionName = publishedCollection && typeof publishedCollection.get === "function"
          ? publishedCollection.get("name")
          : publishedCollection;
        var isBlogPublish = !publishedCollectionName || publishedCollectionName === "blog";

        removeSessionValue(PUBLISH_AND_NEW_INTENT_KEY);
        if (!isRecent || intent.collection !== "blog" || !isBlogPublish) return;

        writeSessionValue(PUBLISH_AND_NEW_SUCCESS_KEY, "1");
        window.setTimeout(openFreshBlogEditor, 75);
      }
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function inlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/<((?:https?:\/\/|mailto:|tel:)[^>\s]+)>/gi, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])((?:https?:\/\/)[^\s<>()]+)/gi, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
  }

  function markdownToHtml(markdown) {
    var lines = String(markdown || "").split(/\r?\n/);
    var html = [];
    var listType = null;

    function closeList() {
      if (!listType) return;
      html.push("</" + listType + ">");
      listType = null;
    }

    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) {
        closeList();
        return;
      }

      if (/^###\s+/.test(trimmed)) {
        closeList();
        html.push("<h3>" + inlineMarkdown(trimmed.replace(/^###\s+/, "")) + "</h3>");
        return;
      }

      if (/^#{1,2}\s+/.test(trimmed)) {
        closeList();
        html.push("<h2>" + inlineMarkdown(trimmed.replace(/^#{1,2}\s+/, "")) + "</h2>");
        return;
      }

      if (/^>\s+/.test(trimmed)) {
        closeList();
        html.push("<blockquote>" + inlineMarkdown(trimmed.replace(/^>\s+/, "")) + "</blockquote>");
        return;
      }

      if (/^[-*+\u2022\u2023\u25e6\u2043]\s+/.test(trimmed)) {
        if (listType !== "ul") {
          closeList();
          listType = "ul";
          html.push("<ul>");
        }
        html.push("<li>" + inlineMarkdown(trimmed.replace(/^[-*+\u2022\u2023\u25e6\u2043]\s+/, "")) + "</li>");
        return;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        if (listType !== "ol") {
          closeList();
          listType = "ol";
          html.push("<ol>");
        }
        html.push("<li>" + inlineMarkdown(trimmed.replace(/^\d+\.\s+/, "")) + "</li>");
        return;
      }

      closeList();
      html.push("<p>" + inlineMarkdown(trimmed) + "</p>");
    });

    closeList();
    return html.join("");
  }

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

  function registerBlogPreview() {
    if (!window.CMS || window.__tthgBlogPreviewRegistered) return;
    window.__tthgBlogPreviewRegistered = true;

    var createElement = window.h || (window.React && window.React.createElement);
    if (!createElement) return;

    window.CMS.registerPreviewTemplate("blog", function BlogPreview(props) {
      var data = props.entry.get("data").toJS();
      var body = data.body || data.content || "";
      var bodyPreview = props.widgetFor ? props.widgetFor("body") : null;
      return createElement("article", { className: "blog-preview" },
        createElement("style", null,
          ".blog-preview{padding:32px;font-family:Jost,Arial,sans-serif;color:#050505;background:#fff;line-height:1.75}" +
          ".blog-preview h1,.blog-preview h2,.blog-preview h3{font-family:Georgia,serif;font-weight:400;line-height:1.15}" +
          ".blog-preview h1{font-size:44px}.blog-preview h2{font-size:32px;margin-top:34px}.blog-preview h3{font-size:25px;margin-top:28px}" +
          ".blog-preview p,.blog-preview li{font-size:16px;color:#765f50}.blog-preview ul,.blog-preview ol{padding-left:24px}.blog-preview li{margin-bottom:8px}" +
          ".blog-preview .meta{color:#c8ad9a;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.blog-preview img{max-width:100%;height:auto}" +
          ".blog-preview__body{margin-top:28px}.blog-preview__empty{margin-top:28px;color:#765f50;font-style:italic}"
        ),
        createElement("p", { className: "meta" }, [data.category, data.readTime].filter(Boolean).join(" | ")),
        createElement("h1", null, data.title || "Blog Post Preview"),
        data.excerpt ? createElement("p", null, data.excerpt) : null,
        data.featuredImage ? createElement("img", { src: data.featuredImage, alt: data.imageAlt || data.title || "" }) : null,
        bodyPreview
          ? createElement("div", { className: "blog-preview__body" }, bodyPreview)
          : body
            ? createElement("div", { className: "blog-preview__body", dangerouslySetInnerHTML: { __html: markdownToHtml(body) } })
            : createElement("p", { className: "blog-preview__empty" }, "Start typing in the Body field to preview the full post here.")
      );
    });
  }

  function decorateAdmin() {
    decorateReviewOrder();
    registerBlogPreview();
    registerPublishAndCreateNewFix();
  }

  var observer = new MutationObserver(decorateAdmin);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  decorateAdmin();
  showPublishSuccessNotice();
})();
