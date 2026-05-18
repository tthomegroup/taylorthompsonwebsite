(function () {
  function cleanPath(pathname) {
    var path = pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "").replace(/\/+$/, "");
    return path || "/";
  }

  function loadInclude(element) {
    var url = element.getAttribute("data-include");
    if (!url) return Promise.resolve();

    return fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load " + url);
        return response.text();
      })
      .then(function (html) {
        element.innerHTML = html;
      });
  }

  function setActiveNav() {
    var current = cleanPath(window.location.pathname);

    document.querySelectorAll("[data-nav-path]").forEach(function (link) {
      var target = cleanPath(link.getAttribute("data-nav-path"));
      var active = target === "/" ? current === "/" : current === target || current.indexOf(target + "/") === 0;
      link.classList.toggle("is-active", active);
    });
  }

  function setupMobileNav() {
    var toggle = document.querySelector(".site-nav-toggle");
    var menu = document.getElementById("site-nav-menu");
    var more = document.querySelector(".site-nav-more");
    var moreButton = document.querySelector(".site-nav-more__button");

    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        var open = !menu.classList.contains("is-open");
        menu.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    if (more && moreButton) {
      moreButton.addEventListener("click", function () {
        var open = !more.classList.contains("is-open");
        more.classList.toggle("is-open", open);
        moreButton.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  function setYear() {
    document.querySelectorAll("[data-current-year]").forEach(function (element) {
      element.textContent = new Date().getFullYear();
    });
  }

  function initIncludes() {
    var includes = Array.prototype.slice.call(document.querySelectorAll("[data-include]"));

    Promise.all(includes.map(loadInclude)).then(function () {
      setActiveNav();
      setupMobileNav();
      setYear();
      document.dispatchEvent(new CustomEvent("site:includes-loaded"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initIncludes);
  } else {
    initIncludes();
  }
})();
