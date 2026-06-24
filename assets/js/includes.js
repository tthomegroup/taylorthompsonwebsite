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

  function moveFooterToBodyEnd() {
    var footer = document.querySelector(".site-footer");
    if (footer && footer.parentElement !== document.body) {
      document.body.appendChild(footer);
    }
  }

  function setupHomeValueForms() {
    document.addEventListener("click", function (event) {
      var trigger = event.target.closest && event.target.closest("button, a, input[type='button'], input[type='submit']");
      if (!trigger) return;

      var label = (trigger.value || trigger.textContent || "").toLowerCase();
      if (label.indexOf("home value") === -1) return;

      var form = trigger.closest("form");
      if (!form || form.getAttribute("name") !== "home-value-city-form-v2") return;

      if (trigger.tagName.toLowerCase() === "a" || trigger.type === "button") {
        event.preventDefault();
        if (form.requestSubmit) form.requestSubmit();
        else form.submit();
      }
    });
  }

  function setupContactReminderPopup() {
    var path = cleanPath(window.location.pathname);
    if (
      path === "/contact" ||
      path === "/thank-you" ||
      path.indexOf("/admin") === 0
    ) {
      return;
    }

    var delayMs = 5 * 60 * 1000;
    var dismissedKey = "tthgContactReminderDismissed";
    var startedKey = "tthgContactReminderStartedAt";

    try {
      if (window.sessionStorage.getItem(dismissedKey) === "true") return;
    } catch (error) {}

    var now = Date.now();
    var startedAt = now;

    try {
      startedAt = parseInt(window.sessionStorage.getItem(startedKey), 10);
      if (!startedAt || startedAt > now) {
        startedAt = now;
        window.sessionStorage.setItem(startedKey, String(startedAt));
      }
    } catch (error) {
      startedAt = now;
    }

    window.setTimeout(showContactReminder, Math.max(0, delayMs - (now - startedAt)));

    function showContactReminder() {
      try {
        if (window.sessionStorage.getItem(dismissedKey) === "true") return;
      } catch (error) {}

      if (document.getElementById("contact-reminder-popup")) return;

      var overlay = document.createElement("div");
      overlay.className = "contact-reminder";
      overlay.id = "contact-reminder-popup";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "contact-reminder-title");
      overlay.innerHTML =
        '<div class="contact-reminder__backdrop" data-contact-reminder-close></div>' +
        '<div class="contact-reminder__panel">' +
        '  <button class="contact-reminder__close" type="button" aria-label="Close contact reminder" data-contact-reminder-close>&times;</button>' +
        '  <p class="contact-reminder__eyebrow">Send Us a Message</p>' +
        '  <h2 class="contact-reminder__title" id="contact-reminder-title">We&rsquo;ll Respond<br><em>Within 24 Hours</em></h2>' +
        '  <p class="contact-reminder__body">Still browsing? We are happy to answer questions, talk through timing, or point you in the right direction.</p>' +
        '  <form class="contact-reminder__form" name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/thank-you.html">' +
        '    <input type="hidden" name="form-name" value="contact">' +
        '    <input type="hidden" name="subject" value="New Website Contact Reminder Submission">' +
        '    <p class="contact-reminder__bot-field"><label>Do not fill this out: <input name="bot-field"></label></p>' +
        '    <div class="contact-reminder__row">' +
        '      <label class="contact-reminder__group"><span>First Name</span><input type="text" name="firstName" placeholder="Jane"></label>' +
        '      <label class="contact-reminder__group"><span>Last Name</span><input type="text" name="lastName" placeholder="Smith"></label>' +
        '    </div>' +
        '    <div class="contact-reminder__row">' +
        '      <label class="contact-reminder__group"><span>Email</span><input type="email" name="email" placeholder="jane@email.com" required></label>' +
        '      <label class="contact-reminder__group"><span>Phone</span><input type="tel" name="phone" placeholder="(209) 000-0000"></label>' +
        '    </div>' +
        '    <label class="contact-reminder__group"><span>How Can We Help?</span><select name="interest">' +
        '      <option>I want to sell my home</option>' +
        '      <option>I want to buy a home</option>' +
        '      <option>I want a free home valuation</option>' +
        '      <option>I&rsquo;m interested in real estate investing</option>' +
        '      <option>I have a general question</option>' +
        '      <option>I&rsquo;d like to refer someone</option>' +
        '    </select></label>' +
        '    <label class="contact-reminder__group"><span>Message</span><textarea name="message" placeholder="Tell us about your situation, your goals, or just say hello - we&rsquo;d love to hear from you."></textarea></label>' +
        '    <button class="contact-reminder__submit" type="submit">Send Message</button>' +
        '  </form>' +
        '</div>';

      document.body.appendChild(overlay);
      window.setTimeout(function () {
        overlay.classList.add("is-visible");
      }, 20);

      overlay.addEventListener("click", function (event) {
        if (event.target.closest("[data-contact-reminder-close]")) {
          closeContactReminder();
        }
      });

      document.addEventListener("keydown", closeOnEscape);

      function closeOnEscape(event) {
        if (event.key === "Escape") closeContactReminder();
      }

      function closeContactReminder() {
        try {
          window.sessionStorage.setItem(dismissedKey, "true");
        } catch (error) {}
        document.removeEventListener("keydown", closeOnEscape);
        overlay.classList.remove("is-visible");
        window.setTimeout(function () {
          overlay.remove();
        }, 220);
      }
    }
  }

  function initIncludes() {
    var includes = Array.prototype.slice.call(document.querySelectorAll("[data-include]"));

    Promise.all(includes.map(loadInclude)).then(function () {
      setActiveNav();
      setupMobileNav();
      setYear();
      moveFooterToBodyEnd();
      setupHomeValueForms();
      setupContactReminderPopup();
      document.dispatchEvent(new CustomEvent("site:includes-loaded"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initIncludes);
  } else {
    initIncludes();
  }
})();

