/* ============================================================
    INSIDE MANUFACTURING — main.js
    Classic script (works over http:// and file://), organised
    as small isolated modules around one central configuration.
    ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* =========================================================
     CENTRAL CONFIGURATION
     One place to update the phone / WhatsApp numbers and
     messages. All WhatsApp links use the WhatsApp number.
     ========================================================= */
  var WA = {
    number: "256751748046",
    display: "+256 751 748046",
    phoneDisplay: "+256 708 094751",
    brand: "INSIDE MANUFACTURING",
    messages: {
      general:
        "Hello INSIDE MANUFACTURING, I would like to discuss a factory setup, machinery sourcing, or international procurement project. Please let me know the next steps.",
      project:
        "Hello INSIDE MANUFACTURING, I saw your website and would like to discuss a manufacturing project — factory setup, machinery, or procurement requirements.",
      factory:
        "Hello INSIDE MANUFACTURING, I am planning to start a factory and would like to discuss factory setup requirements, equipment, and sourcing options.",
      sourcing:
        "Hello INSIDE MANUFACTURING, I would like to discuss international sourcing opportunities for machinery and industrial equipment (China, India, Pakistan, Dubai).",
      service: function (name) {
        return (
          "Hello INSIDE MANUFACTURING, I am interested in your " +
          name +
          " service and would like to discuss my project requirements."
        );
      }
    },
    url: function (message) {
      return "https://wa.me/" + WA.number + "?text=" + encodeURIComponent(message);
    }
  };

  /* ---------------------------------------------------------
     Image fallback — a broken file never breaks the layout
     --------------------------------------------------------- */
  var FALLBACK_IMG =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">' +
        '<rect width="600" height="400" fill="#10243A"/>' +
        '<text x="300" y="210" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="6" fill="#F28C28" text-anchor="middle">INSIDE</text>' +
        '<text x="300" y="245" font-family="Arial,sans-serif" font-size="14" letter-spacing="8" fill="#FFFFFF" text-anchor="middle">MANUFACTURING</text>' +
        "</svg>"
    );

  document.addEventListener(
    "error",
    function (event) {
      var el = event.target;
      if (el && el.tagName === "IMG" && el.src !== FALLBACK_IMG) {
        el.src = FALLBACK_IMG;
        el.classList.add("img-failed");
      }
    },
    true
  );

  /* ---------------------------------------------------------
     Theme toggle (light / dark)
     --------------------------------------------------------- */
  (function themeModule() {
    var root = document.documentElement;
    var toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    function syncLabel() {
      var isDark = root.getAttribute("data-theme") === "dark";
      toggle.setAttribute("aria-pressed", String(isDark));
      toggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
    }

    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("im-theme", next);
      } catch (e) { /* private mode */ }
      syncLabel();
    });

    syncLabel();
  })();

  /* ---------------------------------------------------------
     Sticky header — solid once the page is scrolled
     --------------------------------------------------------- */
  (function headerModule() {
    var header = document.getElementById("siteHeader");
    if (!header) return;

    var ticking = false;

    function update() {
      header.classList.toggle("is-solid", window.scrollY > 40);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );

    update();
  })();

  /* ---------------------------------------------------------
     Mobile menu
     --------------------------------------------------------- */
  (function menuModule() {
    var toggle = document.getElementById("menuToggle");
    var nav = document.getElementById("primaryNav");
    var header = document.getElementById("siteHeader");
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
      if (header) header.classList.toggle("is-open", open);
      document.body.classList.toggle("is-locked", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (
        toggle.getAttribute("aria-expanded") === "true" &&
        !nav.contains(event.target) &&
        !toggle.contains(event.target)
      ) {
        setOpen(false);
      }
    });

    window.matchMedia("(min-width: 961px)").addEventListener("change", function (event) {
      if (event.matches) setOpen(false);
    });
  })();

  /* ---------------------------------------------------------
     Hero slider — crossfade carousel
     --------------------------------------------------------- */
  (function heroModule() {
    var wrap = document.getElementById("heroSlides");
    var prevBtn = document.getElementById("heroPrev");
    var nextBtn = document.getElementById("heroNext");
    var dotsWrap = document.getElementById("heroDots");
    var status = document.getElementById("heroStatus");
    var hero = document.querySelector(".hero");
    var controls = document.querySelector(".hero__controls");
    if (!wrap || !prevBtn || !nextBtn || !dotsWrap || !hero) return;

    var slides = Array.prototype.slice.call(wrap.querySelectorAll(".hero__slide"));
    if (!slides.length) return;

    var index = slides.findIndex(function (slide) {
      return slide.classList.contains("is-active");
    });
    if (index < 0) index = 0;

    var timer = null;
    var hoverPaused = false;
    var focusPaused = false;
    var INTERVAL = 6000;

    var dots = slides.map(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hero__dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", "Go to slide " + (i + 1) + " of " + slides.length);
      dot.addEventListener("click", function () {
        goTo(i, true);
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function render(announce) {
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === index);
      });
      dots.forEach(function (dot, i) {
        dot.setAttribute("aria-selected", String(i === index));
        dot.tabIndex = i === index ? 0 : -1;
      });
      if (announce && status) {
        status.textContent = "Slide " + (index + 1) + " of " + slides.length;
      }
    }

    function goTo(i, announce) {
      index = (i + slides.length) % slides.length;
      render(announce);
      restart();
    }

    function next(announce) {
      goTo(index + 1, announce);
    }

    function prev(announce) {
      goTo(index - 1, announce);
    }

    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function shouldPlay() {
      return !reduceMotion.matches && !hoverPaused && !focusPaused && slides.length > 1;
    }

    function start() {
      stop();
      if (!shouldPlay()) return;
      timer = window.setInterval(function () {
        next(false);
      }, INTERVAL);
    }

    function restart() {
      stop();
      start();
    }

    prevBtn.addEventListener("click", function () {
      prev(true);
    });
    nextBtn.addEventListener("click", function () {
      next(true);
    });

    var hoverTarget = controls || hero;
    hoverTarget.addEventListener("mouseenter", function () {
      hoverPaused = true;
      stop();
    });
    hoverTarget.addEventListener("mouseleave", function () {
      hoverPaused = false;
      start();
    });
    hero.addEventListener("focusin", function () {
      focusPaused = true;
      stop();
    });
    hero.addEventListener("focusout", function (event) {
      if (!hero.contains(event.relatedTarget)) {
        focusPaused = false;
        start();
      }
    });

    hero.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        prev(true);
      } else if (event.key === "ArrowRight") {
        next(true);
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    if (typeof reduceMotion.addEventListener === "function") {
      reduceMotion.addEventListener("change", function () {
        reduceMotion.matches ? stop() : start();
      });
    }

    render(false);
    start();
  })();

  /* ---------------------------------------------------------
     WhatsApp links — every [data-wa] / [data-wa-service]
     --------------------------------------------------------- */
  (function whatsappModule() {
    var nodes = Array.prototype.slice.call(
      document.querySelectorAll("[data-wa], [data-wa-service]")
    );
    if (!nodes.length) return;

    nodes.forEach(function (el) {
      var service = el.getAttribute("data-wa-service");
      var message;

      if (service) {
        message = WA.messages.service(service);
      } else {
        var key = el.getAttribute("data-wa") || "general";
        message = WA.messages[key] || WA.messages.general;
      }

      el.setAttribute("href", WA.url(message));
      if (!el.getAttribute("target")) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
      }
    });
  })();

  /* ---------------------------------------------------------
     Enquiry form → composed WhatsApp message
     Nothing is stored on the site; the visitor sends the
     pre-filled message themselves in WhatsApp.
     --------------------------------------------------------- */
  (function bookingModule() {
    var form = document.getElementById("bookingForm");
    if (!form) return;

    var status = document.getElementById("bookingStatus");

    var fields = [
      { id: "bkName", errorId: "bkNameError", test: function (v) { return v.trim().length > 1; } },
      { id: "bkPhone", errorId: "bkPhoneError", test: function (v) { return v.trim().length >= 8; } },
      { id: "bkService", errorId: "bkServiceError", test: function (v) { return v !== ""; } },
      { id: "bkNotes", errorId: "bkNotesError", test: function (v) { return v.trim().length > 4; } }
    ];

    function setError(input, errorId, invalid) {
      if (!input) return;
      input.setAttribute("aria-invalid", String(invalid));
      var error = document.getElementById(errorId);
      if (error) error.hidden = !invalid;
    }

    var bkEmail = document.getElementById("bkEmail");
    if (bkEmail) {
      bkEmail.addEventListener("input", function () {
        var value = bkEmail.value.trim();
        if (!value) {
          setError(bkEmail, "bkEmailError", false);
          return;
        }
        setError(bkEmail, "bkEmailError", !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
      });
    }

    fields.forEach(function (field) {
      var input = document.getElementById(field.id);
      if (!input) return;
      input.addEventListener("input", function () {
        if (field.test(input.value)) setError(input, field.errorId, false);
      });
      input.addEventListener("change", function () {
        if (field.test(input.value)) setError(input, field.errorId, false);
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var firstInvalid = null;
      var data = {};

      fields.forEach(function (field) {
        var input = document.getElementById(field.id);
        if (!input) return;
        var value = input.value;
        data[field.id] = value;
        var valid = field.test(value);
        setError(input, field.errorId, !valid);
        if (!valid && !firstInvalid) firstInvalid = input;
      });

      if (bkEmail && bkEmail.value.trim()) {
        var emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bkEmail.value.trim());
        setError(bkEmail, "bkEmailError", !emailValid);
        if (!emailValid && !firstInvalid) firstInvalid = bkEmail;
      }

      if (firstInvalid) {
        if (status) status.textContent = "Please complete the required fields.";
        firstInvalid.focus();
        return;
      }

      var market = (document.getElementById("bkMarket") || {}).value || "";
      var budget = (document.getElementById("bkBudget") || {}).value || "";
      var message =
        "Hello " + WA.brand + ", I would like to discuss a project." +
        "\n\nName: " + data.bkName.trim() +
        "\nPhone: " + data.bkPhone.trim() +
        (bkEmail && bkEmail.value.trim() ? "\nEmail: " + bkEmail.value.trim() : "") +
        "\nService Required: " + data.bkService +
        (market ? "\nPreferred Sourcing Market: " + market : "") +
        (budget ? "\nEstimated Budget: " + budget.trim() : "") +
        "\nProject Description: " + data.bkNotes.trim() +
        "\n\n(Enquiry sent from the INSIDE MANUFACTURING website)";

      if (status) {
        status.textContent =
          "Opening WhatsApp with your enquiry — press send in WhatsApp to complete it.";
      }

      var win = window.open(WA.url(message), "_blank", "noopener");
      if (!win && status) {
        status.textContent =
          "Your browser blocked the pop-up. Please allow pop-ups, or call " +
          WA.phoneDisplay +
          " / message us on WhatsApp at " +
          WA.display +
          " directly.";
      }
    });
  })();

  /* ---------------------------------------------------------
     Gallery lightbox
     --------------------------------------------------------- */
  (function lightboxModule() {
    var triggers = Array.prototype.slice.call(
      document.querySelectorAll(".gallery__trigger")
    );
    var lightbox = document.getElementById("lightbox");
    var img = document.getElementById("lightboxImg");
    var caption = document.getElementById("lightboxCaption");
    var closeBtn = document.getElementById("lightboxClose");
    var prevBtn = document.getElementById("lightboxPrev");
    var nextBtn = document.getElementById("lightboxNext");
    if (!triggers.length || !lightbox || !img || !closeBtn) return;

    var items = triggers.map(function (trigger) {
      return {
        src: trigger.getAttribute("data-full") || "",
        alt: trigger.getAttribute("data-alt") || ""
      };
    });

    var current = 0;
    var lastFocused = null;
    var closeTimer = null;

    function render() {
      var item = items[current];
      if (!item) return;
      img.src = item.src;
      img.alt = item.alt;
      if (caption) caption.textContent = item.alt;
    }

    function open(i, opener) {
      current = (i + items.length) % items.length;
      lastFocused = opener || document.activeElement;
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
      render();
      lightbox.hidden = false;
      document.body.classList.add("is-locked");
      window.requestAnimationFrame(function () {
        lightbox.classList.add("is-open");
      });
      closeBtn.focus();
    }

    function close() {
      lightbox.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      var finish = function () {
        lightbox.hidden = true;
        img.removeAttribute("src");
      };
      if (reduceMotion.matches) finish();
      else closeTimer = window.setTimeout(finish, 340);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    function step(delta) {
      current = (current + delta + items.length) % items.length;
      render();
    }

    triggers.forEach(function (trigger, i) {
      trigger.addEventListener("click", function () {
        open(i, trigger);
      });
    });

    closeBtn.addEventListener("click", close);

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        step(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        step(1);
      });
    }

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) close();
    });

    document.addEventListener("keydown", function (event) {
      if (lightbox.hidden) return;
      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowLeft") {
        step(-1);
      } else if (event.key === "ArrowRight") {
        step(1);
      } else if (event.key === "Tab") {
        var focusables = [closeBtn, prevBtn, nextBtn].filter(Boolean);
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (focusables.indexOf(document.activeElement) === -1) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  })();

  /* ---------------------------------------------------------
     Scroll reveals
     --------------------------------------------------------- */
  (function revealModule() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (!items.length) return;

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    var groups = new Map();
    items.forEach(function (item) {
      var parent = item.parentElement;
      if (!groups.has(parent)) groups.set(parent, 0);
      var order = groups.get(parent);
      item.style.setProperty("--reveal-delay", Math.min(order * 0.08, 0.4) + "s");
      groups.set(parent, order + 1);
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  })();

  /* ---------------------------------------------------------
     Active nav link highlighting
     --------------------------------------------------------- */
  (function navHighlightModule() {
    if (!("IntersectionObserver" in window)) return;

    var links = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
    if (!links.length) return;

    var map = new Map();
    links.forEach(function (link) {
      var id = (link.getAttribute("href") || "").replace("#", "");
      var section = document.getElementById(id);
      if (section) map.set(section, link);
    });
    if (!map.size) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (link) {
            link.removeAttribute("aria-current");
          });
          var active = map.get(entry.target);
          if (active) active.setAttribute("aria-current", "true");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    map.forEach(function (_, section) {
      observer.observe(section);
    });
  })();

  /* ---------------------------------------------------------
     Floating chat assistant (scripted, WhatsApp hand-off)
     --------------------------------------------------------- */
  (function chatModule() {
    var stack = document.getElementById("fabStack");
    var panel = document.getElementById("chatPanel");
    var toggle = document.getElementById("chatToggle");
    var closeBtn = document.getElementById("chatClose");
    var log = document.getElementById("chatLog");
    var chipsWrap = document.getElementById("chatChips");
    var form = document.getElementById("chatForm");
    var input = document.getElementById("chatInput");
    if (!stack || !panel || !toggle || !log || !form || !input) return;

    var WA_LINK = {
      href: WA.url(WA.messages.general),
      label: "Discuss your project on WhatsApp"
    };

    var DEFAULT_CHIPS = [
      "What services do you offer?",
      "Factory setup",
      "Machinery sourcing",
      "Discuss a project"
    ];

    var KB = [
      {
        keys: ["hello", "hi ", "hey", "good morning", "good afternoon", "good evening"],
        text:
          "Welcome to INSIDE MANUFACTURING. We support investors with factory setup, industrial machinery sourcing, international procurement, and logistics coordination.",
        chips: ["What services do you offer?", "Discuss a project"]
      },
      {
        keys: ["service", "services", "offer", "what do you do", "solutions"],
        text:
          "Our services include factory setup consultation, industrial machinery sourcing, international procurement, China / India / Pakistan / Dubai sourcing, logistics coordination, and production planning.",
        link: { label: "View all services", href: "#services" },
        chips: ["Factory setup", "Discuss a project"]
      },
      {
        keys: ["factory", "setup", "start a factory", "production", "manufacture", "plant"],
        text:
          "Setting up a factory involves product choice, production capacity, machinery, facility planning, suppliers, and logistics. Share your manufacturing idea and we can discuss the requirements step by step.",
        link: { label: "Start a factory setup discussion", href: WA.url(WA.messages.factory) },
        chips: ["Machinery sourcing", "Discuss a project"]
      },
      {
        keys: ["machinery", "machine", "equipment", "equipment sourcing"],
        text:
          "We help identify suitable machinery and industrial equipment based on your production needs, technical specifications, and budget — including sourcing options in China, India, and Pakistan.",
        link: { label: "Source machinery on WhatsApp", href: WA.url(WA.messages.service("Industrial Machinery Sourcing")) },
        chips: ["Factory setup", "Discuss a project"]
      },
      {
        keys: ["china", "chinese"],
        text:
          "We help clients explore manufacturing machinery, industrial supplies, and potential supplier opportunities in China.",
        link: { label: "Explore China sourcing", href: WA.url(WA.messages.service("China Sourcing")) },
        chips: ["Machinery sourcing", "Discuss a project"]
      },
      {
        keys: ["india", "pakistan"],
        text:
          "We support sourcing inquiries for industrial equipment, machinery, and production inputs from India and Pakistan.",
        link: { label: "Discuss sourcing", href: WA.url(WA.messages.sourcing) },
        chips: ["China sourcing", "Discuss a project"]
      },
      {
        keys: ["dubai", "uae", "emirates"],
        text:
          "We assist businesses exploring procurement opportunities and supplier networks in Dubai and the wider UAE market.",
        link: { label: "Explore UAE procurement", href: WA.url(WA.messages.service("Dubai and UAE Procurement")) },
        chips: ["International procurement", "Discuss a project"]
      },
      {
        keys: ["procurement", "supplier", "quotation", "quote", "purchase"],
        text:
          "We support identifying suppliers, requesting quotations, comparing available options, and coordinating international procurement requirements.",
        link: { label: "Discuss procurement", href: WA.url(WA.messages.service("International Procurement")) },
        chips: ["Machinery sourcing", "Discuss a project"]
      },
      {
        keys: ["logistics", "shipping", "cargo", "delivery", "freight"],
        text:
          "We can discuss shipping arrangements, cargo movement, delivery requirements, and the logistics involved in international procurement.",
        link: { label: "Discuss logistics", href: WA.url(WA.messages.service("Logistics Coordination")) },
        chips: ["International procurement", "Discuss a project"]
      },
      {
        keys: ["price", "pricing", "cost", "budget", "how much"],
        text:
          "Project scope, timelines, supplier arrangements, and costs depend on each investor's requirements and must be discussed individually. Share your project details and we can talk it through.",
        link: WA_LINK,
        chips: ["What services do you offer?", "Discuss a project"]
      },
      {
        keys: ["contact", "whatsapp", "phone", "call", "number", "team", "uganda", "location"],
        text:
          "You can reach us by phone on " +
          WA.phoneDisplay +
          " or WhatsApp on " +
          WA.display +
          ". We are based in Uganda.",
        link: { label: "Contact us", href: "#contact" },
        chips: ["Discuss a project", "What services do you offer?"]
      }
    ];

    var FALLBACK = {
      text:
        "I can help with factory setup, machinery sourcing, international procurement, and logistics coordination. Share a few details about your project, or continue on WhatsApp.",
      link: { label: "Discuss your project", href: WA.url(WA.messages.project) },
      chips: ["What services do you offer?", "Discuss a project"]
    };

    var greeted = false;

    function addMsg(kind, text, link) {
      var bubble = document.createElement("div");
      bubble.className = "chat__msg chat__msg--" + kind;

      var p = document.createElement("p");
      p.textContent = text;
      bubble.appendChild(p);

      if (link) {
        var a = document.createElement("a");
        a.href = link.href;
        a.textContent = link.label;
        if (link.href.charAt(0) !== "#") {
          a.target = "_blank";
          a.rel = "noopener";
        }
        bubble.appendChild(a);
      }

      log.appendChild(bubble);
      log.scrollTop = log.scrollHeight;
    }

    function renderChips(list) {
      chipsWrap.innerHTML = "";
      (list || DEFAULT_CHIPS).forEach(function (label) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chat__chip";
        chip.textContent = label;
        chip.addEventListener("click", function () {
          answer(label);
        });
        chipsWrap.appendChild(chip);
      });
    }

    function match(inputText) {
      var q = inputText.toLowerCase();
      for (var i = 0; i < KB.length; i++) {
        for (var j = 0; j < KB[i].keys.length; j++) {
          if (q.indexOf(KB[i].keys[j]) !== -1) return KB[i];
        }
      }
      return FALLBACK;
    }

    function answer(text) {
      addMsg("user", text);
      var reply = match(text);
      window.setTimeout(function () {
        addMsg("bot", reply.text, reply.link);
        renderChips(reply.chips);
      }, reduceMotion.matches ? 0 : 320);
    }

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close chat assistant" : "Open chat assistant");
      panel.classList.toggle("is-open", open);
      if (open) {
        if (!greeted) {
          greeted = true;
          addMsg(
            "bot",
            "Welcome to INSIDE MANUFACTURING. Ask me about factory setup, machinery sourcing, international procurement, or logistics coordination."
          );
          renderChips();
        }
        window.setTimeout(function () {
          input.focus();
        }, 60);
      } else {
        toggle.focus();
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    closeBtn.addEventListener("click", function () {
      setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
      }
    });

    document.addEventListener("click", function (event) {
      if (
        toggle.getAttribute("aria-expanded") === "true" &&
        !stack.contains(event.target)
      ) {
        setOpen(false);
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      answer(text);
    });

    var waFab = stack.querySelector(".fab--wa");
    if (waFab) {
      waFab.addEventListener("click", function () {
        if (toggle.getAttribute("aria-expanded") === "true") setOpen(false);
      });
    }
  })();

  /* ---------------------------------------------------------
     Dynamic copyright year
     --------------------------------------------------------- */
  (function yearModule() {
    var el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  })();
})();
