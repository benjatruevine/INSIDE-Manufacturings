import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:4173/";
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 120000,
  args: ["--no-sandbox"],
});

const results = [];
const log = (ok, label, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
};

async function audit(page, theme) {
  const out = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const bgOf = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const cs = getComputedStyle(n);
        // transparent header sits over the dark hero photo (image, not element bg)
        if (n.classList && n.classList.contains("site-header")) {
          if (!n.classList.contains("is-solid")) return [11, 26, 43];
          const hb = parse(cs.backgroundColor);
          if (hb.length === 3) return hb;
        }
        const c = cs.backgroundColor;
        const p = parse(c);
        if (p.length === 3 && !/rgba\(.*, 0\)/.test(c) && c !== "transparent") {
          const alpha = (c.match(/[\d.]+/g) || [])[3];
          if (alpha === undefined || Number(alpha) > 0.5) return p;
        }
        n = n.parentElement;
      }
      return parse(getComputedStyle(document.body).backgroundColor);
    };
    const ratio = (a, b) => {
      const l1 = lum(a), l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    const low = [];
    document.querySelectorAll("p, a, li, h1, h2, h3, h4, span, button, label, small, dt, dd").forEach((el) => {
      if (!el.textContent.trim() || el.children.length > 0) return;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.opacity === "0") return;
      const fg = parse(cs.color);
      if (fg.length !== 3) return;
      const size = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const cr = ratio(fg, bgOf(el));
      const need = large ? 3 : 4.5;
      if (cr < need) {
        low.push({
          text: el.textContent.trim().slice(0, 40),
          cls: el.className && el.className.split ? el.className.split(" ")[0] : el.tagName,
          cr: Math.round(cr * 100) / 100,
          need,
          size,
        });
      }
    });

    // overlap between absolutely positioned headline elements and the hero kicker
    const overlaps = [];
    const els = Array.from(document.querySelectorAll("h1, h2, h3, .hero__kicker, .hero__cta, .section__eyebrow"));
    for (let i = 0; i < els.length; i++) {
      const a = els[i].getBoundingClientRect();
      for (let j = i + 1; j < els.length; j++) {
        const b = els[j].getBoundingClientRect();
        if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 4 && oy > 4) {
          overlaps.push(els[i].tagName + "." + els[i].className.split(" ")[0] + " × " + els[j].tagName + "." + els[j].className.split(" ")[0]);
        }
      }
    }

    // smallest tap targets among interactive elements
    const smallTaps = [];
    document.querySelectorAll("a, button, [role='button']").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.height < 40 || r.width < 40) {
        smallTaps.push(`${el.tagName}.${(el.className && el.className.split) ? el.className.split(" ")[0] : ""} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });

    // headings order
    const order = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((h) => Number(h.tagName[1]));
    let skips = [];
    for (let i = 1; i < order.length; i++) if (order[i] - order[i - 1] > 1) skips.push(order[i - 1] + "→" + order[i]);

    return { low, overlaps, smallTaps, skips, headingCount: order.length };
  });

  log(out.low.length === 0, `${theme} — text contrast ≥ WCAG AA`, out.low.slice(0, 6).map((l) => `"${l.text}" ${l.cr}:1 (need ${l.need}) ${l.cls}`).join(" | "));
  log(out.overlaps.length === 0, `${theme} — no overlapping headings/CTAs`, out.overlaps.join(" | "));
  log(out.skips.length === 0, `${theme} — heading levels no skips`, out.skips.join(",") + ` (${out.headingCount} headings)`);
  log(out.smallTaps.length === 0, `${theme} — all interactive targets ≥40px`, out.smallTaps.slice(0, 8).join(" | "));
}

for (const theme of ["light", "dark"]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  if (theme === "dark") {
    await page.click("#themeToggle");
    await new Promise((r) => setTimeout(r, 600));
  }
  await audit(page, theme);
  await page.close();
}

// mobile audit
{
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await audit(page, "375px light");
  const tap = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll("a, button").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.height < 44 && r.width > 40) bad.push(`${el.tagName}.${el.className.split ? el.className.split(" ")[0] : ""} ${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    return bad;
  });
  log(tap.length === 0, "375px — visible targets ≥44px tall", tap.slice(0, 8).join(" | "));
  await page.close();
}

// scrolled header (solid background) contrast
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate(() => window.scrollTo(0, 600));
  await new Promise((r) => setTimeout(r, 700));
  const solid = await page.evaluate(() => {
    const h = document.querySelector(".site-header");
    const solid = h.classList.contains("is-solid");
    const link = document.querySelector(".nav__link");
    return { solid, color: getComputedStyle(link).color, bg: getComputedStyle(h).backgroundColor };
  });
  log(solid.solid, "Header becomes solid on scroll", `${solid.bg}`);
  await audit(page, "light, header solid");
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n==== ${results.length - failed.length}/${results.length} audit checks passed ====`);
if (failed.length) process.exit(1);
