import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:4173/";
const WIDTHS = [375, 430, 768, 1366, 1920];
const WA_NUMBER = "256751748046";
const TEL = "tel:+256708094751";

const results = [];
function log(ok, label, detail = "") {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 120000,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function click(page, selector) {
  await page.$eval(selector, (el) => el.click());
}

async function loadAllImages(page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  const vh = await page.evaluate(() => window.innerHeight);
  for (let y = 0; y < height; y += Math.max(300, Math.floor(vh * 0.8))) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await new Promise((r) => setTimeout(r, 150));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const pending = await page.evaluate(() =>
      Array.from(document.images)
        .filter((i) => i.getAttribute("src") && !i.complete)
        .map((i) => i.getAttribute("src"))
    );
    if (pending.length === 0) return;
    await new Promise((r) => setTimeout(r, 300));
  }
}

async function newPage(width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  return page;
}

/* ---------- desktop functional checks ---------- */
{
  const page = await newPage(1366, 900);
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
  page.on("requestfailed", (r) =>
    failedRequests.push(r.url() + " (" + (r.failure()?.errorText || "?") + ")")
  );
  await page.evaluateOnNewDocument(() => {
    window.__opened = [];
    window.open = (url) => {
      window.__opened.push(String(url));
      return null;
    };
  });

  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 60000 });

  // heading + structure
  const h1 = await page.$$eval("h1", (els) => els.map((e) => e.textContent.trim()));
  log(h1.length === 1 && /From Factory Idea to Industrial Reality/.test(h1[0]), "Single H1 with hero heading", h1.join(" | "));
  const title = await page.title();
  log(/INSIDE MANUFACTURING/.test(title), "Page title", title);

  const metaDesc = await page.$eval('meta[name="description"]', (e) => e.content);
  log(/factory setup/i.test(metaDesc) && /China, India, Pakistan, Dubai/.test(metaDesc), "Meta description updated", metaDesc.slice(0, 90) + "…");

  const og = await page.evaluate(() => ({
    title: document.querySelector('meta[property="og:title"]')?.content || "",
    image: document.querySelector('meta[property="og:image"]')?.content || "",
  }));
  log(/INSIDE MANUFACTURING/.test(og.title) && /assets\//.test(og.image), "Open Graph metadata present", og.title.slice(0, 60));

  // no old branding anywhere
  const oldBrand = await page.evaluate(() => {
    const text = document.body.innerText;
    const html = document.documentElement.innerHTML;
    return /SKYFRAME|skyframe|gypsum|Gypsum|TV unit|wall moulding|ceiling design|Beautiful Ceilings/i.test(text + " " + html);
  });
  log(!oldBrand, "No SKYFRAME / ceiling / interior remnants in page");

  // fonts
  const fontsOk = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      inter: document.fonts.check("16px 'Inter'"),
      h1Family: getComputedStyle(document.querySelector("h1")).fontFamily,
      bodyFamily: getComputedStyle(document.body).fontFamily,
    };
  });
  log(fontsOk.inter, "Self-hosted Inter loaded", fontsOk.h1Family + " / " + fontsOk.bodyFamily);

  // images (scroll to trigger lazy loading first)
  await loadAllImages(page);
  const imgs = await page.$$eval("img", (els) =>
    els.map((e) => ({
      src: e.getAttribute("src"),
      ok: e.naturalWidth > 0,
      alt: e.alt,
      id: e.id,
    }))
  );
  const badImgs = imgs.filter((i) => i.src && !i.ok);
  log(badImgs.length === 0, `All ${imgs.filter((i) => i.src).length} <img> elements loaded`, badImgs.map((i) => i.src).join(", "));
  const missingAlt = imgs.filter((i) => i.src && i.id !== "lightboxImg" && (!i.alt || !i.alt.trim()));
  log(missingAlt.length === 0, "Every content image has alt text", missingAlt.map((i) => i.src).join(", "));

  // hero backgrounds
  const heroBg = await page.$$eval(".hero__slide", (els) =>
    els.map((e) => getComputedStyle(e).backgroundImage)
  );
  const missingBg = heroBg.filter((b) => !/url\(/.test(b));
  log(heroBg.length === 4 && missingBg.length === 0, "4 hero slides with background images");

  // slider auto-advance
  const firstActive = await page.$$eval(".hero__slide", (els) => els.findIndex((e) => e.classList.contains("is-active")));
  await new Promise((r) => setTimeout(r, 7000));
  const secondActive = await page.$$eval(".hero__slide", (els) => els.findIndex((e) => e.classList.contains("is-active")));
  const dots = await page.$$eval(".hero__dot", (els) => els.length);
  log(firstActive !== secondActive && dots === 4, "Hero auto-rotates with accessible dots", `${firstActive} -> ${secondActive}, dots=${dots}`);

  // hero manual control
  await click(page, "#heroPrev");
  await new Promise((r) => setTimeout(r, 300));
  const afterPrev = await page.$$eval(".hero__slide", (els) => els.findIndex((e) => e.classList.contains("is-active")));
  log(afterPrev !== secondActive, "Prev arrow changes slide", `${secondActive} -> ${afterPrev}`);

  // navigation
  const navLinks = await page.$$eval(".nav__link", (els) => els.map((e) => e.textContent.trim()));
  const expectedNav = ["Home", "About Us", "Services", "Factory Setup", "Global Sourcing", "Projects", "Contact"];
  log(
    JSON.stringify(navLinks) === JSON.stringify(expectedNav),
    "Navigation matches specification",
    navLinks.join(" | ")
  );

  // WhatsApp links
  const waLinks = await page.$$eval("[data-wa], [data-wa-service]", (els) =>
    els.map((e) => ({
      href: e.getAttribute("href"),
      service: e.getAttribute("data-wa-service"),
      key: e.getAttribute("data-wa"),
      text: e.textContent.trim().replace(/\s+/g, " ").slice(0, 40),
    }))
  );
  const badWa = waLinks.filter(
    (l) => !l.href || !l.href.startsWith(`https://wa.me/${WA_NUMBER}?text=`)
  );
  log(badWa.length === 0, `All ${waLinks.length} WhatsApp links use ${WA_NUMBER} + encoded text`, badWa.map((b) => b.href).join(" | "));
  const decoded = await page.evaluate(() => {
    const el = document.querySelector("[data-wa='project']");
    return decodeURIComponent(el.getAttribute("href").split("text=")[1]);
  });
  log(/^Hello INSIDE MANUFACTURING/.test(decoded), "Project message decoded", decoded.slice(0, 80) + "…");
  const svcDecoded = await page.evaluate(() => {
    const el = document.querySelector("[data-wa-service]");
    return {
      href: el.getAttribute("href"),
      text: decodeURIComponent(el.getAttribute("href").split("text=")[1]),
    };
  });
  log(/interested in your Factory Setup Consultation service/.test(svcDecoded.text), "Service message encodes service name", svcDecoded.text.slice(0, 90) + "…");

  // header CTA
  const heroCta = await page.$eval(".hero__cta .btn--primary", (e) => ({
    href: e.getAttribute("href"),
    target: e.getAttribute("target"),
    rel: e.getAttribute("rel"),
    text: e.textContent.trim(),
  }));
  log(
    heroCta.href.startsWith(`https://wa.me/${WA_NUMBER}?text=`) &&
      heroCta.target === "_blank" &&
      /noopener/.test(heroCta.rel || "") &&
      /Discuss Your Factory Project/.test(heroCta.text),
    "Hero primary CTA links to WhatsApp",
    heroCta.text + " → " + heroCta.href.slice(0, 60)
  );

  const secondaryCta = await page.$eval(".hero__cta .btn--outline", (e) => e.getAttribute("href"));
  log(secondaryCta === "#services", "Hero secondary CTA scrolls to services", secondaryCta);

  // floating WhatsApp
  const fabHref = await page.$eval(".fab--wa", (e) => e.getAttribute("href"));
  log(fabHref.startsWith(`https://wa.me/${WA_NUMBER}?text=`), "Floating WhatsApp button wired", fabHref.slice(0, 60));

  // nav anchors resolve
  const brokenAnchors = await page.$$eval('a[href^="#"]', (els) =>
    els
      .map((e) => e.getAttribute("href"))
      .filter((h) => h.length > 1 && !document.querySelector(h))
  );
  log(brokenAnchors.length === 0, "All in-page links resolve", brokenAnchors.join(", "));

  // tel link
  const tel = await page.$eval('a[href^="tel:"]', (e) => e.getAttribute("href"));
  log(tel === TEL, "Phone uses tel: link", tel);

  // no invented contact details
  const invented = await page.evaluate(() =>
    /hello@|info@|sales@|\.com\b.*mailto|Mon - Fri|Opening hours/i.test(document.body.innerText)
  );
  log(!invented, "No invented email / business hours");

  // lightbox
  await click(page, ".gallery__trigger");
  await new Promise((r) => setTimeout(r, 450));
  const lbOpen = await page.evaluate(() => {
    const lb = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    return {
      open: !lb.hidden && lb.classList.contains("is-open") && img.src.includes("assets/"),
      alt: img.alt,
    };
  });
  log(lbOpen.open, "Lightbox opens with image");
  log(lbOpen.alt && lbOpen.alt.length > 0, "Lightbox sets alt text on open", lbOpen.alt);
  await page.keyboard.press("ArrowRight");
  await new Promise((r) => setTimeout(r, 200));
  const lbNext = await page.$eval("#lightboxImg", (e) => e.getAttribute("src"));
  log(!!lbNext, "Lightbox next image", lbNext);
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 500));
  const lbClosed = await page.$eval("#lightbox", (e) => e.hidden);
  log(lbClosed, "Escape closes lightbox");

  // enquiry form → WhatsApp
  await page.type("#bkName", "Test Visitor & Co");
  await page.type("#bkPhone", "0700000000");
  await page.type("#bkEmail", "test@example.com");
  await page.select("#bkService", "Factory Setup");
  await page.select("#bkMarket", "China");
  await page.type("#bkBudget", "USD 50,000 - 100,000");
  await page.type("#bkNotes", "Planning a packaging factory. <script> special & chars.");
  await click(page, "#bookingForm button[type='submit']");
  await new Promise((r) => setTimeout(r, 300));
  const formOpened = await page.evaluate(() => window.__opened[window.__opened.length - 1]);
  const formDecoded = decodeURIComponent(String(formOpened).split("text=")[1] || "");
  log(
    String(formOpened).startsWith(`https://wa.me/${WA_NUMBER}?text=`) &&
      /Factory Setup/.test(formDecoded) &&
      /Test Visitor & Co/.test(formDecoded) &&
      /Preferred Sourcing Market: China/.test(formDecoded) &&
      /Estimated Budget: USD 50,000 - 100,000/.test(formDecoded) &&
      /special & chars/.test(formDecoded) &&
      /Email: test@example\.com/.test(formDecoded),
    "Enquiry form composes full WhatsApp message",
    formDecoded.split("\n").slice(0, 6).join(" / ")
  );

  // form validation
  await page.reload({ waitUntil: "networkidle0" });
  await click(page, "#bookingForm button[type='submit']");
  await new Promise((r) => setTimeout(r, 200));
  const validation = await page.evaluate(() => ({
    invalid: document.getElementById("bkName").getAttribute("aria-invalid"),
    msg: document.getElementById("bookingStatus").textContent,
  }));
  log(validation.invalid === "true" && /required/i.test(validation.msg), "Form validation blocks empty submit", validation.msg);

  // optional fields alone still valid when required present
  await page.type("#bkName", "Only Required");
  await page.type("#bkPhone", "0700000001");
  await page.select("#bkService", "Other");
  await page.type("#bkNotes", "Short description of requirements.");
  await click(page, "#bookingForm button[type='submit']");
  await new Promise((r) => setTimeout(r, 300));
  const optMsg = await page.evaluate(() => window.__opened[window.__opened.length - 1] || "");
  const optDecoded = decodeURIComponent(String(optMsg).split("text=")[1] || "");
  log(
    String(optMsg).startsWith(`https://wa.me/${WA_NUMBER}`) && !/Preferred Sourcing Market/.test(optDecoded),
    "Form works without optional fields",
    optDecoded.split("\n").slice(0, 4).join(" / ")
  );

  // chat assistant
  await click(page, "#chatToggle");
  await new Promise((r) => setTimeout(r, 400));
  const chat = await page.evaluate(() => ({
    open: document.getElementById("chatPanel").classList.contains("is-open"),
    text: document.getElementById("chatLog").innerText,
  }));
  log(chat.open && /INSIDE MANUFACTURING/.test(chat.text), "Chat assistant opens, rebranded", chat.text.slice(0, 70));
  log(!/SKYFRAME|gypsum|ceiling/i.test(chat.text), "Chat content has no old branding");

  await page.evaluate(() => {
    const chip = Array.from(document.querySelectorAll(".chat__chip")).find((c) =>
      /Discuss a project/i.test(c.textContent)
    );
    chip && chip.click();
  });
  await new Promise((r) => setTimeout(r, 700));
  const chatLinks = await page.$$eval("#chatLog a", (els) =>
    els.map((e) => ({ href: e.getAttribute("href"), text: e.textContent }))
  );
  const waReply = chatLinks.find((l) => l.href && l.href.startsWith("https://wa.me/"));
  log(
    !!waReply && waReply.href.startsWith(`https://wa.me/${WA_NUMBER}?text=`),
    "Chat hand-off link goes to WhatsApp",
    waReply ? waReply.text + " → " + waReply.href.slice(0, 60) : JSON.stringify(chatLinks)
  );
  await click(page, "#chatClose");

  // no console errors
  log(consoleErrors.length === 0, "No console/page errors", consoleErrors.join(" | "));
  log(failedRequests.length === 0, "No failed requests", failedRequests.join(" | "));

  await page.close();
}

