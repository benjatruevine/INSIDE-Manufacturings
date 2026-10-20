/* ============================================================
   KIBOOYA SCRAP YARD — main.js
   Classic script (works over http:// and file://), organised
   as small isolated modules.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------------------------------------------------
     Image fallback — a broken file never breaks the layout
     --------------------------------------------------------- */
  var FALLBACK_IMG =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 480">' +
        '<rect width="600" height="480" fill="#e7ecef"/>' +
        '<text x="300" y="250" font-family="Arial,sans-serif" font-size="34" font-weight="700" letter-spacing="10" fill="#68727d" text-anchor="middle">KIBOOYA</text>' +
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
      var next =
        root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("kibbooya-theme", next);
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
      header.classList.toggle("is-open", open);
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

    window.matchMedia("(min-width: 921px)").addEventListener("change", function (event) {
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

    // Build accessible dots
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

    // Hovering the control strip pauses autoplay; the rest of the hero
    // stays live so the carousel keeps breathing while the copy is read.
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
     Scrap materials enquiry form → composed WhatsApp message
     --------------------------------------------------------- */
  (function enquiryModule() {
    var form = document.getElementById("enquiryForm");
    if (!form) return;

    var status = document.getElementById("enquiryStatus");
    var WA_NUMBER = "256706354801";

    var fields = [
      { id: "enName", errorId: "enNameError", test: function (v) { return v.trim().length > 1; } },
      { id: "enPhone", errorId: "enPhoneError", test: function (v) { return /^[+()\d][\d\s()+-]{5,19}$/.test(v.trim()); } },
      { id: "enType", errorId: "enTypeError", test: function (v) { return v !== ""; } },
      { id: "enMaterial", errorId: "enMaterialError", test: function (v) { return v !== ""; } },
      { id: "enMessage", errorId: "enMessageError", test: function (v) { return v.trim().length > 2; } }
    ];

    fields.forEach(function (field) {
      var input = document.getElementById(field.id);
      if (!input) return;
      input.addEventListener("input", function () {
        if (field.test(input.value)) {
          input.removeAttribute("aria-invalid");
          var error = document.getElementById(field.errorId);
          if (error) error.hidden = true;
        }
      });
      input.addEventListener("change", function () {
        if (field.test(input.value)) {
          input.removeAttribute("aria-invalid");
          var error = document.getElementById(field.errorId);
          if (error) error.hidden = true;
        }
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
        input.setAttribute("aria-invalid", String(!valid));
        var error = document.getElementById(field.errorId);
        if (error) error.hidden = valid;
        if (!valid && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        if (status) status.textContent = "Please complete the highlighted fields.";
        firstInvalid.focus();
        return;
      }

      var quantity = (document.getElementById("enQuantity") || {}).value || "";
      var condition = (document.getElementById("enCondition") || {}).value || "";

      var message =
        "Hello KIBOOYA SCRAP YARD," +
        "\n\nName: " + data.enName.trim() +
        "\nPhone: " + data.enPhone.trim() +
        "\nEnquiry: " + data.enType +
        "\nMaterial: " + data.enMaterial +
        (quantity.trim() ? "\nEstimated Quantity: " + quantity.trim() : "") +
        (condition.trim() ? "\nCondition: " + condition.trim() : "") +
        "\n\nMessage: " + data.enMessage.trim() +
        "\n\nPlease let me know the available options and pricing. Thank you.";

      if (status) {
        status.textContent = "Opening WhatsApp with your enquiry…";
      }

      window.open(
        "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(message),
        "_blank",
        "noopener"
      );
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

    // Gentle stagger for siblings inside the same grid
    var groups = new Map();
    items.forEach(function (item) {
      var parent = item.parentElement;
      if (!groups.has(parent)) groups.set(parent, 0);
      var order = groups.get(parent);
      item.style.setProperty("--reveal-delay", order * 0.09 + "s");
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

    var WA =
      "https://wa.me/256706354801?text=" +
      encodeURIComponent(
        "Hello KIBOOYA SCRAP YARD, I would like to enquire about your scrap materials and services. Please share more information."
      );

    var MAPS =
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent("Sonde-Sseta-Namungongo Road, Uganda");

    var DEFAULT_CHIPS = [
      "Where are you?",
      "What materials?",
      "I want to sell scrap",
      "Prices",
      "Talk to a person"
    ];

    var KB = [
      {
        keys: ["hello", "hi ", "hey", "good morning", "good afternoon", "good evening", "salut", "hola"],
        text: "Hello and welcome to KIBOOYA SCRAP YARD. I can help with our location, the materials we deal in, and how to reach the team.",
        chips: ["Where are you?", "What materials?", "I want to sell scrap"]
      },
      {
        keys: ["where", "address", "location", "located", "find you", "yard", "direction", "map", "situated", "road"],
        text: "You'll find us along Sonde–Sseta–Namungongo Road in Uganda.",
        link: { label: "Open in Maps", href: MAPS },
        chips: ["What materials?", "Talk to a person"]
      },
      {
        keys: ["material", "materials", "metal", "metals", "iron", "roofing", "sheet", "sheets", "plastic", "plastics", "polythene", "paper", "waste"],
        text: "We deal in scrap metals, used iron sheets, plastics, polythene, waste paper, and other scrap materials. Enquire on WhatsApp and the team will share the current requirements.",
        link: { label: "Enquire on WhatsApp", href: WA },
        chips: ["I want to sell scrap", "Prices", "Where are you?"]
      },
      {
        keys: ["sell", "selling", "sell scrap", "i have", "i'm selling", "dispose"],
        text: "To sell scrap, call or WhatsApp the team on 0706354801 with the material type and estimated quantity. They will discuss requirements, pricing and next steps with you.",
        link: { label: "Sell on WhatsApp", href: WA },
        chips: ["Prices", "What materials?", "Where are you?"]
      },
      {
        keys: ["buy", "buying", "purchase", "need", "looking for", "supply"],
        text: "To buy materials, message the team on WhatsApp describing the material and quantity you need — they will confirm what is currently available.",
        link: { label: "Ask on WhatsApp", href: WA },
        chips: ["What materials?", "Talk to a person"]
      },
      {
        keys: ["price", "pricing", "rate", "rates", "cost", "how much", "pay", "payment"],
        text: "Pricing is discussed directly with the team based on material type, condition and quantity. Message them on WhatsApp for the current options.",
        link: { label: "Ask about pricing", href: WA },
        chips: ["I want to sell scrap", "What materials?"]
      },
      {
        keys: ["quantity", "how many", "kg", "tonne", "ton", "bag", "weight"],
        text: "Share your estimated quantity along with the material type when you call or message — the team can then discuss the available options with you.",
        link: { label: "Share on WhatsApp", href: WA },
        chips: ["Prices", "I want to sell scrap"]
      },
      {
        keys: ["hour", "open", "closing", "time", "when can", "days"],
        text: "Message the team on WhatsApp for the yard's current visiting and trading times.",
        link: { label: "Ask on WhatsApp", href: WA },
        chips: ["Where are you?", "Talk to a person"]
      },
      {
        keys: ["collection", "collect", "transport", "delivery", "deliver", "pickup", "carry"],
        text: "Delivery or collection arrangements, if available, are confirmed directly with the team — message or call them to discuss your situation.",
        link: { label: "Ask the team", href: WA },
        chips: ["Talk to a person", "Where are you?"]
      },
      {
        keys: ["contact", "phone", "call", "number", "whatsapp", "talk", "speak", "person", "human", "staff", "team", "help"],
        text: "You can call or WhatsApp the scrap yard on 0706354801 or 0787878831 — the team will be glad to help.",
        link: { label: "Chat on WhatsApp", href: WA },
        chips: ["Where are you?", "What materials?"]
      }
    ];

    var FALLBACK = {
      text: "I can help with our location, the materials we deal in, and contact details. For anything else, the team is one message away on WhatsApp.",
      link: { label: "Chat on WhatsApp", href: WA },
      chips: ["Where are you?", "What materials?", "Prices"]
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
      }, reduceMotion.matches ? 0 : 350);
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
            "Welcome to KIBOOYA SCRAP YARD. Ask me about our location, the materials we deal in, or how to reach the team."
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

    // WhatsApp FAB closes the panel so both channels never overlap
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