/* ---------- slider pause on reduced motion ---------- */
{
  const page = await newPage(1366, 900);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const a = await page.$$eval(".hero__slide", (els) => els.findIndex((e) => e.classList.contains("is-active")));
  await new Promise((r) => setTimeout(r, 7000));
  const b = await page.$$eval(".hero__slide", (els) => els.findIndex((e) => e.classList.contains("is-active")));
  const revealVisible = await page.$$eval(".reveal", (els) => els.every((e) => e.classList.contains("is-visible")));
  log(a === b, "Reduced motion stops autoplay", `${a} -> ${b}`);
  log(revealVisible, "Reduced motion shows content without animation");
  await page.close();
}

/* ---------- responsive checks ---------- */
for (const width of WIDTHS) {
  const page = await newPage(width, 900);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));

  const metrics = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    overflowing: Array.from(document.querySelectorAll("body *"))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > document.documentElement.clientWidth + 2 || r.left < -2);
      })
      .slice(0, 5)
      .map((el) => el.tagName + "." + (el.className && el.className.split ? el.className.split(" ")[0] : "")),
  }));
  log(
    metrics.scrollW <= metrics.clientW + 1,
    `${width}px — no horizontal scrolling`,
    `scrollW=${metrics.scrollW} clientW=${metrics.clientW}${metrics.overflowing.length ? " overflow:" + metrics.overflowing.join(",") : ""}`
  );

  // mobile menu
  if (width <= 960) {
    await click(page, "#menuToggle");
    await new Promise((r) => setTimeout(r, 450));
    const menu = await page.evaluate(() => ({
      open: document.getElementById("primaryNav").classList.contains("is-open"),
      expanded: document.getElementById("menuToggle").getAttribute("aria-expanded"),
      cta: !!document.querySelector(".nav__actions--mobile a[href*='wa.me']"),
      ctaText: document.querySelector(".nav__actions--mobile a")?.textContent.trim() || "",
    }));
    log(
      menu.open && menu.expanded === "true" && menu.cta && /Discuss Your Factory Project/.test(menu.ctaText),
      `${width}px — mobile menu opens with WhatsApp CTA`,
      menu.ctaText
    );
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 350));
    const closed = await page.$eval("#primaryNav", (e) => !e.classList.contains("is-open"));
    log(closed, `${width}px — Escape closes mobile menu`);
  }

  // tap target sizes for primary CTAs
  const cta = await page.evaluate(() => {
    const el = document.querySelector(".hero__cta .btn--primary");
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  log(cta.h >= 44, `${width}px — hero CTA tap height`, `${cta.w}x${cta.h}`);

  log(errors.length === 0, `${width}px — no JS errors`, errors.join(" | "));
  await page.close();
}

/* ---------- dark theme sanity ---------- */
{
  const page = await newPage(1366, 900);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await click(page, "#themeToggle");
  await new Promise((r) => setTimeout(r, 500));
  const theme = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute("data-theme"),
    bg: getComputedStyle(document.body).backgroundColor,
    ink: getComputedStyle(document.body).color,
    stored: localStorage.getItem("im-theme"),
  }));
  log(theme.attr === "dark" && theme.bg !== "rgb(243, 245, 247)", "Theme toggle switches to dark palette", `${theme.bg} / ${theme.ink} / stored=${theme.stored}`);
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n==== ${results.length - failed.length}/${results.length} checks passed ====`);
if (failed.length) {
  console.log("Failures:");
  failed.forEach((f) => console.log(" - " + f.label + (f.detail ? " — " + f.detail : "")));
  process.exit(1);
}
